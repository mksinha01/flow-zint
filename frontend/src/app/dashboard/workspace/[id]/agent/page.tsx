"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import api, { agentApi, businessApi } from "@/lib/api";
import type { AgentConfig } from "@/types";
import {
  Bot, Zap, Activity, RefreshCw, UserCheck, Shield, ChevronRight,
  X, Loader2, CheckCircle, AlertCircle, Brain, Eye, Lock, Sliders,
  TrendingUp, Sparkles, MessageSquareWarning, Flame,
} from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className ?? ""}`} style={{ minHeight: 20 }} />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-50 text-green-700 border-green-200",
    PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
    ARCHIVED: "bg-slate-100 text-slate-500 border-slate-200",
    DRAFT: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${map[status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-[#191c1e]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#777587] hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function WorkspaceAgentPage() {
  const params = useParams();
  const workspaceId = params?.id as string;

  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<AgentConfig | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Closing Tactics State
  const [sellingStyle, setSellingStyle] = useState<string>("CONSULTATIVE");
  const [entrapmentOptions, setEntrapmentOptions] = useState<string[]>([]);
  const [savingStyle, setSavingStyle] = useState(false);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, activeRes, contextRes] = await Promise.all([
        agentApi.list(workspaceId),
        agentApi.getActive(workspaceId),
        businessApi.get().catch(() => null),
      ]);
      setConfigs(listRes.data.data.configs);
      setActiveConfig(activeRes.data.data.config);
      if (contextRes?.data?.data?.context) {
        const ctx = contextRes.data.data.context;
        setSellingStyle(ctx.sellingStyle || "CONSULTATIVE");
        try {
          setEntrapmentOptions(JSON.parse(ctx.entrapmentOptions || "[]"));
        } catch {
          setEntrapmentOptions([]);
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { if (workspaceId) load(); }, [load, workspaceId]);

  const handleSaveClosingTactics = async (newStyle: string, newOptions: string[]) => {
    setSavingStyle(true);
    try {
      const res = await businessApi.get();
      const currentContext = res.data?.data?.context || {};

      await businessApi.save({
        companyName: currentContext.companyName || "Unknown Company",
        productDescription: currentContext.productDescription || "No description",
        targetCustomer: currentContext.targetCustomer || "General Audience",
        keyPainPoints: currentContext.keyPainPoints || "Not specified",
        pricing: currentContext.pricing || "",
        competitorNames: currentContext.competitorNames || "",
        callObjective: currentContext.callObjective || "book_demo",
        voiceStyle: currentContext.voiceStyle || "FORMAL",
        additionalNotes: currentContext.additionalNotes || "",
        sellingStyle: newStyle,
        entrapmentOptions: JSON.stringify(newOptions),
      });
      setSellingStyle(newStyle);
      setEntrapmentOptions(newOptions);
      showToast("Sales tactics saved! Click 'Generate New Version' to apply.");
    } catch (err) {
      showToast("Failed to save sales tactics", false);
    } finally {
      setSavingStyle(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await agentApi.generate(workspaceId);
      showToast("New agent version generated!");
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast(e.response?.data?.message || "Generation failed", false);
    } finally { setGenerating(false); }
  };

  const handleActivate = async (configId: string) => {
    setActivating(configId);
    try { await agentApi.activate(configId, workspaceId); showToast("Agent activated!"); load(); }
    catch { /* ignore */ }
    finally { setActivating(null); }
  };

  const handleViewConfig = async (configId: string) => {
    const { data } = await agentApi.get(configId, workspaceId);
    setSelectedConfig(data.data.config);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg slide-up z-50 border ${toast.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e]">Agent Configuration</h1>
          <p className="text-sm text-[#777587] mt-0.5">Manage rules, persona, and monitor active learning loops.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeConfig && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-semibold text-blue-700">Agent v{activeConfig.version} Active</span>
            </div>
          )}
          <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Zap className="w-4 h-4" /> Generate New Version</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left col */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active agent card */}
          {loading ? <Skeleton className="h-64" /> : activeConfig ? (
            <div className="card p-5 border-green-200 bg-green-50/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <h2 className="font-bold text-[#191c1e]">Active Agent — v{activeConfig.version}</h2>
                  <StatusBadge status="ACTIVE" />
                </div>
                {activeConfig.activatedAt && (
                  <span className="text-xs text-[#777587]">
                    Activated {new Date(activeConfig.activatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* Opening script */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#777587] mb-1.5">Opening Script</div>
                  <div className="px-4 py-3 rounded-lg text-sm italic bg-white border border-slate-200 text-[#464555]">
                    "{activeConfig.openingScript}"
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Qualifying questions */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#777587] mb-1.5">
                      Qualifying Questions ({activeConfig.qualifyingQuestions?.length ?? 0})
                    </div>
                    <div className="space-y-1.5">
                      {activeConfig.qualifyingQuestions?.map((q, i) => (
                        <div key={i} className="flex gap-2 text-sm text-[#464555]">
                          <span className="text-indigo-600 font-bold shrink-0">{i + 1}.</span>
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Objection handlers */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#777587] mb-1.5">
                      Objection Handlers ({activeConfig.objectionHandlers?.length ?? 0})
                    </div>
                    <div className="space-y-2">
                      {activeConfig.objectionHandlers?.slice(0, 3).map((obj, i) => (
                        <div key={i} className="px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                          <div className="text-xs font-semibold text-red-600 mb-0.5">"{obj.objection}"</div>
                          <div className="text-xs text-[#464555]">{obj.response.slice(0, 80)}...</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* System prompt */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#777587] mb-1.5">System Prompt</div>
                  <div className="px-4 py-3 rounded-lg text-xs font-mono leading-relaxed bg-slate-900 text-slate-300 max-h-28 overflow-y-auto">
                    {activeConfig.systemPrompt?.slice(0, 400)}...
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Version history */}
          <div className="card p-5">
            <h2 className="text-sm font-bold text-[#191c1e] mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" /> Version History
            </h2>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : configs.length === 0 ? (
              <div className="py-8 text-center">
                <Bot className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-[#464555]">No agent versions yet</p>
                <p className="text-xs text-[#777587]">Complete business onboarding to generate your first agent</p>
              </div>
            ) : (
              <div className="space-y-2">
                {configs.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-indigo-600">v{c.version}</span>
                      <StatusBadge status={c.status} />
                      {c.generatedFromInsights && c.generatedFromInsights.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold flex items-center gap-1">
                          <Brain className="w-2.5 h-2.5" /> Learning-based
                        </span>
                      )}
                      <span className="text-xs text-[#777587]">{new Date(c.generatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => handleViewConfig(c.id)}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      {c.status !== "ACTIVE" && (
                        <button className="btn-primary py-1.5 px-3 text-xs" onClick={() => handleActivate(c.id)} disabled={activating === c.id}>
                          {activating === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Activate"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right col */}
        <div className="lg:col-span-4 space-y-5">
          {/* Sales Tactics & Forced Trap Closing Engine */}
          <div className="card p-5 border-indigo-200 bg-indigo-50/10">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-100/60">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#191c1e]">Sales Closing Engine</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-[6px] text-[9px] font-extrabold uppercase transition-all ${sellingStyle === "FORCED_TRAP" ? "bg-red-500 text-white animate-pulse" : "bg-indigo-100 text-indigo-700"}`}>
                {sellingStyle === "FORCED_TRAP" ? "High Pressure" : "Consultative"}
              </span>
            </div>

            <p className="text-xs text-[#777587] mb-4">Select the closing strategy for your AI Voice Agent to optimize lead conversions.</p>

            {/* Selector tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl bg-slate-100/80 border border-slate-200">
              <button
                onClick={() => handleSaveClosingTactics("CONSULTATIVE", entrapmentOptions)}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${sellingStyle === "CONSULTATIVE" ? "bg-white shadow text-indigo-600" : "text-[#777587] hover:text-[#464555]"}`}
              >
                Consultative
              </button>
              <button
                onClick={() => handleSaveClosingTactics("FORCED_TRAP", entrapmentOptions)}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${sellingStyle === "FORCED_TRAP" ? "bg-white shadow text-red-600" : "text-[#777587] hover:text-[#464555]"}`}
              >
                Forced Trap 🔥
              </button>
            </div>

            {sellingStyle === "FORCED_TRAP" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-red-600 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-red-500" /> Active Entrapment Techniques
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: "false_alternative", label: "False Alternative (Binary choice)", desc: "Forces prospects to choose between buying or losing money." },
                      { key: "assumptive_close", label: "Assumptive Closing", desc: "Act as if they already agreed to buy and request billing info." },
                      { key: "fomo_urgency", label: "FOMO & Artificial Scarcity", desc: "Fabricates immediate product license limits to force haste." },
                      { key: "redirection_loop", label: "Objection Redirection Loop", desc: "Instantly turns 'busy/no money' into the primary reason to buy." },
                      { key: "pain_accentuator", label: "Pain Accentuator & Guilt", desc: "Reminds them that walking away is a failure to help their team." }
                    ].map((tech) => {
                      const active = entrapmentOptions.includes(tech.key);
                      return (
                        <label key={tech.key} className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${active ? "bg-red-50/40 border-red-100 text-[#191c1e]" : "bg-white border-slate-200 text-[#464555] hover:bg-slate-50"}`}>
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 shrink-0 animate-scale-in"
                            checked={active}
                            onChange={(e) => {
                              const newOpts = e.target.checked
                                ? [...entrapmentOptions, tech.key]
                                : entrapmentOptions.filter((k) => k !== tech.key);
                              handleSaveClosingTactics("FORCED_TRAP", newOpts);
                            }}
                          />
                          <div>
                            <div className="text-xs font-bold">{tech.label}</div>
                            <div className="text-[10px] text-[#777587] leading-relaxed mt-0.5">{tech.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-red-50/50 border border-red-100 flex items-start gap-2">
                  <MessageSquareWarning className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-[10px] text-red-700 leading-relaxed font-medium">
                    <strong>Warning:</strong> High-Pressure Forced Trap mode commands the AI to be intensely aggressive, persistent, and bypass standard conversational boundaries. Ensure compliance with local outbound sales practices.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-center">
                <Lock className="w-5 h-5 text-indigo-500 mx-auto mb-1.5" />
                <div className="text-xs font-bold text-indigo-800">Standard Consultative Advisor</div>
                <p className="text-[10px] text-indigo-600 leading-relaxed mt-1">
                  The agent acts as a helpful, friendly consultant. Toggle <strong>Forced Trap</strong> mode to unlock aggressive closing strategies.
                </p>
              </div>
            )}
          </div>

          {/* Model health */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#777587]">Model Health</h3>
              <Activity className="w-4 h-4 text-[#777587]" />
            </div>
            <div className="flex justify-center my-4">
              <div className="relative">
                <svg width={120} height={120} className="-rotate-90">
                  <circle cx={60} cy={60} r={52} fill="none" stroke="#e2e8f0" strokeWidth={8} />
                  <circle cx={60} cy={60} r={52} fill="none" stroke="#4f46e5" strokeWidth={8}
                    strokeLinecap="round" strokeDasharray={326.73} strokeDashoffset={39}
                    style={{ transition: "stroke-dashoffset 1s ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">88%</span>
                  <span className="text-xs text-[#777587]">Accuracy</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-[#191c1e]">1,204</div>
                <div className="text-xs text-[#777587]">Conversations</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-[#191c1e]">342</div>
                <div className="text-xs text-[#777587]">Meetings Booked</div>
              </div>
            </div>
          </div>

          {/* Learning loop sidebar */}
          <div className="card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-2 pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#777587]">Learning Loop</h3>
              <RefreshCw className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-xs text-[#777587] mb-3">Review recent marginal interactions to improve agent guidelines.</p>
            <div className="space-y-3">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-indigo-600 font-semibold">ID: #4092-A</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Needs Review</span>
                </div>
                <p className="text-xs text-[#464555] italic border-l-2 border-indigo-400 pl-2 mb-2 leading-relaxed">
                  "Agent failed to identify budget constraint early enough in the conversation flow."
                </p>
                <div className="flex gap-2">
                  <button className="flex-1 btn-secondary py-1.5 text-xs justify-center">View Transcript</button>
                  <button className="flex-1 btn-primary py-1.5 text-xs justify-center">Train Model</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Config Modal */}
      <Modal open={!!selectedConfig} onClose={() => setSelectedConfig(null)} title={`Agent v${selectedConfig?.version} — Full Config`}>
        {selectedConfig && (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#777587] mb-2">Opening Script</div>
              <p className="text-sm italic px-3 py-2 rounded-lg bg-indigo-50 text-[#464555] border border-indigo-100">
                "{selectedConfig.openingScript}"
              </p>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#777587] mb-2">Qualifying Questions</div>
              <ol className="list-decimal list-inside space-y-1">
                {selectedConfig.qualifyingQuestions?.map((q, i) => (
                  <li key={i} className="text-sm text-[#464555]">{q}</li>
                ))}
              </ol>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#777587] mb-2">System Prompt</div>
              <div className="text-xs font-mono px-3 py-2 rounded-lg bg-slate-900 text-slate-300 whitespace-pre-wrap max-h-44 overflow-y-auto">
                {selectedConfig.systemPrompt}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
