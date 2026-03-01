'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Zap, TrendingUp, Clock, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface PlanUsage {
  plan: string;
  org_name: string;
  usage: {
    five_hour: { utilization: number; resets_at: string } | null;
    seven_day: { utilization: number; resets_at: string } | null;
    seven_day_sonnet: { utilization: number; resets_at: string } | null;
    seven_day_opus: { utilization: number; resets_at: string } | null;
    seven_day_cowork: { utilization: number; resets_at: string } | null;
  };
  scraped_at: string;
  stale: boolean;
  ageMs: number;
}

function formatTimeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatResetTime(iso: string): string {
  const d = new Date(iso);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function formatAge(ms: number): string {
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  return `${Math.floor(ms / 3600000)}h ago`;
}

function hoursUntil(iso: string): number {
  return Math.max(0, (new Date(iso).getTime() - Date.now()) / 3600000);
}

// Calculate projection data for a usage bucket
function calcProjection(utilization: number, resetsAt: string) {
  const now = Date.now();
  const resetMs = new Date(resetsAt).getTime();
  const hoursLeft = Math.max(0, (resetMs - now) / 3600000);
  const totalWindowHours = 7 * 24; // 7-day window
  const hoursElapsed = totalWindowHours - hoursLeft;

  // Burn rate: % per hour based on current usage
  const burnRate = hoursElapsed > 0 ? utilization / hoursElapsed : 0;

  // Hours until 100% at current rate
  const pctRemaining = 100 - utilization;
  const hoursToLimit = burnRate > 0 ? pctRemaining / burnRate : Infinity;

  // Will we hit the limit before reset?
  const hitsLimit = hoursToLimit < hoursLeft;
  const projectedPctAtReset = Math.min(100, utilization + burnRate * hoursLeft);

  // Build projection curve (hourly points from now to reset)
  const points: { hour: number; label: string; current: number; projected: number; limit: number }[] = [];
  const stepHours = Math.max(1, Math.floor(hoursLeft / 24)); // ~24 data points
  for (let h = 0; h <= hoursLeft; h += stepHours) {
    const t = new Date(now + h * 3600000);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][t.getDay()];
    const timeStr = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const label = h === 0 ? 'Now' : `${dayName} ${timeStr}`;
    const projected = Math.min(100, utilization + burnRate * h);
    points.push({
      hour: h,
      label,
      current: h === 0 ? utilization : projected,
      projected,
      limit: 100,
    });
  }
  // Add final point at reset
  const resetT = new Date(resetMs);
  const resetDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][resetT.getDay()];
  const resetTime = resetT.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  points.push({
    hour: hoursLeft,
    label: `${resetDay} ${resetTime} (Reset)`,
    current: projectedPctAtReset,
    projected: projectedPctAtReset,
    limit: 100,
  });

  return {
    burnRate,
    hoursToLimit,
    hitsLimit,
    projectedPctAtReset,
    hoursLeft,
    hoursElapsed,
    points,
  };
}

