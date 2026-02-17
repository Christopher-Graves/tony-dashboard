'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  Clock,
  Bell,
  CheckSquare,
  DollarSign,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Agents', href: '/', icon: Bot },
  { name: 'Cron Jobs', href: '/crons', icon: Clock },
  { name: 'Reminders', href: '/reminders', icon: Bell },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Token Usage', href: '/tokens', icon: DollarSign },
  { name: 'Errors', href: '/errors', icon: AlertTriangle },
  { name: 'Database', href: '/database', icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-16 flex-col items-center gap-4 border-r border-border bg-card py-4">
      <div className="mb-4">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <nav className="flex flex-col gap-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
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
            >
              <item.icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
