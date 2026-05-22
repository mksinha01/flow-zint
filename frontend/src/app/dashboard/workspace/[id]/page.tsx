"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api, { workspacesApi, businessApi } from "@/lib/api";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { DashboardStats, DashboardCharts } from "@/types";
import {
  Users, Phone, Star, Target, Flame, Sun, Snowflake, Calendar,
  TrendingUp, TrendingDown, CheckCircle, Settings2, Loader2,
  BarChart3, Plus, Trash2, FileText,
} from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className ?? ""}`} style={{ minHeight: 20 }} />;
}

const COLORS = { HOT: "#ef4444", WARM: "#f59e0b", COLD: "#3b82f6" };

export default function WorkspaceDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"overview" | "settings">("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);

  const [workspaceName, setWorkspaceName] = useState("");
  const [context, setContext] = useState({
    companyName: "", productDescription: "", targetCustomer: "",
    keyPainPoints: "", pricing: "", competitorNames: "",
    callObjective: "book_demo", voiceStyle: "FORMAL", additionalNotes: "",
  });
  const [documents, setDocuments] = useState<{ id: string; fileName: string; uploadedAt: string }[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const loadOverview = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const headers = { "x-workspace-id": id };
      const [sRes, cRes] = await Promise.all([
        api.get("/dashboard/stats", { headers }).catch(() => ({ data: { data: { stats: null } } })),
        api.get("/dashboard/charts", { headers }).catch(() => ({ data: { data: { charts: null } } })),
      ]);
      setStats(sRes.data.data?.stats || null);
      setCharts(cRes.data.data?.charts || null);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [id]);

  const loadSettings = useCallback(async () => {
    if (!id) return;
    try {
      const headers = { "x-workspace-id": id };
      const [wRes, bRes, dRes] = await Promise.all([
        api.get(`/workspaces/${id}`, { headers }),
        api.get("/business/context", { headers }),
        api.get("/business/documents", { headers }),
      ]);
      setWorkspaceName(wRes.data.data.workspace.name);
      if (bRes.data.data?.context) {
        const bc = bRes.data.data.context;
        setContext({
          companyName: bc.companyName || "", productDescription: bc.productDescription || "",
          targetCustomer: bc.targetCustomer || "", keyPainPoints: bc.keyPainPoints || "",
          pricing: bc.pricing || "", competitorNames: bc.competitorNames || "",
          callObjective: bc.callObjective || "book_demo", voiceStyle: bc.voiceStyle || "FORMAL",
          additionalNotes: bc.additionalNotes || "",
        });
      }
      setDocuments(dRes.data.data?.documents || []);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    if (activeTab === "overview") loadOverview();
    else loadSettings();
  }, [activeTab, loadOverview, loadSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const headers = { "x-workspace-id": id };
      await Promise.all([
        workspacesApi.update(id, workspaceName),
        api.post("/business/context", context, { headers }),
      ]);
      showToast("Workspace settings saved!");
    } catch { showToast("Failed to save settings."); }
    finally { setSavingSettings(false); }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post("/business/documents", form, {
        headers: { "x-workspace-id": id, "Content-Type": "multipart/form-data" },
      });
      showToast(`Uploaded ${file.name}`);
      loadSettings();
    } catch { showToast("Upload failed."); }
    finally { setUploadingDoc(false); }
  };

  const handleDocDelete = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await api.delete(`/business/documents/${docId}`, { headers: { "x-workspace-id": id } });
      showToast("Document deleted.");
      loadSettings();
    } catch { showToast("Delete failed."); }
  };

  const callVolumeData = charts
    ? Object.entries(charts.callVolume).sort(([a], [b]) => a.localeCompare(b)).slice(-14)
        .map(([date, v]) => ({ date: date.slice(5), total: v.total, completed: v.completed }))
    : [];

  const scoreData = charts
    ? Object.entries(charts.scoreDistribution).map(([range, count]) => ({ range, count }))
    : [];

  const pieData = charts
    ? [
        { name: "Hot", value: charts.classificationBreakdown.HOT, color: COLORS.HOT },
        { name: "Warm", value: charts.classificationBreakdown.WARM, color: COLORS.WARM },
        { name: "Cold", value: charts.classificationBreakdown.COLD, color: COLORS.COLD },
      ]
    : [];

  const statCards = [
    { title: "Total Leads", value: stats?.totalLeads ?? 0, icon: <Users className="w-5 h-5" />, iconBg: "bg-indigo-50", iconColor: "text-indigo-600", sub: "All time" },
    { title: "Calls Today", value: stats?.callsToday ?? 0, icon: <Phone className="w-5 h-5" />, iconBg: "bg-blue-50", iconColor: "text-blue-600", sub: `${stats?.callsThisWeek ?? 0} this week` },
    { title: "Avg Lead Score", value: stats?.avgLeadScore ?? 0, icon: <Star className="w-5 h-5" />, iconBg: "bg-amber-50", iconColor: "text-amber-500", sub: "Out of 100" },
    { title: "Success Rate", value: `${stats?.successRate ?? 0}%`, icon: <Target className="w-5 h-5" />, iconBg: "bg-green-50", iconColor: "text-green-600", sub: "Hot / calls" },
    { title: "Hot Leads", value: stats?.hotLeads ?? 0, icon: <Flame className="w-5 h-5" />, iconBg: "bg-red-50", iconColor: "text-red-500" },
    { title: "Warm Leads", value: stats?.warmLeads ?? 0, icon: <Sun className="w-5 h-5" />, iconBg: "bg-amber-50", iconColor: "text-amber-500" },
    { title: "Demos Booked", value: stats?.bookings ?? 0, icon: <Calendar className="w-5 h-5" />, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
    { title: "Cold Leads", value: stats?.coldLeads ?? 0, icon: <Snowflake className="w-5 h-5" />, iconBg: "bg-sky-50", iconColor: "text-sky-500" },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 px-4 py-3 rounded-lg bg-[#191c1e] text-white text-sm font-medium shadow-xl slide-up z-50">
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e]">Workspace Dashboard</h1>
          <p className="text-sm text-[#777587] mt-0.5">Monitor and configure your AI sales operations.</p>
        </div>
        {stats?.activeAgentVersion && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-green-700">Agent v{stats.activeAgentVersion} Active</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
          { key: "settings", label: "Workspace Settings", icon: <Settings2 className="w-4 h-4" /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as "overview" | "settings")}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all mr-4 ${
              activeTab === key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-[#777587] hover:text-[#464555]"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <>
          {/* Stat Cards */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card) => (
                <div key={card.title} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#777587] uppercase tracking-wide">{card.title}</span>
                    <div className={`w-8 h-8 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center`}>
                      {card.icon}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#191c1e]">{card.value}</div>
                  {card.sub && <div className="text-xs text-[#777587] mt-1">{card.sub}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Call volume chart */}
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#191c1e]">Call Volume — Last 14 Days</h2>
              </div>
              {loading ? <Skeleton className="h-48" /> : (
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={callVolumeData}>
                    <defs>
                      <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradComp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fill: "#777587", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#777587", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#191c1e", fontSize: 13 }}
                      cursor={{ stroke: "rgba(79,70,229,0.1)" }}
                    />
                    <Area type="monotone" dataKey="total" name="Total" stroke="#4f46e5" fill="url(#gradTotal)" strokeWidth={2} />
                    <Area type="monotone" dataKey="completed" name="Completed" stroke="#22c55e" fill="url(#gradComp)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Lead classification pie */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-[#191c1e] mb-4">AI Lead Temp</h2>
              {loading ? <Skeleton className="h-48" /> : (
                <div className="space-y-4">
                  {pieData.map((item) => {
                    const total = pieData.reduce((s, x) => s + x.value, 0) || 1;
                    const pct = Math.round((item.value / total) * 100);
                    return (
                      <div key={item.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-semibold text-[#191c1e] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                            {item.name}
                          </span>
                          <span className="font-mono text-[#464555]">{item.value} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }} />
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => router.push(`/dashboard/workspace/${id}/leads`)}
                    className="w-full mt-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-[#464555] hover:bg-slate-50 transition-colors"
                  >
                    View Lead Routing
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Score distribution */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-[#191c1e] mb-4">Lead Score Distribution</h2>
              {loading ? <Skeleton className="h-40" /> : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={scoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fill: "#777587", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#777587", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#191c1e", fontSize: 13 }} />
                    <Bar dataKey="count" name="Leads" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top objections */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-[#191c1e] mb-4">Top Objections Detected</h2>
              {loading ? <Skeleton className="h-40" /> : (
                <div className="space-y-3">
                  {!charts?.topObjections.length && (
                    <p className="text-sm py-4 text-center text-[#777587]">No objections data yet</p>
                  )}
                  {charts?.topObjections.map((obj, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#464555] truncate flex-1">{obj.text}</span>
                        <span className="text-xs font-bold ml-2 text-indigo-600">{obj.count}×</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${(obj.count / (charts.topObjections[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Settings tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h2 className="text-base font-bold text-[#191c1e] mb-5">Workspace Details</h2>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                {[
                  { key: "workspaceName", label: "Workspace Name", type: "text", placeholder: "e.g. Acme Corp", value: workspaceName, onChange: (v: string) => setWorkspaceName(v) },
                  { key: "companyName", label: "Company Name", type: "text", placeholder: "e.g. Acme Inc", value: context.companyName, onChange: (v: string) => setContext({ ...context, companyName: v }) },
                  { key: "targetCustomer", label: "Target Customer", type: "text", placeholder: "e.g. B2B Sales Directors", value: context.targetCustomer, onChange: (v: string) => setContext({ ...context, targetCustomer: v }) },
                  { key: "pricing", label: "Pricing Info", type: "text", placeholder: "e.g. $49/user/month", value: context.pricing, onChange: (v: string) => setContext({ ...context, pricing: v }) },
                  { key: "competitorNames", label: "Competitors", type: "text", placeholder: "e.g. Competitor X, Y", value: context.competitorNames, onChange: (v: string) => setContext({ ...context, competitorNames: v }) },
                ].map(({ key, label, type, placeholder, value, onChange }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">{label}</label>
                    <input type={type} className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Call Objective</label>
                  <select className="input" value={context.callObjective} onChange={(e) => setContext({ ...context, callObjective: e.target.value })}>
                    <option value="book_demo">Book Calendly Demo</option>
                    <option value="qualify">Qualify Lead</option>
                    <option value="sell_direct">Sell Product Directly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Product Description</label>
                  <textarea rows={4} className="input resize-none" placeholder="What does your company offer?" value={context.productDescription} onChange={(e) => setContext({ ...context, productDescription: e.target.value })} />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#777587] mb-1.5">Key Pain Points</label>
                  <textarea rows={2} className="input resize-none" placeholder="e.g. High CAC, slow sales cycles" value={context.keyPainPoints} onChange={(e) => setContext({ ...context, keyPainPoints: e.target.value })} />
                </div>

                <button type="submit" className="btn-primary w-full justify-center" disabled={savingSettings}>
                  {savingSettings ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Workspace Properties"}
                </button>
              </form>
            </div>
          </div>

          {/* Knowledge base */}
          <div className="card p-5">
            <h2 className="text-sm font-bold text-[#191c1e] mb-1">Knowledge Base</h2>
            <p className="text-xs text-[#777587] mb-4">Upload brochures, FAQs or guidelines to guide the AI Agent.</p>

            <label className="flex flex-col items-center justify-center p-5 rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-300 cursor-pointer transition-colors mb-4 bg-slate-50 hover:bg-indigo-50/30">
              <FileText className="w-6 h-6 text-[#777587] mb-2" />
              <span className="text-xs font-semibold text-[#464555]">Upload PDF / DOCX</span>
              <span className="text-[10px] text-[#777587] mt-0.5">Click to browse files</span>
              <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleDocUpload} disabled={uploadingDoc} />
            </label>

            {uploadingDoc && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 mb-3 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Uploading & parsing...
              </div>
            )}

            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-xs text-[#777587] italic text-center py-3">No documents uploaded</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white">
                    <div className="truncate pr-2">
                      <div className="text-xs font-semibold text-[#191c1e] truncate">{doc.fileName}</div>
                      <div className="text-[10px] text-[#777587]">{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => handleDocDelete(doc.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
