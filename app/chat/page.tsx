'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Square, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

type ConnStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface GatewayMsg {
  type: 'req' | 'res' | 'event';
  id?: string;
  method?: string;
  ok?: boolean;
  payload?: Record<string, unknown>;
  event?: string;
}

let msgCounter = 100;
function nextId() {
  return String(++msgCounter);
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ConnStatus>('disconnected');
  const [generating, setGenerating] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<string>('');
  const gatewayUrlRef = useRef<string>('ws://localhost:18789');
  const connectedRef = useRef(false);
  // Pending message resolvers keyed by req id
  const pendingRef = useRef<Map<string, (payload: Record<string, unknown>) => void>>(new Map());

  // Fetch gateway token and URL from server
  useEffect(() => {
    api.get('/api/gateway-token')
      
      .then((d) => {
        tokenRef.current = d.token || '';
        gatewayUrlRef.current = (d.gatewayUrl || 'ws://localhost:18789').replace('http://', 'ws://').replace('https://', 'wss://');
      })
      .catch((err) => {
        console.error('Failed to fetch gateway config:', err);
      });
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const send = useCallback((obj: GatewayMsg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }, []);

  const sendReq = useCallback(
    (method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
      return new Promise((resolve) => {
        const id = nextId();
        pendingRef.current.set(id, resolve);
        send({ type: 'req', id, method, params } as GatewayMsg);
      });
    },
    [send]
  );

  const loadHistory = useCallback(async () => {
    try {
      const payload = await sendReq('chat.history', { agentId: 'tony' });
      const history = (payload?.history as Array<{ role: string; content: string; id?: string }>) || [];
      if (history.length > 0) {
        setMessages(
          history.map((m, i) => ({
            id: m.id || `hist-${i}`,
            role: m.role === 'user' ? 'user' : 'assistant',
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          }))
        );
      }
    } catch {
      // history might not be available
    }
  }, [sendReq]);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setStatus('connecting');
    connectedRef.current = false;

    const ws = new WebSocket(gatewayUrlRef.current);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send connect handshake
      ws.send(
        JSON.stringify({
          type: 'req',
          id: '1',
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: 'tony-dashboard',
              version: '1.0.0',
              platform: 'web',
              mode: 'operator',
            },
            role: 'operator',
            scopes: ['operator.read', 'operator.write'],
            caps: [],
            commands: [],
            permissions: {},
            auth: { token: tokenRef.current },
          },
        })
      );
    };

    ws.onmessage = (evt) => {
      let msg: GatewayMsg;
      try {
        msg = JSON.parse(evt.data as string);
      } catch {
        return;
      }

      // Handle response to pending requests
      if (msg.type === 'res' && msg.id) {
        if (msg.id === '1') {
          // connect response
          if (msg.ok) {
            connectedRef.current = true;
            setStatus('connected');
            loadHistory();
          } else {
            setStatus('error');
          }
          return;
        }
        const resolver = pendingRef.current.get(msg.id);
        if (resolver) {
          pendingRef.current.delete(msg.id);
          resolver(msg.payload || {});
        }
        return;
      }

      // Handle streaming chat events
      if (msg.type === 'event' && msg.event === 'chat') {
        const p = msg.payload as Record<string, unknown> | undefined;
        if (!p) return;

        const evtType = p.type as string;

        if (evtType === 'delta' || evtType === 'text') {
          const delta = (p.delta as string) || (p.text as string) || (p.content as string) || '';
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && last.streaming) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + delta },
              ];
            }
            return [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: delta,
                streaming: true,
              },
            ];
          });
        } else if (evtType === 'done' || evtType === 'end' || evtType === 'complete') {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant') {
              return [...prev.slice(0, -1), { ...last, streaming: false }];
            }
            return prev;
          });
          setGenerating(false);
        } else if (evtType === 'error') {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && last.streaming) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + '\n\n[Error occurred]', streaming: false },
              ];
            }
            return prev;
          });
          setGenerating(false);
        } else if (evtType === 'aborted') {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && last.streaming) {
              return [...prev.slice(0, -1), { ...last, streaming: false }];
            }
            return prev;
          });
          setGenerating(false);
        }
        return;
      }

      // Some gateways send chat events as top-level with a runId
      if (msg.type === 'event' && (msg.event === 'message' || msg.event === 'run')) {
        const p = msg.payload as Record<string, unknown> | undefined;
        if (p && p.content) {
          const content = typeof p.content === 'string' ? p.content : JSON.stringify(p.content);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && last.streaming) {
              return [...prev.slice(0, -1), { ...last, content, streaming: false }];
            }
            return [...prev, { id: `msg-${Date.now()}`, role: 'assistant', content, streaming: false }];
          });
          setGenerating(false);
        }
      }
    };

    ws.onerror = () => {
      setStatus('error');
      setGenerating(false);
    };

    ws.onclose = () => {
      setStatus('disconnected');
      connectedRef.current = false;
      setGenerating(false);
    };
  }, [loadHistory]);

  useEffect(() => {
    // Wait a tick for token to load, then connect
    const t = setTimeout(connect, 200);
    return () => {
      clearTimeout(t);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || generating || status !== 'connected') return;

    setInput('');
    setGenerating(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    const idempotencyKey = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const id = nextId();
      pendingRef.current.set(id, (_payload) => {
        // Ack received — streaming will come via events
        // If no events arrive within a timeout, mark done
      });
      send({
        type: 'req',
        id,
        method: 'chat.send',
        params: { 
          message: text, 
          idempotencyKey,
          agentId: 'tony'
        },
      } as GatewayMsg);

      // Fallback: if no streaming events come in 30s, stop spinner
      setTimeout(() => {
        setGenerating((g) => {
          if (g) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.streaming) {
                return [...prev.slice(0, -1), { ...last, streaming: false }];
              }
              return prev;
            });
          }
          return false;
        });
      }, 30000);
    } catch (err) {
      console.error('Error sending message:', err);
      setGenerating(false);
    }
  };

  const abortGeneration = () => {
    try {
      const id = nextId();
      send({ type: 'req', id, method: 'chat.abort', params: { agentId: 'tony' } } as GatewayMsg);
    } catch {}
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.streaming) {
        return [...prev.slice(0, -1), { ...last, streaming: false }];
      }
      return prev;
    });
    setGenerating(false);
  };

  const statusColor = {
    disconnected: 'text-muted-foreground',
    connecting: 'text-yellow-400',
    connected: 'text-green-400',
    error: 'text-destructive',
  }[status];

  const statusLabel = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Connected',
    error: 'Connection error',
  }[status];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border bg-card px-3 md:px-6 py-3 gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">Chat with Tony</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Direct conversation with the main agent</p>
        </div>
        <div className={`flex items-center gap-2 text-sm ${statusColor}`}>
          {status === 'connected' ? (
            <Wifi className="h-4 w-4" />
          ) : status === 'connecting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          {statusLabel}
          {status !== 'connected' && status !== 'connecting' && (
            <button
              className="ml-2 rounded px-2 py-0.5 text-xs bg-secondary hover:bg-accent transition-colors"
              onClick={connect}
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 md:px-4 py-4 md:py-6 space-y-3 md:space-y-4">
        {messages.length === 0 && status === 'connected' && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm md:text-base text-muted-foreground">Say something to Tony...</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl px-3 md:px-4 py-2 md:py-3 text-sm shadow ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-card border border-border text-foreground rounded-bl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  {msg.streaming && (
                    <span className="inline-block h-4 w-1 animate-pulse bg-primary align-middle ml-0.5" />
                  )}
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-4">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            rows={2}
            placeholder={
              status === 'connected'
                ? 'Type a message... (Enter to send, Shift+Enter for newline)'
                : status === 'connecting'
                ? 'Connecting...'
                : 'Not connected'
            }
            value={input}
            disabled={status !== 'connected' || generating}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          {generating ? (
            <Button
              variant="destructive"
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
              onClick={abortGeneration}
              title="Stop generation"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
              onClick={sendMessage}
              disabled={status !== 'connected' || !input.trim()}
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
