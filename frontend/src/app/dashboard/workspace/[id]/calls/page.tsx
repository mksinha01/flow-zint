"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import type { Call } from "@/types";
import {
  Phone, Play, Download, Share2, CheckCircle, AlertTriangle, Clock,
  Sparkles, ListChecks, MessageSquare, ChevronLeft, ChevronRight,
  Flame, Sun, Snowflake, Smile, Meh, Frown, Loader2, Search, Filter,
} from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className ?? ""}`} style={{ minHeight: 20 }} />;
}

function ScoreRing({ score, size = 28 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#4f46e5" : score >= 45 ? "#f59e0b" : "#dc2626";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - dash} />
      </svg>
    </div>
  );
}

function ClassBadge({ cls }: { cls: "HOT" | "WARM" | "COLD" }) {
  if (cls === "HOT") return <span className="badge-hot text-[10px]"><Flame className="w-2.5 h-2.5" />HOT</span>;
  if (cls === "WARM") return <span className="badge-warm text-[10px]"><Sun className="w-2.5 h-2.5" />WARM</span>;
  return <span className="badge-cold text-[10px]"><Snowflake className="w-2.5 h-2.5" />COLD</span>;
}

function SentimentIcon({ s }: { s: string }) {
  if (s === "POSITIVE") return <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><Smile className="w-3.5 h-3.5" />Positive</span>;
  if (s === "NEGATIVE") return <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><Frown className="w-3.5 h-3.5" />Negative</span>;
  return <span className="flex items-center gap-1 text-xs text-[#777587] font-medium"><Meh className="w-3.5 h-3.5" />Neutral</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    COMPLETED: "bg-green-50 text-green-700", FAILED: "bg-red-50 text-red-600",
    IN_PROGRESS: "bg-amber-50 text-amber-600", QUEUED: "bg-slate-100 text-slate-600",
    VOICEMAIL: "bg-indigo-50 text-indigo-600",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status] ?? "bg-slate-100 text-slate-600"}`}>{status.replace(/_/g, " ")}</span>;
}

