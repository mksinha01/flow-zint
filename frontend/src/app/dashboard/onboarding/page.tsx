"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { businessApi, agentApi, leadsApi } from "@/lib/api";
import { FileText, BarChart3, Zap, CheckCircle, Loader2, X, Upload } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [context, setContext] = useState<Record<string, string>>({
    companyName: "", industry: "", productDescription: "",
    targetAudience: "", callObjective: "", keySellingPoints: "",
    commonObjections: "", calendarLink: "",
  });
  const [docs, setDocs] = useState<{ name: string; status: string }[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState("");
  const [generated, setGenerated] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<{ version: number; status: string } | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    businessApi.get().then((r) => {
      if (r.data.data?.context) {
        const c = r.data.data.context;
        setContext((prev) => ({
          ...prev,
          companyName: c.companyName || "",
          productDescription: c.productDescription || "",
          targetAudience: c.targetCustomer || "",
          callObjective: c.callObjective || "",
        }));
      }
    }).catch(() => {});
  }, []);

  const saveContext = async () => {
    setSaving(true);
    try {
      await businessApi.save({
        companyName: context.companyName || "Unknown Company",
        productDescription: context.productDescription || context.industry || "No description",
        targetCustomer: context.targetAudience || "General Audience",
        keyPainPoints: "Not specified",
        callObjective: "book_demo",
        voiceStyle: "FORMAL",
        additionalNotes: `Industry: ${context.industry}\nKey Selling Points: ${context.keySellingPoints}\nCommon Objections: ${context.commonObjections}\nCalendar: ${context.calendarLink}`,
      });
      return true;
    } catch { showToast("Failed to save business info."); return false; }
    finally { setSaving(false); }
  };

  const uploadDoc = async (file: File) => {
    setUploading(true);
    const entry = { name: file.name, status: "uploading" };
    setDocs((d) => [...d, entry]);
    try {
      await businessApi.uploadDocument(file);
      setDocs((d) => d.map((x) => (x.name === file.name ? { ...x, status: "done" } : x)));
      showToast(`${file.name} processed!`);
    } catch {
      setDocs((d) => d.map((x) => (x.name === file.name ? { ...x, status: "error" } : x)));
      showToast(`Failed to upload ${file.name}`);
    } finally { setUploading(false); }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      setGeneratingStep("Saving business context...");
      const success = await saveContext();
      if (!success) throw new Error("Failed to save");
      
      // Get workspace ID from localStorage
      const workspaceId = localStorage.getItem('workspace_id');
      if (!workspaceId) {
        showToast("Workspace not found");
        return;
      }

      if (csvFile) {
        setGeneratingStep("Importing leads from CSV...");
        try {
          const text = await csvFile.text();
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          if (lines.length > 1) {
            const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
            const leads = [];
            for (let i = 1; i < lines.length; i++) {
              const vals = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const obj: any = {};
              headers.forEach((h, idx) => {
                if (h) {
                  let key = h;
                  if (h.includes("phone") || h.includes("mobile")) key = "phone";
                  else if (h.includes("name") && !h.includes("company")) key = "name";
                  else if (h.includes("email")) key = "email";
                  else if (h.includes("company") || h.includes("org")) key = "company";
                  obj[key] = vals[idx] || "";
                }
              });
              leads.push(obj);
            }
            if (leads.length > 0) {
              try {
                await leadsApi.bulkImport(leads);
                showToast(`${leads.length} leads imported successfully!`);
              } catch (importErr: any) {
                console.error("Import API Error:", importErr);
                throw new Error(importErr.response?.data?.message || "Failed to import leads from API.");
              }
            } else {
              throw new Error("No data rows found in CSV.");
            }
          } else {
            throw new Error("CSV file is empty or missing headers.");
          }
        } catch (e: any) {
          console.error("Failed to parse/import CSV", e);
          showToast(e.message || "Failed to import leads from CSV.");
          setGenerating(false);
          return;
        }
      }

      setGeneratingStep("Generating AI agent with Gemini... (~15s)");
      const r = await agentApi.generate(workspaceId);
      setGeneratedConfig(r.data.data.config);
      setGenerated(true);
      setGeneratingStep("Agent ready! Redirecting...");
      showToast("AI Agent generated!");
      
      setTimeout(() => router.push(`/dashboard/workspace/${workspaceId}/agent`), 1500);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      showToast(ax?.response?.data?.message || (e as Error).message || "Failed to generate");
      setGeneratingStep("");
    } finally { setGenerating(false); }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setContext((c) => ({ ...c, [k]: e.target.value }));

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#191c1e]">Create a New Agent Workspace</h1>
        <p className="text-sm text-[#777587] mt-1">
          Provide details about your business and target audience to generate a personalized AI sales agent.
        </p>
      </div>

      <div className="space-y-5">
        {/* Step 1: Business Info */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-[#191c1e] mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
            Business Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#464555] mb-1.5">Company Name *</label>
              <input className="input" placeholder="Acme Corp" value={context.companyName} onChange={set("companyName")} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#464555] mb-1.5">Industry *</label>
              <select className="input" value={context.industry} onChange={set("industry")}>
                <option value="">Select industry...</option>
                <option value="SaaS / Software">SaaS / Software</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Finance">Finance</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#464555] mb-1.5">Product Description *</label>
              <textarea className="input min-h-[90px] resize-none" placeholder="What do you sell? Describe it simply." value={context.productDescription} onChange={set("productDescription")} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#464555] mb-1.5">Target Audience *</label>
              <input className="input" placeholder="Who are you selling to? e.g. B2B Sales Directors" value={context.targetAudience} onChange={set("targetAudience")} />
            </div>
          </div>
        </div>

        {/* Step 2: Knowledge Documents */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-[#191c1e] mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
            Upload Knowledge Documents
          </h2>
          <p className="text-sm text-[#777587] mb-4 ml-8">Upload PDFs or Word docs with product info, pricing, or sales decks.</p>
          <label className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 cursor-pointer transition-colors bg-slate-50 hover:bg-indigo-50/30">
            <FileText className="w-8 h-8 text-[#777587] mb-2" />
            <div className="text-sm font-semibold text-[#464555]">Drop files here or click to browse</div>
            <div className="text-xs text-[#777587] mt-0.5">PDF, DOCX, TXT</div>
            <input
              type="file" multiple accept=".pdf,.docx,.txt" className="hidden"
              onChange={(e) => { Array.from(e.target.files || []).forEach(uploadDoc); e.target.value = ""; }}
            />
          </label>
          {docs.length > 0 && (
            <div className="mt-4 space-y-2">
              {docs.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                  {doc.status === "done" ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : doc.status === "error" ? (
                    <X className="w-4 h-4 text-red-500 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                  )}
                  <span className="text-sm font-medium text-[#464555] truncate">{doc.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 3: CSV */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-[#191c1e] mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">3</span>
            Target Contacts (CSV)
          </h2>
          <p className="text-sm text-[#777587] mb-4 ml-8">Upload a CSV containing your leads with Name, Phone, and custom columns.</p>
          <label className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 cursor-pointer transition-colors bg-slate-50 hover:bg-indigo-50/30">
            <Upload className="w-8 h-8 text-[#777587] mb-2" />
            <div className="text-sm font-semibold text-[#464555]">Upload Leads CSV</div>
            <input type="file" accept=".csv" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) setCsvFile(e.target.files[0]); e.target.value = ""; }}
            />
          </label>
          {csvFile && (
            <div className="mt-4 p-3 rounded-lg border border-indigo-200 bg-indigo-50 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-700">{csvFile.name} ready for import</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="pt-2">
          {generated && generatedConfig ? (
            <div className="p-5 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <div className="font-bold text-green-800">Agent v{generatedConfig.version} Generated!</div>
                <div className="text-sm text-green-600">Redirecting you to the Agent page...</div>
              </div>
            </div>
          ) : (
            <button
              className="btn-primary w-full py-3.5 text-base justify-center shadow-lg shadow-indigo-100"
              onClick={generate}
              disabled={generating || !context.companyName || !context.productDescription}
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 animate-spin" />{generatingStep || "Processing..."}</>
              ) : (
                <><Zap className="w-5 h-5" /> Generate Personalized AI Agent</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 px-4 py-3 rounded-xl bg-[#191c1e] text-white text-sm font-medium shadow-xl slide-up z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
