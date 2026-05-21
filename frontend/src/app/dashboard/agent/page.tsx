"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { StatusBadge, Modal, Skeleton, EmptyState } from "@/components/ui";
import type { AgentConfig } from "@/types";

export default function AgentPage() {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<AgentConfig | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, activeRes] = await Promise.all([
        api.get("/agent/configs"),
        api.get("/agent/active"),
      ]);
      setConfigs(listRes.data.data.configs);
      setActiveConfig(activeRes.data.data.config);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post("/agent/generate");
      setToast("✓ New agent version generated!");
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setToast("✗ " + (e.response?.data?.message || "Generation failed"));
    } finally {
      setGenerating(false);
      setTimeout(() => setToast(""), 4000);
    }
  };

  const handleActivate = async (configId: string) => {
    setActivating(configId);
    try {
      await api.post(`/agent/configs/${configId}/activate`);
      setToast("✓ Agent activated!");
      load();
    } catch { /* ignore */ }
    finally {
      setActivating(null);
      setTimeout(() => setToast(""), 3000);
    }
  };

  const handleViewConfig = async (configId: string) => {
    const { data } = await api.get(`/agent/configs/${configId}`);
    setSelectedConfig(data.data.config);
  };

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 px-5 py-3 rounded-xl text-sm font-medium animate-slide-up z-50"
          style={{
            background: toast.startsWith("✓") ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${toast.startsWith("✓") ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: toast.startsWith("✓") ? "#4ade80" : "#f87171",
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>AI Agent</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Manage and evolve your sales agent</p>
        </div>
        <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </span>
          ) : "⚡ Generate New Version"}
        </button>
      </div>

      {/* Active Agent */}
      {activeConfig && (
        <div className="glass-card p-5" style={{ border: "1px solid rgba(34,197,94,0.25)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>
                Active Agent — v{activeConfig.version}
              </h2>
              <StatusBadge status="ACTIVE" />
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {activeConfig.activatedAt && `Activated ${new Date(activeConfig.activatedAt).toLocaleDateString()}`}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Opening Script
              </div>
              <div className="px-4 py-3 rounded-xl text-sm italic" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                "{activeConfig.openingScript}"
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Qualifying Questions ({activeConfig.qualifyingQuestions?.length})
                </div>
                <div className="space-y-1.5">
                  {activeConfig.qualifyingQuestions?.map((q, i) => (
                    <div key={i} className="flex gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <span className="text-violet-500 font-bold flex-shrink-0">{i + 1}.</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Objection Handlers ({activeConfig.objectionHandlers?.length})
                </div>
                <div className="space-y-2">
                  {activeConfig.objectionHandlers?.map((obj, i) => (
                    <div key={i} className="px-3 py-2 rounded-xl" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
                      <div className="text-xs font-semibold text-red-400 mb-1">"{obj.objection}"</div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{obj.response.slice(0, 100)}...</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                System Prompt (excerpt)
              </div>
              <div className="px-4 py-3 rounded-xl text-xs font-mono leading-relaxed"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-secondary)", maxHeight: 120, overflowY: "auto" }}>
                {activeConfig.systemPrompt?.slice(0, 400)}...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version History */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Version History</h2>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : configs.length === 0 ? (
          <EmptyState
            icon="🤖"
            title="No agent versions yet"
            description="Complete business onboarding and generate your first agent"
          />
        ) : (
          <div className="space-y-2">
            {configs.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                style={{ background: "rgba(139,92,246,0.04)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold" style={{ color: "#a78bfa" }}>v{c.version}</span>
                  <StatusBadge status={c.status} />
                  {c.generatedFromInsights && c.generatedFromInsights.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}>
                      🧠 Learning-based
                    </span>
                  )}
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(c.generatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => handleViewConfig(c.id)}>
                    View
                  </button>
                  {c.status !== "ACTIVE" && (
                    <button
                      className="btn-primary py-1.5 px-3 text-xs"
                      onClick={() => handleActivate(c.id)}
                      disabled={activating === c.id}
                    >
                      {activating === c.id ? "Activating..." : "Activate"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Config Modal */}
      <Modal open={!!selectedConfig} onClose={() => setSelectedConfig(null)} title={`Agent v${selectedConfig?.version} — Full Config`}>
        {selectedConfig && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Opening Script</div>
              <p className="text-sm italic px-3 py-2 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", color: "var(--text-secondary)" }}>
                "{selectedConfig.openingScript}"
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Qualifying Questions</div>
              <ol className="list-decimal list-inside space-y-1">
                {selectedConfig.qualifyingQuestions?.map((q, i) => (
                  <li key={i} className="text-sm" style={{ color: "var(--text-secondary)" }}>{q}</li>
                ))}
              </ol>
            </div>
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>System Prompt</div>
              <div className="text-xs font-mono px-3 py-2 rounded-xl whitespace-pre-wrap" style={{ background: "rgba(0,0,0,0.3)", color: "var(--text-secondary)", maxHeight: 180, overflowY: "auto" }}>
                {selectedConfig.systemPrompt}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
