'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';

interface TableSchema {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

export default function DatabasePage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/db/tables');
      const result = await response.json();
      if (response.ok && Array.isArray(result)) {
        setTables(result);
        setError(null);
      } else {
        setError(result.error || 'Failed to load tables');
        setTables([]);
      }
    } catch (err) {
      setError('Cannot connect to database API');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (table: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setSchema(result.schema || []);
        setData(result.data || []);
        setSelectedTable(table);
      }
    } catch (err) {
      console.error('Error fetching table data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  if (loading && tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading database...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Database Explorer</h1>
        <p className="text-muted-foreground">Browse PostgreSQL tables (read-only)</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Tables</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : tables.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tables found</p>
            ) : (
              <div className="space-y-1">
                {tables.map((table) => (
                  <Button
                    key={table}
                    variant={selectedTable === table ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => fetchTableData(table)}
                  >
                    <Database className="mr-2 h-4 w-4" />
                    {table}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {!selectedTable ? (
            <Card>
              <CardContent className="flex h-96 items-center justify-center">
                <p className="text-muted-foreground">Select a table to view its data</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Schema: {selectedTable}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="p-2 text-left">Column</th>
                          <th className="p-2 text-left">Type</th>
                          <th className="p-2 text-left">Nullable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schema.map((col) => (
                          <tr key={col.column_name} className="border-b border-border/50">
                            <td className="p-2 font-mono">{col.column_name}</td>
                            <td className="p-2 text-muted-foreground">{col.data_type}</td>
                            <td className="p-2 text-muted-foreground">{col.is_nullable}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data ({data.length} rows)</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.length === 0 ? (
                    <p className="text-muted-foreground">No data found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            {Object.keys(data[0]).map((key) => (
                              <th key={key} className="p-2 text-left font-mono">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.map((row, idx) => (
                            <tr key={idx} className="border-b border-border/50">
                              {Object.values(row).map((val, i) => (
                                <td key={i} className="p-2">
                                  {String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
