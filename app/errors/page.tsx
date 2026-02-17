'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LogEntry {
  timestamp: string;
  level: string;
  subsystem: string;
  message: string;
  file?: string;
}

export default function ErrorsPage() {
  const [errors, setErrors] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchErrors = async () => {
    try {
      const response = await fetch('/api/errors?limit=50');
      if (response.ok) {
        const data = await response.json();
        setErrors(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching errors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
    const interval = setInterval(fetchErrors, 30000);
    return () => clearInterval(interval);
  }, []);

  const getLevelVariant = (level: string) => {
    switch (level.toUpperCase()) {
      case 'FATAL':
      case 'ERROR':
        return 'destructive';
      case 'WARN':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading errors...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Errors & Issues</h1>
        <p className="text-muted-foreground">
          Recent warnings and errors from gateway logs
        </p>
      </div>

      {errors.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center gap-2">
            <AlertTriangle className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No errors found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {errors.map((error, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getLevelVariant(error.level)}>
                        {error.level}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {error.subsystem}
                      </span>
                      {error.file && (
                        <span className="text-xs text-muted-foreground">
                          {error.file}
                        </span>
                      )}
                    </div>
                    <CardTitle className="mt-2 text-base font-mono">
                      {error.message}
                    </CardTitle>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(error.timestamp), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
