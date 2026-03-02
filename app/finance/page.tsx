'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';

interface AmexSummary {
  accountName: string;
  accountMask: string;
  statementStart: string;
  statementEnd: string;
  transactionCount: number;
  totalSpent: number;
  budget: number;
  remaining: number;
  percentUsed: number;
  status: 'OK' | 'WARNING' | 'OVER_BUDGET';
}

interface CategorySpending {
  category: string;
  icon: string;
  transactionCount: number;
  spent: number;
  monthlyBudget: number;
  remaining: number;
  percentUsed: number;
  status: string;
}

interface Transaction {
  id: number;
  date: string;
  name: string;
  merchantName: string | null;
  merchant_name?: string | null;
  amount: number;
  pending: boolean;
  category: string | null;
  categoryIcon: string | null;
  category_icon?: string | null;
}

interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
}

interface UncategorizedData {
  count: number;
  transactions: Transaction[];
}

export default function FinancePage() {
  const [summary, setSummary] = useState<AmexSummary | null>(null);
  const [categories, setCategories] = useState<CategorySpending[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [uncategorized, setUncategorized] = useState<UncategorizedData>({ count: 0, transactions: [] });
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [showUncategorized, setShowUncategorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statementData, budgetData, uncategorizedData, categoriesData] = await Promise.all([
          api.get('/api/finance/amex-statement'),
          api.get('/api/finance/amex-budget'),
          api.get('/api/finance/uncategorized'),
          api.get('/api/finance/categories'),
        ]);

        setSummary(statementData.summary);
        setTransactions(statementData.transactions.slice(0, 20));
        setCategories(budgetData.categories);
        setUncategorized(uncategorizedData);
        setAvailableCategories(categoriesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCategorize = async (transactionId: number, categoryId: number, createRule: boolean) => {
    try {
      await api.put(`/api/finance/transactions/${transactionId}/categorize`, {
        category_id: categoryId,
        create_rule: createRule
      });

      // Remove from uncategorized list
      setUncategorized(prev => ({
        count: prev.count - 1,
        transactions: prev.transactions.filter(t => t.id !== transactionId)
      }));

      // Refresh all data to update counts and summaries
      const [statementData, budgetData] = await Promise.all([
        api.get('/api/finance/amex-statement'),
        api.get('/api/finance/amex-budget'),
      ]);

      setSummary(statementData.summary);
      setTransactions(statementData.transactions.slice(0, 20));
      setCategories(budgetData.categories);
    } catch (err) {
      console.error('Error categorizing transaction:', err);
      alert('Failed to categorize transaction');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading Amex statement...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: {error || 'No data'}</p>
        </div>
      </div>
    );
  }

  const daysRemaining = Math.ceil(
    (new Date(summary.statementEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const statementStart = new Date(summary.statementStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const statementEnd = new Date(summary.statementEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">💳 Amex Statement</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {statementStart} – {statementEnd} • {daysRemaining} days remaining
        </p>
      </div>

      {/* Main Spending Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center mb-4">
            <div className="text-5xl font-bold mb-2">
              ${summary.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-2xl text-muted-foreground font-normal"> / ${summary.budget.toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              ${summary.remaining.toLocaleString()} remaining • {Math.round(summary.percentUsed)}% used
            </p>
          </div>
          <Progress 
            value={summary.percentUsed} 
            className="h-3"
          />
          <div className="mt-4 flex justify-between items-center">
            <Badge 
              variant={summary.status === 'OVER_BUDGET' ? 'destructive' : summary.status === 'WARNING' ? 'default' : 'secondary'}
              className={summary.status === 'WARNING' ? 'bg-orange-600' : summary.status === 'OK' ? 'bg-emerald-600' : ''}
            >
              {summary.status === 'OVER_BUDGET' ? '🚨 Over Budget' : summary.status === 'WARNING' ? '⚠️ Warning' : '✅ On Track'}
            </Badge>
            <span className="text-sm text-muted-foreground">{summary.transactionCount} transactions</span>
          </div>
        </CardContent>
      </Card>

      {/* Uncategorized Transactions */}
      {uncategorized.count > 0 && (
        <Card className="mb-6">
          <CardHeader 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => setShowUncategorized(!showUncategorized)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                ❓ Uncategorized Transactions
                <Badge variant="secondary">{uncategorized.count}</Badge>
              </CardTitle>
              <span className="text-xl">{showUncategorized ? '▼' : '▶'}</span>
            </div>
          </CardHeader>
          {showUncategorized && (
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {uncategorized.transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {txn.merchant_name || txn.merchantName || txn.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${txn.amount.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="px-3 py-1.5 text-sm border rounded-md bg-background"
                        onChange={(e) => {
                          const categoryId = parseInt(e.target.value);
                          if (categoryId) {
                            const createRule = window.confirm(
                              `Apply "${availableCategories.find(c => c.id === categoryId)?.name}" to all future transactions from this merchant?`
                            );
                            handleCategorize(txn.id, categoryId, createRule);
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Select category...</option>
                        {availableCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-sm">No categorized spending yet.</p>
            ) : (
              <div className="space-y-4">
                {categories.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">
                        {cat.icon} {cat.category}
                      </span>
                      <span className="text-muted-foreground">
                        ${cat.spent.toLocaleString()} • {cat.transactionCount} txns
                      </span>
                    </div>
                    <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(cat.spent / summary.totalSpent) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>📝 Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No transactions in this statement period.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {txn.merchantName || txn.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {txn.categoryIcon} {txn.category || 'Uncategorized'} • {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="font-semibold text-sm ml-2">
                      ${txn.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
