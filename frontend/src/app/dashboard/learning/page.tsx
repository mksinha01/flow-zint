"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Skeleton, EmptyState } from "@/components/ui";
import type { LearningInsight, AgentConfig } from "@/types";

export default function LearningPage() {
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [history, setHistory] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ insightsGenerated: number; newAgentVersion: number | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/learning/history");
      setInsights(data.data.insights);
      setHistory(data.data.configs);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRunLoop = async () => {
    setRunning(true);
    setResult(null);
    try {
      const { data } = await api.post("/api/learning/run");
      setResult({ insightsGenerated: data.data.insightsGenerated, newAgentVersion: data.data.newAgentVersion });
      load();
    } catch { /* ignore */ }
    finally { setRunning(false); }
  };

  const insightTypeColors: Record<string, { bg: string; color: string; icon: string }> = {
    OBJECTION_UNHANDLED: { bg: "rgba(239,68,68,0.1)", color: "#f87171", icon: "⚠️" },
    WRONG_TONE: { bg: "rgba(245,158,11,0.1)", color: "#fbbf24", icon: "🎭" },
    SCRIPT_TOO_LONG: { bg: "rgba(245,158,11,0.1)", color: "#fbbf24", icon: "📜" },
    ICP_MISMATCH: { bg: "rgba(239,68,68,0.1)", color: "#f87171", icon: "🎯" },
    LOW_ENGAGEMENT: { bg: "rgba(139,92,246,0.1)", color: "#a78bfa", icon: "😴" },
    TIMING_ISSUE: { bg: "rgba(59,130,246,0.1)", color: "#60a5fa", icon: "⏰" },
    COMPETITOR_MENTION: { bg: "rgba(239,68,68,0.1)", color: "#f87171", icon: "⚔️" },
    PRICING_PUSHBACK: { bg: "rgba(245,158,11,0.1)", color: "#fbbf24", icon: "💰" },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Learning Loop 🧠</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            AI continuously learns from past calls to improve your agent
          </p>
        </div>
        <button className="btn-primary" onClick={handleRunLoop} disabled={running}>
          {running ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing calls...
            </span>
          ) : "🧠 Run Learning Loop"}
        </button>
      </div>

      {/* Result Banner */}
      {result && (
        <div
          className="px-5 py-4 rounded-xl animate-slide-up"
          style={{
            background: result.insightsGenerated > 0 ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)",
            border: `1px solid ${result.insightsGenerated > 0 ? "rgba(245,158,11,0.25)" : "rgba(34,197,94,0.25)"}`,
          }}
        >
          {result.insightsGenerated > 0 ? (
            <p className="font-semibold" style={{ color: "#fbbf24" }}>
              🧠 Analysis complete! Found {result.insightsGenerated} insights.{" "}
              {result.newAgentVersion && `Agent v${result.newAgentVersion} created — review and activate it in the AI Agent page.`}
            </p>
          ) : (
            <p className="font-semibold text-green-400">
              ✓ No issues detected — your agent is performing well!
            </p>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>How the Learning Loop Works</h2>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            { icon: "📞", step: "1. Calls complete", desc: "AI agent makes sales calls and data is recorded" },
            { icon: "🔍", step: "2. Analysis runs", desc: "GPT-4o analyzes sentiment, objections, and scores" },
            { icon: "🧠", step: "3. Lessons extracted", desc: "Patterns are identified across the call batch" },
            { icon: "⚡", step: "4. Agent improved", desc: "A new agent version is generated for your review" },
          ].map(({ icon, step, desc }) => (
            <div key={step} className="px-4 py-4 rounded-xl text-center" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid var(--border)" }}>
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-xs font-bold mb-1" style={{ color: "#a78bfa" }}>{step}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Learning Insights ({insights.length})
        </h2>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : insights.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No insights yet"
            description="Run the learning loop after accumulating some calls to get AI-powered recommendations"
          />
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => {
              const style = insightTypeColors[insight.insightType] || insightTypeColors.OBJECTION_UNHANDLED;
              return (
                <div key={insight.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: style.bg }}>
                    <span>{style.icon}</span>
                    <span className="text-xs font-bold" style={{ color: style.color }}>
                      {insight.insightType.replace(/_/g, " ")}
                    </span>
                    {insight.appliedToVersion && (
                      <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
                        Applied to v{insight.appliedToVersion}
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{insight.description}</p>
                    <div className="flex items-start gap-2 pt-1">
                      <span className="text-xs font-bold" style={{ color: "#4ade80" }}>Fix:</span>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{insight.suggestion}</p>
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(insight.createdAt).toLocaleDateString()} · Based on {insight.sourceCallIds.length} calls
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Agent Iteration Timeline */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Agent Evolution Timeline</h2>
        {history.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No versions yet</p>
        ) : (
          <div className="relative pl-5">
            <div className="absolute left-2 top-0 bottom-0 w-0.5" style={{ background: "rgba(139,92,246,0.2)" }} />
            <div className="space-y-4">
              {history.map((c) => (
                <div key={c.id} className="relative flex items-start gap-3">
                  <div
                    className="absolute -left-5 w-3 h-3 rounded-full"
                    style={{ background: c.status === "ACTIVE" ? "#4ade80" : c.status === "PENDING_REVIEW" ? "#fbbf24" : "rgba(139,92,246,0.4)", border: "2px solid var(--bg-primary)" }}
                  />
                  <div className="px-4 py-3 rounded-xl flex-1" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm" style={{ color: "#a78bfa" }}>v{c.version}</span>
                      <span className="text-xs" style={{ color: c.status === "ACTIVE" ? "#4ade80" : c.status === "PENDING_REVIEW" ? "#fbbf24" : "var(--text-muted)" }}>
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      Generated {new Date(c.generatedAt).toLocaleDateString()}
                      {c.generatedFromInsights && c.generatedFromInsights.length > 0 && " · 🧠 Learning-based"}
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
