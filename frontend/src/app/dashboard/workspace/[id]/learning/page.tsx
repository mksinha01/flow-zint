"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import type { LearningInsight, AgentConfig } from "@/types";
import {
  Brain, Zap, Phone, Search, TrendingUp, CheckCircle, Loader2,
  AlertTriangle, Clock, DollarSign, Target, MessageSquare, Users, MoreHorizontal,
} from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className ?? ""}`} style={{ minHeight: 20 }} />;
}

const insightConfig: Record<string, { icon: React.ReactNode; bg: string; border: string; textColor: string }> = {
  OBJECTION_UNHANDLED: { icon: <AlertTriangle className="w-3.5 h-3.5" />, bg: "bg-red-50", border: "border-red-200", textColor: "text-red-600" },
  WRONG_TONE: { icon: <MessageSquare className="w-3.5 h-3.5" />, bg: "bg-amber-50", border: "border-amber-200", textColor: "text-amber-600" },
  SCRIPT_TOO_LONG: { icon: <MoreHorizontal className="w-3.5 h-3.5" />, bg: "bg-amber-50", border: "border-amber-200", textColor: "text-amber-600" },
  ICP_MISMATCH: { icon: <Target className="w-3.5 h-3.5" />, bg: "bg-red-50", border: "border-red-200", textColor: "text-red-600" },
  LOW_ENGAGEMENT: { icon: <Users className="w-3.5 h-3.5" />, bg: "bg-indigo-50", border: "border-indigo-200", textColor: "text-indigo-600" },
  TIMING_ISSUE: { icon: <Clock className="w-3.5 h-3.5" />, bg: "bg-blue-50", border: "border-blue-200", textColor: "text-blue-600" },
  COMPETITOR_MENTION: { icon: <Search className="w-3.5 h-3.5" />, bg: "bg-red-50", border: "border-red-200", textColor: "text-red-600" },
  PRICING_PUSHBACK: { icon: <DollarSign className="w-3.5 h-3.5" />, bg: "bg-amber-50", border: "border-amber-200", textColor: "text-amber-600" },
};

const defaultInsight = { icon: <Brain className="w-3.5 h-3.5" />, bg: "bg-slate-50", border: "border-slate-200", textColor: "text-slate-600" };

const steps = [
  { icon: <Phone className="w-5 h-5" />, step: "1. Calls Complete", desc: "AI agent makes sales calls and data is recorded" },
  { icon: <Search className="w-5 h-5" />, step: "2. Analysis Runs", desc: "Gemini analyzes sentiment, objections & scores" },
  { icon: <Brain className="w-5 h-5" />, step: "3. Lessons Extracted", desc: "Patterns are identified across the call batch" },
  { icon: <Zap className="w-5 h-5" />, step: "4. Agent Improved", desc: "A new agent version is generated for your review" },
];

export default function WorkspaceLearningPage() {
  const params = useParams();
  const workspaceId = params?.id as string;

  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [history, setHistory] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ insightsGenerated: number; newAgentVersion: number | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/learning/history");
      setInsights(data.data.insights);
      setHistory(data.data.configs);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (workspaceId) load(); }, [load, workspaceId]);

  const handleRunLoop = async () => {
    setRunning(true);
    setResult(null);
    try {
      const { data } = await api.post("/learning/run");
      setResult({ insightsGenerated: data.data.insightsGenerated, newAgentVersion: data.data.newAgentVersion });
      load();
    } catch { /* ignore */ }
    finally { setRunning(false); }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e] flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-600" /> Learning Loop
          </h1>
          <p className="text-sm text-[#777587] mt-0.5">AI continuously learns from past calls to improve your agent.</p>
        </div>
        <button className="btn-primary" onClick={handleRunLoop} disabled={running}>
          {running ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing calls...</>
          ) : (
            <><Brain className="w-4 h-4" /> Run Learning Loop</>
          )}
        </button>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`px-5 py-4 rounded-xl border flex items-center gap-3 slide-up ${result.insightsGenerated > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
          {result.insightsGenerated > 0 ? (
            <>
              <Brain className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="font-semibold text-amber-700">
                Analysis complete! Found {result.insightsGenerated} insights.{" "}
                {result.newAgentVersion && `Agent v${result.newAgentVersion} created — review and activate it.`}
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <p className="font-semibold text-green-700">No issues detected — your agent is performing well!</p>
            </>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-[#191c1e] mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" /> How the Learning Loop Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map(({ icon, step, desc }) => (
            <div key={step} className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 mx-auto mb-3 shadow-sm">
                {icon}
              </div>
              <div className="text-xs font-bold text-indigo-700 mb-1">{step}</div>
              <div className="text-xs text-[#777587]">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-[#191c1e] mb-4">
          Learning Insights ({insights.length})
        </h2>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : insights.length === 0 ? (
          <div className="py-10 text-center">
            <Brain className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#464555]">No insights yet</p>
            <p className="text-xs text-[#777587] mt-1">Run the learning loop after accumulating calls</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => {
              const cfg = insightConfig[insight.insightType] ?? defaultInsight;
              return (
                <div key={insight.id} className={`rounded-xl border overflow-hidden ${cfg.border}`}>
                  <div className={`flex items-center gap-2 px-4 py-2.5 ${cfg.bg}`}>
                    <span className={cfg.textColor}>{cfg.icon}</span>
                    <span className={`text-xs font-bold uppercase tracking-wide ${cfg.textColor}`}>
                      {insight.insightType.replace(/_/g, " ")}
                    </span>
                    {insight.appliedToVersion && (
                      <span className="ml-auto text-xs text-[#777587]">Applied to v{insight.appliedToVersion}</span>
                    )}
                  </div>
                  <div className="px-4 py-3 space-y-2 bg-white">
                    <p className="text-sm text-[#464555]">{insight.description}</p>
                    <div className="flex items-start gap-2 pt-1">
                      <span className="text-xs font-bold text-green-600 shrink-0 mt-0.5">Fix:</span>
                      <p className="text-sm text-[#464555]">{insight.suggestion}</p>
                    </div>
                    <div className="text-xs text-[#777587]">
                      {new Date(insight.createdAt).toLocaleDateString()} · Based on {insight.sourceCallIds.length} call{insight.sourceCallIds.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Agent evolution timeline */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-[#191c1e] mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-600" /> Agent Evolution Timeline
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-[#777587]">No versions yet</p>
        ) : (
          <div className="relative pl-5">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-200" />
            <div className="space-y-4">
              {history.map((c) => (
                <div key={c.id} className="relative flex items-start gap-3">
                  <div
                    className="absolute -left-5 w-3 h-3 rounded-full border-2 border-white"
                    style={{
                      background: c.status === "ACTIVE" ? "#22c55e" : c.status === "PENDING_REVIEW" ? "#f59e0b" : "#cbd5e1",
                    }}
                  />
                  <div className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-indigo-600">v{c.version}</span>
                      <span className={`text-xs font-semibold ${c.status === "ACTIVE" ? "text-green-600" : c.status === "PENDING_REVIEW" ? "text-amber-600" : "text-[#777587]"}`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="text-xs text-[#777587] mt-1">
                      Generated {new Date(c.generatedAt).toLocaleDateString()}
                      {c.generatedFromInsights && c.generatedFromInsights.length > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-indigo-500"><Brain className="w-2.5 h-2.5" /> Learning-based</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
