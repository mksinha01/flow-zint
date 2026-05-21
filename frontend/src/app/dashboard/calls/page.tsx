"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { StatusBadge, LeadBadge, SentimentBadge, EmptyState, Skeleton } from "@/components/ui";
import type { Call } from "@/types";

export default function CallsPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) params.set("status", status);
      const { data } = await api.get(`/calls?${params}`);
      setCalls(data.data.calls);
      setTotal(data.meta?.total ?? 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const formatDuration = (s?: number) => {
    if (!s) return "—";
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Calls</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{total} total calls</p>
        </div>
        <select className="input-dark w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {["QUEUED", "IN_PROGRESS", "COMPLETED", "FAILED", "VOICEMAIL"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : calls.length === 0 ? (
          <EmptyState
            icon="📞"
            title="No calls yet"
            description="Go to Leads and dispatch your first call"
            action={<button className="btn-primary" onClick={() => router.push("/dashboard/leads")}>View Leads</button>}
          />
        ) : (
          <table className="table-dark">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Status</th>
                <th>Agent Version</th>
                <th>Duration</th>
                <th>Classification</th>
                <th>Score</th>
                <th>Sentiment</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr key={call.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/calls/${call.id}`)}>
                  <td>
                    <div className="font-medium" style={{ color: "var(--text-primary)" }}>
                      {call.lead?.name}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{call.lead?.company}</div>
                  </td>
                  <td><StatusBadge status={call.status} /></td>
                  <td>
                    {call.agentConfig ? (
                      <span className="text-xs font-medium" style={{ color: "#a78bfa" }}>v{call.agentConfig.version}</span>
                    ) : "—"}
                  </td>
                  <td className="font-mono text-xs">{formatDuration(call.duration)}</td>
                  <td>
                    {call.analysis ? <LeadBadge classification={call.analysis.classification} /> : "—"}
                  </td>
                  <td>
                    {call.analysis ? (
                      <span
                        className="font-bold text-sm"
                        style={{ color: call.analysis.leadScore >= 70 ? "#ef4444" : call.analysis.leadScore >= 45 ? "#f59e0b" : "#3b82f6" }}
                      >
                        {call.analysis.leadScore}
                      </span>
                    ) : "—"}
                  </td>
                  <td>
                    {call.analysis ? <SentimentBadge sentiment={call.analysis.sentiment} /> : "—"}
                  </td>
                  <td className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(call.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <div className="flex gap-2">
            <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</button>
            <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
