"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { StatusBadge, LeadBadge, EmptyState, Modal, Skeleton } from "@/components/ui";
import type { Lead } from "@/types";

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", jobTitle: "" });
  const [bulkText, setBulkText] = useState("");
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const { data } = await api.get(`/api/leads?${params}`);
      setLeads(data.data.leads);
      setTotal(data.meta?.total ?? 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/leads", form);
      setShowAddModal(false);
      setForm({ name: "", phone: "", email: "", company: "", jobTitle: "" });
      load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleBulkImport = async () => {
    setSaving(true);
    try {
      const rows = bulkText.split("\n").filter(Boolean).map((line) => {
        const [name, phone, email, company] = line.split(",").map((s) => s.trim());
        return { name, phone, email, company };
      });
      await api.post("/api/leads/bulk", { leads: rows });
      setShowBulkModal(false);
      setBulkText("");
      load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleDispatch = async (leadId: string) => {
    setDispatching(leadId);
    try {
      await api.post("/api/calls/dispatch", { leadId });
      load();
    } catch { /* ignore */ }
    finally { setDispatching(null); }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm("Delete this lead?")) return;
    await api.delete(`/api/leads/${leadId}`);
    load();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Leads</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{total} total leads</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => setShowBulkModal(true)}>📤 Import CSV</button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Lead</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="input-dark w-64"
          placeholder="Search name, company..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input-dark w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {["NEW", "CALLED", "QUALIFIED", "DISQUALIFIED", "BOOKED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No leads yet"
            description="Add your first lead or import a CSV file to get started"
            action={<button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Lead</button>}
          />
        ) : (
          <table className="table-dark">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Classification</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const analysis = lead.calls?.[0]?.analysis;
                return (
                  <tr key={lead.id}>
                    <td>
                      <button
                        className="font-medium text-left hover:text-violet-400 transition-colors"
                        style={{ color: "var(--text-primary)" }}
                        onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                      >
                        {lead.name}
                      </button>
                      {lead.email && (
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{lead.email}</div>
                      )}
                    </td>
                    <td>{lead.company || "—"}</td>
                    <td className="font-mono text-xs">{lead.phone}</td>
                    <td><StatusBadge status={lead.status} /></td>
                    <td>
                      {analysis ? <LeadBadge classification={analysis.classification} /> : "—"}
                    </td>
                    <td>
                      {analysis ? (
                        <span
                          className="font-bold text-sm"
                          style={{
                            color: analysis.leadScore >= 70 ? "#ef4444" : analysis.leadScore >= 45 ? "#f59e0b" : "#3b82f6",
                          }}
                        >
                          {analysis.leadScore}
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}
                          onClick={() => handleDispatch(lead.id)}
                          disabled={dispatching === lead.id}
                        >
                          {dispatching === lead.id ? "Calling..." : "📞 Call"}
                        </button>
                        <button
                          className="px-2 py-1.5 rounded-lg text-xs transition-all"
                          style={{ color: "#f87171", background: "rgba(239,68,68,0.08)" }}
                          onClick={() => handleDelete(lead.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</button>
            <button className="btn-secondary py-1.5 px-3 text-xs" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>Next →</button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Lead">
        <form onSubmit={handleAdd} className="space-y-3">
          {[
            { key: "name", label: "Full Name *", placeholder: "Jane Smith" },
            { key: "phone", label: "Phone *", placeholder: "+1 555 000 0000" },
            { key: "email", label: "Email", placeholder: "jane@company.com" },
            { key: "company", label: "Company", placeholder: "Acme Corp" },
            { key: "jobTitle", label: "Job Title", placeholder: "VP of Sales" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
              <input className="input-dark" placeholder={placeholder}
                value={(form as Record<string, string>)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={key === "name" || key === "phone"} />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={saving}>
            {saving ? "Adding..." : "Add Lead"}
          </button>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal open={showBulkModal} onClose={() => setShowBulkModal(false)} title="Bulk Import Leads">
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Paste CSV rows: <code className="text-violet-400">Name, Phone, Email, Company</code>
          </p>
          <textarea
            className="input-dark resize-none"
            rows={8}
            placeholder={"John Smith, +1 555 0001, john@co.com, Acme\nJane Doe, +1 555 0002, jane@co.com, Beta Corp"}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <button className="btn-primary w-full justify-center" onClick={handleBulkImport} disabled={saving}>
            {saving ? "Importing..." : `Import ${bulkText.split("\n").filter(Boolean).length} leads`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
