'use client';

import { useState, useEffect } from 'react';
import { Upload, FileAudio, Clock, Languages, Hash } from 'lucide-react';

interface ExtractedItems {
  tasks: string[];
  ideas: string[];
  goals: string[];
  plans: string[];
  memories: string[];
}

interface Transcript {
  id: number;
  filename: string;
  timestamp: string;
  transcript: string;
  language: string;
  duration: number;
  segments: number;
  extracted: ExtractedItems;
}

export default function AudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [currentExtracted, setCurrentExtracted] = useState<ExtractedItems | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    try {
      const res = await fetch('/api/audio/transcripts');
      const data = await res.json();
      setTranscripts(data.transcripts || []);
    } catch (err: any) {
      console.error('Failed to load transcripts:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setCurrentTranscript('');
    setCurrentExtracted(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setCurrentTranscript(data.transcript);
      setCurrentExtracted(data.extracted);
      await loadTranscripts();
      setFile(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const ItemSection = ({ title, items }: { title: string; items: string[] }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h4>
        <ul className="list-disc list-inside space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm">{item}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Audio Transcription</h1>
        <p className="text-muted-foreground">Upload audio files to transcribe and extract tasks, ideas, goals, plans, and memories.</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload Audio</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".m4a,.mp3,.wav,.ogg,.webm"
              onChange={handleFileChange}
              className="flex-1 text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              disabled={uploading}
            />
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full" />
                  Transcribing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded p-3">
              {error}
            </div>
          )}
        </div>
      </div>

      {currentTranscript && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Transcript</h2>
          <div className="bg-muted/50 rounded p-4 mb-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentTranscript}</p>
          </div>
          {currentExtracted && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Extracted Items</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ItemSection title="Tasks" items={currentExtracted.tasks} />
                <ItemSection title="Ideas" items={currentExtracted.ideas} />
                <ItemSection title="Goals" items={currentExtracted.goals} />
                <ItemSection title="Plans" items={currentExtracted.plans} />
                <ItemSection title="Memories" items={currentExtracted.memories} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Past Transcripts</h2>
        {transcripts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transcripts yet.</p>
        ) : (
          <div className="space-y-4">
            {transcripts.map((t) => (
              <div key={t.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileAudio className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t.filename}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(t.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.round(t.duration)}s
                  </div>
                  <div className="flex items-center gap-1">
                    <Languages className="h-3 w-3" />
                    {t.language}
                  </div>
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {t.segments} segments
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mb-3 line-clamp-2">{t.transcript}</div>
                {t.extracted && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {t.extracted.tasks.length > 0 && (
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded">
                        {t.extracted.tasks.length} tasks
                      </span>
                    )}
                    {t.extracted.ideas.length > 0 && (
                      <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded">
                        {t.extracted.ideas.length} ideas
                      </span>
                    )}
                    {t.extracted.goals.length > 0 && (
                      <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded">
                        {t.extracted.goals.length} goals
                      </span>
                    )}
                    {t.extracted.plans.length > 0 && (
                      <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded">
                        {t.extracted.plans.length} goals
                      </span>
                    )}
                    {t.extracted.memories.length > 0 && (
                      <span className="px-2 py-1 bg-pink-500/10 text-pink-400 rounded">
                        {t.extracted.memories.length} memories
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}