const formatDuration = (s?: number) => {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

export default function WorkspaceCallsPage() {
  const params = useParams();
  const workspaceId = params?.id as string;

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) q.set("status", status);
      const { data } = await api.get(`/calls?${q}`);
      setCalls(data.data.calls);
      setTotal(data.meta?.total ?? 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, status]);

  useEffect(() => { if (workspaceId) load(); }, [load, workspaceId]);

  useEffect(() => {
    if (!selectedCall && calls.length > 0) setSelectedCall(calls[0]);
  }, [calls, selectedCall]);

  const sa = selectedCall?.analysis;

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e]">Calls & Recordings</h1>
          <p className="text-sm text-[#777587] mt-0.5">Review AI-analyzed conversations and extract insights.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#777587] absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input pl-9 py-2 w-48 text-sm" placeholder="Search transcripts..." />
          </div>
          <select className="input py-2 w-40 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {["QUEUED", "IN_PROGRESS", "COMPLETED", "FAILED", "VOICEMAIL"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Call List */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#777587]">Recent Calls</span>
            <span className="text-xs text-[#777587]">{total} total</span>
          </div>

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : calls.length === 0 ? (
            <div className="card p-8 text-center">
              <Phone className="w-8 h-8 text-[#777587] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#191c1e]">No calls yet</p>
              <p className="text-xs text-[#777587]">Dispatch calls from the Leads page</p>
            </div>
          ) : calls.map((call) => {
            const isSelected = selectedCall?.id === call.id;
            const score = call.analysis?.leadScore;
            return (
              <div
                key={call.id}
                onClick={() => setSelectedCall(call)}
                className={`card p-4 cursor-pointer relative overflow-hidden transition-all ${
                  isSelected ? "border-indigo-300 shadow-[0_2px_12px_rgba(79,70,229,0.12)]" : "hover:border-slate-300"
                }`}
              >
                {isSelected && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 rounded-r" />}
                <div className="flex justify-between items-start mb-2">
                  <div className="pl-2">
                    <h4 className="text-sm font-semibold text-[#191c1e]">{call.lead?.name || "Unknown"}</h4>
                    <p className="text-xs text-[#777587] mt-0.5">{call.lead?.company || "—"}</p>
                  </div>
                  <span className="text-xs font-mono text-[#777587]">{formatDuration(call.duration)}</span>
                </div>
                <div className="flex items-center justify-between pl-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#777587]">
                    <Clock className="w-3 h-3" />
                    {new Date(call.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    {score != null && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-indigo-600">{score}/100</span>
                        <ScoreRing score={score} size={22} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {total > 20 && (
            <div className="flex gap-2 pt-1">
              <button className="btn-secondary py-1.5 px-3 text-xs flex-1" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button className="btn-secondary py-1.5 px-3 text-xs flex-1" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Analysis */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {!selectedCall ? (
            <div className="card p-16 text-center">
              <Phone className="w-10 h-10 text-[#777587] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#464555]">Select a call to view analysis</p>
            </div>
          ) : (
            <>
              {/* Audio player card */}
              <div className="card p-5 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-50 rounded-full blur-2xl pointer-events-none" />
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[#191c1e]">{selectedCall.lead?.name || "Unknown Lead"}</h3>
                      <StatusBadge status={selectedCall.status} />
                    </div>
                    <p className="text-xs text-[#777587]">
                      {new Date(selectedCall.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })} • Duration: {formatDuration(selectedCall.duration)}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {selectedCall.recordingUrl && (
                      <button className="p-2 rounded-lg border border-slate-200 text-[#777587] hover:bg-slate-50 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button className="p-2 rounded-lg border border-slate-200 text-[#777587] hover:bg-slate-50 transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="bg-slate-50 rounded-xl p-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <button className="w-11 h-11 shrink-0 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-sm">
                      <Play className="w-5 h-5 ml-0.5" />
                    </button>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex justify-between text-xs font-mono text-[#777587]">
                        <span>0:00</span>
                        <span>{formatDuration(selectedCall.duration)}</span>
                      </div>
                      <div className="relative h-2 bg-slate-200 rounded-full cursor-pointer">
                        <div className="absolute top-0 left-0 h-full w-0 bg-indigo-600 rounded-full" />
                        <div className="absolute top-0 left-[15%] h-full w-0.5 bg-indigo-400 rounded-full" title="Key moment" />
                        <div className="absolute top-0 left-[45%] h-full w-0.5 bg-amber-400 rounded-full" title="Objection" />
                        <div className="absolute top-0 left-[75%] h-full w-0.5 bg-green-500 rounded-full" title="Buying signal" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI analysis grid */}
              {sa ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* AI Intelligence */}
                  <div className="card overflow-hidden flex flex-col">
                    <div className="px-5 py-3 bg-indigo-50 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> AI Intelligence
                      </h4>
                      <span className="text-[10px] text-[#777587]">Sentiment: </span>
                      <SentimentIcon s={sa.sentiment} />
                    </div>
                    <div className="p-5 flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        {sa.classification && <ClassBadge cls={sa.classification} />}
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#464555]">
                          Score: <span className="text-indigo-600 font-bold">{sa.leadScore}/100</span>
                        </div>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-[#191c1e] mb-1.5">Executive Summary</h5>
                        <p className="text-sm text-[#464555] leading-relaxed">{sa.summary}</p>
                      </div>
                      <div className="border-t border-slate-100 pt-3">
                        <h5 className="text-xs font-bold text-[#191c1e] mb-2">Key Signals</h5>
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-[#464555]">
                              <strong className="text-[#191c1e]">Intent:</strong> {sa.buyingIntent ? "Buying signals detected" : "No strong buying signals"}
                            </span>
                          </div>
                          {sa.objections.length > 0 && (
                            <div className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <span className="text-[#464555]">
                                <strong className="text-[#191c1e]">{sa.objections.length} Objection{sa.objections.length > 1 ? "s" : ""}:</strong>{" "}
                                {sa.objections[0]?.text}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="flex flex-col gap-5">
                    {/* Intent reasoning */}
                    <div className="card p-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#777587] flex items-center gap-1.5 mb-3">
                        <ListChecks className="w-3.5 h-3.5" /> Intent Reasoning
                      </h4>
                      <p className="text-sm text-[#464555] leading-relaxed">{sa.intentReasoning}</p>
                    </div>

                    {/* Transcript */}
                    {selectedCall.transcript && (
                      <div className="card overflow-hidden flex-1">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#777587] flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" /> Transcript Excerpt
                          </h4>
                          <button className="text-indigo-600 text-xs font-semibold hover:underline">View Full</button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-48 text-xs text-[#464555] leading-relaxed whitespace-pre-wrap font-mono">
                          {selectedCall.transcript.slice(0, 600)}...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card p-8 text-center text-[#777587]">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-[#464555]">No AI analysis available</p>
                  <p className="text-xs mt-1">Analysis is generated after call completion</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
