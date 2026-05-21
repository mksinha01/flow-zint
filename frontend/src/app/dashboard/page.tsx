"use client";
import { useEffect, useState, useCallback } from "react";
import api, { workspacesApi } from "@/lib/api";
import { StatCard, Skeleton } from "@/components/ui";
import type { DashboardStats, DashboardCharts } from "@/types";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = { HOT: "#ef4444", WARM: "#f59e0b", COLD: "#3b82f6" };

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [sRes, cRes, wRes] = await Promise.all([
        api.get("/dashboard/stats").catch(() => ({ data: { data: { stats: null } } })),
        api.get("/dashboard/charts").catch(() => ({ data: { data: { charts: null } } })),
        workspacesApi.list().catch(() => ({ data: { data: { workspaces: [] } } })),
      ]);
      setStats(sRes.data.data?.stats || null);
      setCharts(cRes.data.data?.charts || null);
      setWorkspaces(wRes.data.data?.workspaces || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const switchWorkspace = (id: string) => {
    localStorage.setItem('workspace_id', id);
    window.location.reload();
  };

  const handleDeleteWorkspace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this workspace and all its data? This cannot be undone.')) return;
    
    try {
      await workspacesApi.delete(id);
      if (localStorage.getItem('workspace_id') === id) {
        localStorage.removeItem('workspace_id');
      }
      window.location.reload();
    } catch {
      alert('Failed to delete workspace. Only the owner can delete it.');
    }
  };

  const callVolumeData = charts
    ? Object.entries(charts.callVolume)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, v]) => ({
          date: date.slice(5),
          total: v.total,
          completed: v.completed,
        }))
    : [];

  const scoreData = charts
    ? Object.entries(charts.scoreDistribution).map(([range, count]) => ({ range, count }))
    : [];

  const pieData = charts
    ? [
        { name: "Hot 🔥", value: charts.classificationBreakdown.HOT, color: COLORS.HOT },
        { name: "Warm ☀️", value: charts.classificationBreakdown.WARM, color: COLORS.WARM },
        { name: "Cold ❄️", value: charts.classificationBreakdown.COLD, color: COLORS.COLD },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Your AI sales performance at a glance
          </p>
        </div>
        {stats?.activeAgentVersion && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.2)",
              color: "#4ade80",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Agent v{stats.activeAgentVersion} Active
          </div>
        )}
      </div>

      {/* Workspaces List Section */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Your Workspaces</h2>
        {loading ? (
          <div className="flex gap-4"><Skeleton className="h-28 w-64" /><Skeleton className="h-28 w-64" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((w) => {
              const isActive = typeof window !== 'undefined' && localStorage.getItem('workspace_id') === w.id;
              return (
                <div key={w.id} 
                     onClick={() => switchWorkspace(w.id)}
                     className={`cursor-pointer p-5 rounded-xl border transition-all ${isActive ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'}`}>
                   <div className="flex justify-between items-start mb-2">
                     <h3 className="font-bold text-slate-800 truncate pr-2">{w.name}</h3>
                     <div className="flex items-center gap-2">
                       {isActive && <span className="text-[10px] uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold shrink-0">Active</span>}
                       <button onClick={(e) => handleDeleteWorkspace(w.id, e)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0" title="Delete Workspace">
                         🗑️
                       </button>
                     </div>
                   </div>
                   <p className="text-sm text-slate-500 mb-4 truncate">{w.businessContext?.companyName || 'No business info yet'}</p>
                   <div className="flex gap-4 text-xs text-slate-500 font-medium">
                     <div className="flex items-center gap-1.5"><span className="text-base leading-none">👥</span> {w._count?.leads || 0} Leads</div>
                     <div className="flex items-center gap-1.5"><span className="text-base leading-none">📞</span> {w._count?.calls || 0} Calls</div>
                   </div>
                </div>
              );
            })}
            <div 
              onClick={() => window.location.href = '/dashboard/onboarding'}
              className="cursor-pointer p-5 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors bg-slate-50/50 min-h-[120px]">
              <span className="text-2xl mb-1 leading-none">+</span>
              <span className="font-semibold text-sm">Create Workspace</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Leads" value={stats?.totalLeads ?? 0} icon="👥" color="purple" subtitle="All time" />
          <StatCard title="Calls Today" value={stats?.callsToday ?? 0} icon="📞" color="blue" subtitle={`${stats?.callsThisWeek ?? 0} this week`} />
          <StatCard title="Avg Lead Score" value={stats?.avgLeadScore ?? 0} icon="⭐" color="amber" subtitle="Out of 100" />
          <StatCard title="Success Rate" value={`${stats?.successRate ?? 0}%`} icon="🎯" color="green" subtitle="Hot leads / calls" />
          <StatCard title="Hot Leads 🔥" value={stats?.hotLeads ?? 0} icon="🔥" color="red" />
          <StatCard title="Warm Leads ☀️" value={stats?.warmLeads ?? 0} icon="☀️" color="amber" />
          <StatCard title="Demos Booked" value={stats?.bookings ?? 0} icon="📅" color="blue" />
          <StatCard title="Cold Leads ❄️" value={stats?.coldLeads ?? 0} icon="❄️" color="purple" />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Call Volume Area Chart */}
        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Call Volume — Last 14 Days
          </h2>
          {loading ? (
            <Skeleton className="h-48" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={callVolumeData}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: "#6b6483", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b6483", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#16162a", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, color: "#f1f0ff" }}
                  cursor={{ stroke: "rgba(139,92,246,0.2)" }}
                />
                <Area type="monotone" dataKey="total" name="Total Calls" stroke="#8b5cf6" fill="url(#gradTotal)" strokeWidth={2} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#22c55e" fill="url(#gradComp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Lead Classification
          </h2>
          {loading ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#16162a", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, color: "#f1f0ff" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {pieData.map((e) => (
                  <div key={e.name} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
                    {e.name}: {e.value}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Score Distribution */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Lead Score Distribution
          </h2>
          {loading ? <Skeleton className="h-40" /> : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="range" tick={{ fill: "#6b6483", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b6483", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#16162a", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, color: "#f1f0ff" }} />
                <Bar dataKey="count" name="Leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Objections */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Top Objections Detected
          </h2>
          {loading ? <Skeleton className="h-40" /> : (
            <div className="space-y-2.5">
              {charts?.topObjections.length === 0 && (
                <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>No objections data yet</p>
              )}
              {charts?.topObjections.map((obj, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs truncate flex-1" style={{ color: "var(--text-secondary)" }}>
                      {obj.text}
                    </span>
                    <span className="text-xs font-bold ml-2" style={{ color: "#a78bfa" }}>
                      {obj.count}×
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(139,92,246,0.1)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(obj.count / (charts.topObjections[0]?.count || 1)) * 100}%`,
                        background: "linear-gradient(90deg, #8b5cf6, #6d28d9)",
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
