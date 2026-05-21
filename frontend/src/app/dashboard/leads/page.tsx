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
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState<string | null>(null);

  // CSV Dynamic Mapper States
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvDataRows, setCsvDataRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState({ name: "", phone: "", email: "", company: "" });
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const { data } = await api.get(`/leads?${params}`);
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
        if (inQuotes && nextChar === '"') {
          entry += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(entry.trim());
        entry = "";
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(entry.trim());
        lines.push(row);
        row = [];
        entry = "";
      } else {
        entry += char;
      }
    }
    if (entry || row.length > 0) {
      row.push(entry.trim());
      lines.push(row);
    }
    return lines.filter(r => r.length > 0 && r.some(cell => cell !== ""));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setErrorMsg("");
    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setErrorMsg("Failed to read CSV file content.");
        return;
      }
      
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        setErrorMsg("CSV file is empty or missing data rows.");
        return;
      }
      
      const headers = parsed[0];
      const dataRows = parsed.slice(1);
      
      setCsvHeaders(headers);
      setCsvDataRows(dataRows);
      
      // Auto-detect column indices
      const newMappings = { name: "", phone: "", email: "", company: "" };
      headers.forEach((h, index) => {
        const lower = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (lower.includes("name") || lower === "fullname" || lower === "leadname") {
          newMappings.name = String(index);
        } else if (lower.includes("phone") || lower.includes("mobile") || lower.includes("contact") || lower.includes("number")) {
          newMappings.phone = String(index);
        } else if (lower.includes("email") || lower.includes("mail")) {
          newMappings.email = String(index);
        } else if (lower.includes("company") || lower.includes("org") || lower.includes("business")) {
          newMappings.company = String(index);
        }
      });
      setMappings(newMappings);
    };
    reader.readAsText(file);
  };

  const resetCsvImport = () => {
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvDataRows([]);
    setMappings({ name: "", phone: "", email: "", company: "" });
    setErrorMsg("");
  };

  const handleBulkImport = async () => {
    if (!mappings.name || !mappings.phone) {
      setErrorMsg("Please map both Name and Phone fields.");
      return;
    }
    
    setSaving(true);
    setErrorMsg("");
    try {
      const rows = csvDataRows.map((row) => {
        const nameVal = row[Number(mappings.name)] || "";
        const phoneVal = row[Number(mappings.phone)] || "";
        const emailVal = mappings.email ? row[Number(mappings.email)] : null;
        const companyVal = mappings.company ? row[Number(mappings.company)] : null;
        
        return {
          name: nameVal.trim() || "Unnamed",
          phone: phoneVal.trim(),
          email: emailVal ? emailVal.trim() || null : null,
          company: companyVal ? companyVal.trim() || null : null,
        };
      }).filter((r) => r.phone && r.phone.trim() !== "");
      
      if (rows.length === 0) {
        setErrorMsg("No valid leads with phone numbers were found after mapping.");
        setSaving(false);
        return;
      }
      
      await api.post("/leads/bulk", { leads: rows });
      setShowBulkModal(false);
      resetCsvImport();
      load();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to import leads. Please check CSV format.");
    } finally {
      setSaving(false);
    }
  };

  const handleDispatch = async (leadId: string) => {
    setDispatching(leadId);
    try {
      await api.post("/calls/dispatch", { leadId });
      load();
    } catch { /* ignore */ }
    finally { setDispatching(null); }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm("Delete this lead?")) return;
    await api.delete(`/leads/${leadId}`);
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
      <Modal open={showBulkModal} onClose={() => { setShowBulkModal(false); resetCsvImport(); }} title="Bulk Import Leads">
        <div className="space-y-4">
          {!csvFile ? (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Select a CSV file from your computer to import your leads. You can map custom columns in the next step.
              </p>
              
              <input
                type="file"
                accept=".csv"
                className="hidden"
                id="csv-file-upload"
                onChange={handleFileSelect}
              />
              
              <label
                htmlFor="csv-file-upload"
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:bg-slate-800/20"
                style={{ borderColor: "rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.02)" }}
              >
                <span className="text-3xl mb-2">📁</span>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Upload CSV File</span>
                <span className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Drag and drop or click to select from local disk</span>
              </label>

              {errorMsg && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-xs font-medium" style={{ color: "#f87171" }}>
                  ⚠️ {errorMsg}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-lg">📄</span>
                  <div className="truncate">
                    <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{csvFile.name}</div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{csvDataRows.length} rows loaded</div>
                  </div>
                </div>
                <button
                  className="text-xs font-medium hover:underline text-red-400"
                  onClick={resetCsvImport}
                >
                  Change
                </button>
              </div>

              {/* Column Mapping */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Map CSV Columns</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "name", label: "Name *", required: true },
                    { key: "phone", label: "Phone *", required: true },
                    { key: "email", label: "Email (Optional)", required: false },
                    { key: "company", label: "Company (Optional)", required: false }
                  ].map(({ key, label, required }) => (
                    <div key={key} className="space-y-1">
                      <label className="block text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</label>
                      <select
                        className="input-dark text-xs py-1.5 px-2 w-full"
                        value={(mappings as any)[key]}
                        onChange={(e) => setMappings({ ...mappings, [key]: e.target.value })}
                      >
                        <option value="">{required ? "-- Select --" : "-- Skip --"}</option>
                        {csvHeaders.map((header, idx) => (
                          <option key={idx} value={idx}>
                            {header || `Column ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Live Preview (First 3 rows)</h4>
                {mappings.name && mappings.phone ? (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {csvDataRows.slice(0, 3).map((row, idx) => {
                      const previewName = row[Number(mappings.name)] || "Unnamed";
                      const previewPhone = row[Number(mappings.phone)] || "—";
                      const previewEmail = mappings.email ? row[Number(mappings.email)] : "";
                      const previewCompany = mappings.company ? row[Number(mappings.company)] : "";
                      
                      return (
                        <div key={idx} className="p-2 rounded border border-slate-700/30 bg-slate-800/10 text-xs space-y-0.5">
                          <div className="flex justify-between font-medium">
                            <span style={{ color: "var(--text-primary)" }}>{previewName}</span>
                            <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>{previewPhone}</span>
                          </div>
                          {(previewEmail || previewCompany) && (
                            <div className="text-[10px] flex justify-between" style={{ color: "var(--text-muted)" }}>
                              <span>{previewCompany || ""}</span>
                              <span>{previewEmail || ""}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-center rounded border border-slate-700/30 bg-slate-800/10 text-xs italic" style={{ color: "var(--text-muted)" }}>
                    Please select the columns for Name and Phone to display a live preview.
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-xs font-medium" style={{ color: "#f87171" }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Action Buttons */}
              <button
                className="btn-primary w-full justify-center mt-2"
                onClick={handleBulkImport}
                disabled={saving || !mappings.name || !mappings.phone}
              >
                {saving ? "Importing..." : `Import ${csvDataRows.length} Leads`}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
