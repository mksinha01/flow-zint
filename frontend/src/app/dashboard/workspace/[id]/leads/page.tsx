"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import type { Lead } from "@/types";
import {
  Plus, Upload, Download, Search, Phone, Trash2, X, Mail,
  MoreVertical, ChevronLeft, ChevronRight, Filter, Flame, Sun, Snowflake, Loader2,
} from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className ?? ""}`} style={{ minHeight: 20 }} />;
}

function ScoreRing({ score }: { score: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#ef4444" : score >= 45 ? "#f59e0b" : "#3b82f6";
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <svg width={40} height={40} className="-rotate-90">
        <circle cx={20} cy={20} r={r} fill="none" stroke="#e2e8f0" strokeWidth={3} />
        <circle
          cx={20} cy={20} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - dash}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="absolute text-[11px] font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function LeadBadge({ classification }: { classification: "HOT" | "WARM" | "COLD" }) {
  if (classification === "HOT") return <span className="badge-hot"><Flame className="w-2.5 h-2.5" /> HOT</span>;
  if (classification === "WARM") return <span className="badge-warm"><Sun className="w-2.5 h-2.5" /> WARM</span>;
  return <span className="badge-cold"><Snowflake className="w-2.5 h-2.5" /> COLD</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    NEW: { bg: "bg-slate-100", color: "text-slate-600" },
    CALLED: { bg: "bg-indigo-50", color: "text-indigo-600" },
    QUALIFIED: { bg: "bg-green-50", color: "text-green-700" },
    DISQUALIFIED: { bg: "bg-red-50", color: "text-red-600" },
    BOOKED: { bg: "bg-blue-50", color: "text-blue-600" },
  };
  const s = map[status] ?? { bg: "bg-slate-100", color: "text-slate-600" };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.color}`}>
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
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#777587] hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function WorkspaceLeadsPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params?.id as string;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", jobTitle: "" });
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [bulkCalling, setBulkCalling] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvDataRows, setCsvDataRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState({ name: "", phone: "", email: "", company: "" });
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) q.set("search", search);
      if (status) q.set("status", status);
      const { data } = await api.get(`/leads?${q}`);
      setLeads(data.data.leads);
      setTotal(data.meta?.total ?? 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { if (workspaceId) load(); }, [load, workspaceId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/leads", form);
      setShowAddModal(false);
      setForm({ name: "", phone: "", email: "", company: "", jobTitle: "" });
      load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let entry = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') { entry += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === ',' && !inQuotes) { row.push(entry.trim()); entry = ""; }
      else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        row.push(entry.trim()); lines.push(row); row = []; entry = "";
      } else { entry += char; }
    }
    if (entry || row.length > 0) { row.push(entry.trim()); lines.push(row); }
    return lines.filter(r => r.length > 0 && r.some(c => c !== ""));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(""); setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) { setErrorMsg("CSV missing data rows."); return; }
      const headers = parsed[0];
      setCsvHeaders(headers); setCsvDataRows(parsed.slice(1));
      const nm = { name: "", phone: "", email: "", company: "" };
      headers.forEach((h, idx) => {
        const l = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (l.includes("name")) nm.name = String(idx);
        else if (l.includes("phone") || l.includes("mobile")) nm.phone = String(idx);
        else if (l.includes("email") || l.includes("mail")) nm.email = String(idx);
        else if (l.includes("company") || l.includes("org")) nm.company = String(idx);
      });
      setMappings(nm);
    };
    reader.readAsText(file);
  };

  const resetCsv = () => { setCsvFile(null); setCsvHeaders([]); setCsvDataRows([]); setMappings({ name: "", phone: "", email: "", company: "" }); setErrorMsg(""); };

  const handleBulkImport = async () => {
    if (!mappings.name || !mappings.phone) { setErrorMsg("Map Name and Phone fields."); return; }
    setSaving(true);
    try {
      const rows = csvDataRows.map(row => ({
        name: (row[Number(mappings.name)] || "").trim() || "Unnamed",
        phone: (row[Number(mappings.phone)] || "").trim(),
        email: mappings.email ? (row[Number(mappings.email)] || "").trim() || null : null,
        company: mappings.company ? (row[Number(mappings.company)] || "").trim() || null : null,
      })).filter(r => r.phone);
      if (!rows.length) { setErrorMsg("No valid leads found."); setSaving(false); return; }
      await api.post("/leads/bulk", { leads: rows });
      setShowBulkModal(false); resetCsv(); load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setErrorMsg(e.response?.data?.message || "Import failed.");
    } finally { setSaving(false); }
  };

  const handleDispatch = async (leadId: string) => {
    setDispatching(leadId);
    try { await api.post("/calls/dispatch", { leadId }); load(); }
    catch { /* ignore */ }
    finally { setDispatching(null); }
  };

  const handleBulkCall = async () => {
    if (!leads.length) return;
    setBulkCalling(true); setBulkProgress(0);
    for (let i = 0; i < leads.length; i++) {
      setDispatching(leads[i].id);
      try { await api.post("/calls/dispatch", { leadId: leads[i].id }); } catch { /* ignore */ }
      setBulkProgress(i + 1);
    }
    setDispatching(null); setBulkCalling(false); load();
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm("Delete this lead?")) return;
    await api.delete(`/leads/${leadId}`);
    load();
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const avatarColors = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-blue-100 text-blue-700", "bg-rose-100 text-rose-700"];

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e]">Leads Management</h1>
          <p className="text-sm text-[#777587] mt-0.5">Review and prioritize your active prospects based on AI scoring.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setShowBulkModal(true)}>
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button className="btn-secondary" disabled>
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Add Lead
          </button>
          <button className="btn-primary" onClick={handleBulkCall} disabled={bulkCalling || !leads.length}>
            {bulkCalling ? <><Loader2 className="w-4 h-4 animate-spin" />{bulkProgress}/{leads.length}</> : <><Phone className="w-4 h-4" /> Bulk Call</>}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Filter className="w-4 h-4 text-[#777587] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-9 py-1.5 bg-slate-50 border-0 focus:bg-white focus:border focus:border-indigo-400"
            placeholder="Filter by Name or Company..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-px h-6 bg-slate-200" />
        <select className="input w-36 py-1.5" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {["NEW", "CALLED", "QUALIFIED", "DISQUALIFIED", "BOOKED"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#777587]">
        <div className="col-span-4">Lead Details</div>
        <div className="col-span-2 text-center">Score</div>
        <div className="col-span-2 text-center">Status</div>
        <div className="col-span-3">Last Contacted</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {/* Lead rows */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
        ) : leads.length === 0 ? (
          <div className="card p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
              <Users2Icon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-semibold text-[#191c1e]">No leads yet</h3>
              <p className="text-sm text-[#777587]">Add your first lead or import from CSV</p>
            </div>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4" /> Add Lead</button>
          </div>
        ) : leads.map((lead, idx) => {
          const analysis = lead.calls?.[0]?.analysis;
          const colorCls = avatarColors[idx % avatarColors.length];
          return (
            <div
              key={lead.id}
              className="grid grid-cols-12 gap-3 items-center card px-4 py-3.5 hover:border-indigo-200 hover:shadow-[0_2px_8px_rgba(79,70,229,0.06)] transition-all group"
            >
              {/* Lead details */}
              <div className="col-span-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${colorCls}`}>
                  {getInitials(lead.name)}
                </div>
                <div>
                  <button
                    className="font-semibold text-[#191c1e] text-sm text-left group-hover:text-indigo-600 transition-colors"
                    onClick={() => router.push(`/dashboard/workspace/${workspaceId}/leads/${lead.id}`)}
                  >
                    {lead.name}
                  </button>
                  <p className="text-xs text-[#777587]">{lead.company || lead.jobTitle || lead.email || "—"}</p>
                </div>
              </div>

              {/* Score ring */}
              <div className="col-span-2 flex justify-center">
                {analysis ? <ScoreRing score={analysis.leadScore} /> : <span className="text-sm text-[#777587]">—</span>}
              </div>

              {/* Classification badge */}
              <div className="col-span-2 flex justify-center">
                {analysis ? <LeadBadge classification={analysis.classification} /> : <StatusBadge status={lead.status} />}
              </div>

              {/* Last contacted */}
              <div className="col-span-3">
                {lead.calls?.[0] ? (
                  <>
                    <p className="text-sm text-[#191c1e]">{new Date(lead.calls[0].createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-[#777587] font-mono">{lead.calls[0].status}</p>
                  </>
                ) : (
                  <span className="text-sm text-[#777587]">Not contacted</span>
                )}
              </div>

              {/* Actions */}
              <div className="col-span-1 flex justify-end items-center gap-1">
                <button
                  className="p-1.5 rounded-lg text-[#777587] hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  onClick={() => handleDispatch(lead.id)}
                  disabled={dispatching === lead.id}
                  title="Call lead"
                >
                  {dispatching === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                </button>
                <button
                  className="p-1.5 rounded-lg text-[#777587] hover:text-red-500 hover:bg-red-50 transition-colors"
                  onClick={() => handleDelete(lead.id)}
                  title="Delete lead"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#777587]">
            Showing {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} of {total} leads
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Lead">
        <form onSubmit={handleAdd} className="space-y-3.5">
          {[
            { key: "name", label: "Full Name *", placeholder: "Jane Smith", type: "text" },
            { key: "phone", label: "Phone *", placeholder: "+1 555 000 0000", type: "tel" },
            { key: "email", label: "Email", placeholder: "jane@company.com", type: "email" },
            { key: "company", label: "Company", placeholder: "Acme Corp", type: "text" },
            { key: "jobTitle", label: "Job Title", placeholder: "VP of Sales", type: "text" },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-[#464555] mb-1.5">{label}</label>
              <input
                className="input" type={type} placeholder={placeholder}
                value={(form as Record<string, string>)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={key === "name" || key === "phone"}
              />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full justify-center mt-1" disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : "Add Lead"}
          </button>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal open={showBulkModal} onClose={() => { setShowBulkModal(false); resetCsv(); }} title="Import Leads from CSV">
        <div className="space-y-4">
          {!csvFile ? (
            <>
              <p className="text-sm text-[#777587]">Select a CSV file to import leads. You can map columns in the next step.</p>
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                <Upload className="w-8 h-8 text-[#777587] mb-2" />
                <span className="text-sm font-semibold text-[#464555]">Upload CSV File</span>
                <span className="text-xs text-[#777587] mt-1">Click to select or drag & drop</span>
                <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={handleFileSelect} />
              </label>
              {errorMsg && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">{errorMsg}</div>}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-sm">
                  <div className="font-semibold text-[#191c1e]">{csvFile.name}</div>
                  <div className="text-xs text-[#777587]">{csvDataRows.length} rows</div>
                </div>
                <button onClick={resetCsv} className="text-xs text-red-500 hover:underline font-medium">Change</button>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#777587] mb-2">Map Columns</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "name", label: "Name *" },
                    { key: "phone", label: "Phone *" },
                    { key: "email", label: "Email (optional)" },
                    { key: "company", label: "Company (optional)" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-[#464555] mb-1">{label}</label>
                      <select
                        className="input py-1.5 text-xs"
                        value={(mappings as Record<string, string>)[key]}
                        onChange={(e) => setMappings({ ...mappings, [key]: e.target.value })}
                      >
                        <option value="">-- Select --</option>
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              {errorMsg && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">{errorMsg}</div>}
              <button
                className="btn-primary w-full justify-center"
                onClick={handleBulkImport}
                disabled={saving || !mappings.name || !mappings.phone}
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : `Import ${csvDataRows.length} Leads`}
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Users2Icon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
}
