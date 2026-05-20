"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        api.get("/api/dashboard/stats"),
        api.get("/api/dashboard/charts"),
      ]);
      setStats(sRes.data.data.stats);
      setCharts(cRes.data.data.charts);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

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
