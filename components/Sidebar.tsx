'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Bot,
  MessageSquare,
  Clock,
  Bell,
  CheckSquare,
  DollarSign,
  AlertTriangle,
  Database,
  Brain,
  CalendarDays,
  Users,
  Video,
  Layers,
  Activity,
  Film,
  FolderOpen,
  Menu,
  X,
  Wallet,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Agents', href: '/', icon: Bot },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Memory', href: '/memory', icon: Brain },
  { name: 'Finance', href: '/finance', icon: Wallet },
  { name: 'Audio', href: '/audio', icon: Mic },
  { name: 'Cron Jobs', href: '/crons', icon: Clock },
  { name: 'Calendar', href: '/calendar', icon: CalendarDays },
  { name: 'Reminders', href: '/reminders', icon: Bell },
  { name: 'Content Calendar', href: '/content-calendar', icon: Video },
  { name: 'Video Pipeline', href: '/video-pipeline', icon: Film },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Sessions', href: '/sessions', icon: Layers },
  { name: 'Agent Files', href: '/files', icon: FolderOpen },
  { name: 'Claude Usage', href: '/usage', icon: Activity },
  { name: 'Token Usage', href: '/tokens', icon: DollarSign },
  { name: 'Errors', href: '/errors', icon: AlertTriangle },
  { name: 'Database', href: '/database', icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-card border border-border text-foreground"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          'flex h-full flex-col gap-4 border-r border-border bg-card py-4 transition-transform duration-300 md:translate-x-0',
          'fixed md:relative z-40 w-16',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="mb-4 flex items-center justify-center">
          <Bot className="h-8 w-8 text-primary" />
        </div>
        <nav className="flex flex-col gap-2 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                title={item.name}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}