function UsageBar({ pct, label, resetLabel, color }: { pct: number; label: string; resetLabel: string; color: string }) {
  const barColor = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-orange-500' : color;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground text-xs">{resetLabel}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <span className={`text-sm font-bold min-w-[3rem] text-right ${pct >= 80 ? 'text-red-500' : pct >= 50 ? 'text-orange-500' : 'text-foreground'}`}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

export default function UsagePage() {
  const [plan, setPlan] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage?type=plan');
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const refreshPlan = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const msg = data.error || 'Refresh failed';
        if (msg.includes('ECONNREFUSED') || msg.includes('18800') || msg.includes('browserType')) {
          setRefreshError('OpenClaw browser not running. Start it with: openclaw browser start');
        } else {
          setRefreshError(msg);
        }
      } else {
        if (data.plan) setPlan(data.plan);
        else await fetchUsage();
      }
    } catch (err: any) {
      setRefreshError(err.message || 'Network error');
    }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 60000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><p className="text-muted-foreground">Loading usage data...</p></div>;
  }

  // Calculate projections
  const weeklyAll = plan?.usage?.seven_day;
  const weeklyProjection = weeklyAll ? calcProjection(weeklyAll.utilization, weeklyAll.resets_at) : null;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Claude Usage</h1>
          {plan && (
            <p className="text-muted-foreground">
              {plan.plan} · {plan.org_name}
              {plan.stale ? ' · ⚠️ stale data' : ''}
              {plan.ageMs ? ` · updated ${formatAge(plan.ageMs)}` : ''}
            </p>
          )}
        </div>
        <button
          onClick={refreshPlan}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Refresh Error */}
      {refreshError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{refreshError}</span>
          </div>
        </div>
      )}

      {/* Plan Limits */}
      {plan && plan.usage ? (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Zap className="h-5 w-5 text-primary" />
              {plan.plan} Plan Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {plan.usage.five_hour && (
              <UsageBar pct={plan.usage.five_hour.utilization} label="⏱ Current Session"
                resetLabel={`Resets in ${formatTimeUntil(plan.usage.five_hour.resets_at)}`} color="bg-blue-500" />
            )}
            {plan.usage.seven_day && (
              <UsageBar pct={plan.usage.seven_day.utilization} label="📅 Weekly — All Models"
                resetLabel={`Resets ${formatResetTime(plan.usage.seven_day.resets_at)}`} color="bg-blue-500" />
            )}
            {plan.usage.seven_day_sonnet && (
              <UsageBar pct={plan.usage.seven_day_sonnet.utilization} label="🔵 Weekly — Sonnet"
                resetLabel={`Resets ${formatResetTime(plan.usage.seven_day_sonnet.resets_at)}`} color="bg-sky-500" />
            )}
            {plan.usage.seven_day_opus && (
              <UsageBar pct={plan.usage.seven_day_opus.utilization} label="🟣 Weekly — Opus"
                resetLabel={`Resets ${formatResetTime(plan.usage.seven_day_opus.resets_at)}`} color="bg-purple-500" />
            )}
            {plan.usage.seven_day_cowork && (
              <UsageBar pct={plan.usage.seven_day_cowork.utilization} label="🤝 Weekly — Cowork"
                resetLabel={`Resets ${formatResetTime(plan.usage.seven_day_cowork.resets_at)}`} color="bg-teal-500" />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="p-6 text-center text-muted-foreground">
            <p className="mb-2">No plan usage data available yet.</p>
            <p className="text-sm">Click Refresh to scrape current usage from claude.ai (requires OpenClaw browser running).</p>
          </CardContent>
        </Card>
      )}

      {/* Projection Analysis */}
      {weeklyProjection && weeklyAll && (
        <>
          {/* Status Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Activity className="h-4 w-4" /> Burn Rate
                </div>
                <div className="text-3xl font-bold">{weeklyProjection.burnRate.toFixed(2)}%</div>
                <div className="text-sm text-muted-foreground mt-1">per hour</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Clock className="h-4 w-4" /> Time to Limit
                </div>
                <div className="text-3xl font-bold">
                  {weeklyProjection.hoursToLimit === Infinity ? '∞' :
                    weeklyProjection.hoursToLimit < 1 ? `${Math.round(weeklyProjection.hoursToLimit * 60)}m` :
                    `${Math.round(weeklyProjection.hoursToLimit)}h`}
                </div>
                <div className="text-sm text-muted-foreground mt-1">at current rate</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="h-4 w-4" /> Projected at Reset
                </div>
                <div className={`text-3xl font-bold ${weeklyProjection.projectedPctAtReset >= 80 ? 'text-red-500' : weeklyProjection.projectedPctAtReset >= 50 ? 'text-orange-500' : 'text-foreground'}`}>
                  {Math.round(weeklyProjection.projectedPctAtReset)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  resets in {formatTimeUntil(weeklyAll.resets_at)}
                </div>
              </CardContent>
            </Card>

            <Card className={weeklyProjection.hitsLimit ? 'border-red-500/50' : 'border-green-500/50'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  {weeklyProjection.hitsLimit ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                  Status
                </div>
                <div className={`text-2xl font-bold ${weeklyProjection.hitsLimit ? 'text-red-500' : 'text-green-500'}`}>
                  {weeklyProjection.hitsLimit ? '⚠️ Will Hit Limit' : '✅ On Track'}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {weeklyProjection.hitsLimit
                    ? `~${Math.round(weeklyProjection.hoursToLimit)}h until throttled`
                    : `${Math.round(100 - weeklyProjection.projectedPctAtReset)}% headroom at reset`}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projection Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Weekly Usage Projection — All Models
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={weeklyProjection.points} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={weeklyProjection.hitsLimit ? '#ef4444' : '#3b82f6'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={weeklyProjection.hitsLimit ? '#ef4444' : '#3b82f6'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" stroke="var(--color-foreground)" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis stroke="var(--color-foreground)" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-foreground)' }}
                    formatter={(value: any) => [`${Math.round(value)}%`, 'Usage']}
                  />
                  <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Limit', position: 'right', fill: '#ef4444', fontSize: 12 }} />
                  <ReferenceLine y={80} stroke="#f97316" strokeDasharray="3 3" label={{ value: '80%', position: 'right', fill: '#f97316', fontSize: 11 }} />
                  <Area type="monotone" dataKey="projected" stroke={weeklyProjection.hitsLimit ? '#ef4444' : '#3b82f6'}
                    fill="url(#projGradient)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📊 Usage Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/30">
                  <Activity className="h-5 w-5 mt-0.5 text-blue-500 shrink-0" />
                  <div>
                    <p className="font-medium">Burn Rate</p>
                    <p className="text-muted-foreground">
                      You&apos;re consuming <span className="font-bold text-foreground">{weeklyProjection.burnRate.toFixed(2)}% per hour</span> ({(weeklyProjection.burnRate * 24).toFixed(1)}% per day).
                      At this rate you&apos;ll use <span className="font-bold text-foreground">{Math.round(weeklyProjection.projectedPctAtReset)}%</span> of your weekly allocation before it resets.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/30">
                  <Clock className="h-5 w-5 mt-0.5 text-purple-500 shrink-0" />
                  <div>
                    <p className="font-medium">Reset Window</p>
                    <p className="text-muted-foreground">
                      Weekly limit resets <span className="font-bold text-foreground">{formatResetTime(weeklyAll.resets_at)}</span> ({formatTimeUntil(weeklyAll.resets_at)} from now).
                      You&apos;ve used {Math.round(weeklyProjection.hoursElapsed)}h of the 168h window so far.
                    </p>
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-3 rounded-lg ${weeklyProjection.hitsLimit ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                  {weeklyProjection.hitsLimit ? (
                    <>
                      <AlertTriangle className="h-5 w-5 mt-0.5 text-red-500 shrink-0" />
                      <div>
                        <p className="font-medium text-red-500">Throttle Warning</p>
                        <p className="text-muted-foreground">
                          At current pace, you&apos;ll hit the weekly limit in approximately <span className="font-bold text-red-500">{Math.round(weeklyProjection.hoursToLimit)} hours</span>.
                          Consider reducing usage or waiting for the reset.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                      <div>
                        <p className="font-medium text-green-500">Comfortable Headroom</p>
                        <p className="text-muted-foreground">
                          You have <span className="font-bold text-green-500">{Math.round(100 - weeklyProjection.projectedPctAtReset)}% headroom</span> at reset.
                          {weeklyProjection.burnRate > 0 && ` You could sustain ${(weeklyProjection.burnRate * 1.5).toFixed(2)}%/hr and still stay under the limit.`}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
