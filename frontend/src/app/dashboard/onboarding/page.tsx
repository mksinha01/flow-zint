'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { businessApi, agentApi } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const [context, setContext] = useState<Record<string, string>>({
    companyName: '', industry: '', productDescription: '',
    targetAudience: '', callObjective: '', keySellingPoints: '',
    commonObjections: '', calendarLink: '',
  });
  const [docs, setDocs] = useState<{ name: string; status: string }[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState('');
  const [generated, setGenerated] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<{ version: number; status: string } | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    businessApi.get().then(r => {
      if (r.data.data?.context) {
        const c = r.data.data.context;
        setContext({
          companyName: c.companyName || '',
          industry: '',
          productDescription: c.productDescription || '',
          targetAudience: c.targetCustomer || '',
          callObjective: c.callObjective || '',
          keySellingPoints: '',
          commonObjections: '',
          calendarLink: '',
        });
      }
    }).catch(() => {});
  }, []);

  const saveContext = async () => {
    setSaving(true);
    try {
      const payload = {
        companyName: context.companyName || 'Unknown Company',
        productDescription: context.productDescription || context.industry || 'No description',
        targetCustomer: context.targetAudience || 'General Audience',
        keyPainPoints: 'Not specified',
        callObjective: 'book_demo',
        voiceStyle: 'FORMAL',
        additionalNotes: `Industry: ${context.industry}\nKey Selling Points: ${context.keySellingPoints}\nCommon Objections: ${context.commonObjections}\nCalendar: ${context.calendarLink}`
      };
      await businessApi.save(payload);
      return true;
    } catch {
      showToast('❌ Failed to save business info.');
      return false;
    } finally { setSaving(false); }
  };

  const uploadDoc = async (file: File) => {
    setUploading(true);
    const entry = { name: file.name, status: 'uploading' };
    setDocs(d => [...d, entry]);
    try {
      await businessApi.uploadDocument(file);
      setDocs(d => d.map(x => x.name === file.name ? { ...x, status: 'done' } : x));
      showToast(`✅ ${file.name} processed!`);
    } catch {
      setDocs(d => d.map(x => x.name === file.name ? { ...x, status: 'error' } : x));
      showToast(`❌ Failed to upload ${file.name}`);
    } finally { setUploading(false); }
  };

  const uploadCsv = async (file: File) => {
    setCsvFile(file);
    showToast(`✅ ${file.name} ready for import!`);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      // Step 1: Save business context
      setGeneratingStep('Saving business context...');
      const success = await saveContext();
      if (!success) throw new Error('Failed to save business context.');

      // Step 2: Call Gemini via LangChain to generate agent
      setGeneratingStep('Generating AI agent with Gemini... (this takes ~15 seconds)');
      const r = await agentApi.generate();
      setGeneratedConfig(r.data.data.config);
      setGenerated(true);

      // Step 3: Redirect to agent page to see the result
      setGeneratingStep('Agent ready! Redirecting...');
      showToast('✅ AI Agent generated! Redirecting to Agent page...');
      setTimeout(() => router.push('/dashboard/agent'), 1500);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      showToast('❌ ' + (ax?.response?.data?.message || (e as Error).message || 'Failed to generate'));
      setGeneratingStep('');
    } finally { setGenerating(false); }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setContext(c => ({ ...c, [k]: e.target.value }));

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Create a New Agent Workspace</h1>
        <p className="text-slate-500">Provide details about your business and target audience to generate a personalized AI sales agent.</p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Business Context */}
        <div className="simple-card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">1. Business Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name *</label>
              <input className="input-light" placeholder="Acme Corp" value={context.companyName} onChange={set('companyName')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Industry *</label>
              <select className="input-light" value={context.industry} onChange={set('industry')}>
                <option value="">Select industry...</option>
                <option value="SaaS / Software">SaaS / Software</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Finance">Finance</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Product Description *</label>
              <textarea className="input-light min-h-[100px]" placeholder="What do you sell? Describe it simply." value={context.productDescription} onChange={set('productDescription')} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Target Audience *</label>
              <input className="input-light" placeholder="Who are you selling to?" value={context.targetAudience} onChange={set('targetAudience')} />
            </div>
          </div>
        </div>

        {/* Step 2: Knowledge Documents */}
        <div className="simple-card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-2">2. Upload Knowledge Documents</h2>
          <p className="text-sm text-slate-500 mb-4">Upload PDFs or Word docs with product info, pricing, or sales decks.</p>
          
          <label className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 cursor-pointer transition-colors bg-slate-50">
            <div className="text-3xl mb-2">📂</div>
            <div className="text-sm font-semibold text-slate-700">Drop files here or click to browse</div>
            <div className="text-xs text-slate-500">PDF, DOCX, TXT</div>
            <input
              type="file" multiple accept=".pdf,.docx,.txt" className="hidden"
              onChange={e => { Array.from(e.target.files || []).forEach(uploadDoc); e.target.value = ''; }}
            />
          </label>

          {docs.length > 0 && (
            <div className="mt-4 space-y-2">
              {docs.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                  <span>{doc.status === 'done' ? '✅' : doc.status === 'error' ? '❌' : '⏳'}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">{doc.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 3: Target Contacts (CSV) */}
        <div className="simple-card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-2">3. Target Contacts (CSV)</h2>
          <p className="text-sm text-slate-500 mb-4">Upload a CSV containing your leads. Include columns for Name, Phone, and any custom details for personalization.</p>
          
          <label className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 cursor-pointer transition-colors bg-slate-50">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-sm font-semibold text-slate-700">Upload Leads CSV</div>
            <input
              type="file" accept=".csv" className="hidden"
              onChange={e => { if (e.target.files?.[0]) uploadCsv(e.target.files[0]); e.target.value = ''; }}
            />
          </label>
          {csvFile && (
             <div className="mt-4 p-3 rounded-lg border border-indigo-200 bg-indigo-50 flex items-center gap-2">
               <span>✅</span>
               <span className="text-sm font-medium text-indigo-800">{csvFile.name} ready for import</span>
             </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-4">
          {generated && generatedConfig ? (
             <div className="p-4 rounded-xl bg-green-50 border border-green-200 mb-4">
               <div className="font-bold text-green-800">🎉 Agent v{generatedConfig.version} Generated!</div>
               <div className="text-sm text-green-600">Redirecting you to the Agent page...</div>
             </div>
          ) : (
             <button
               className="btn-primary w-full py-4 text-lg justify-center shadow-lg shadow-indigo-200 disabled:opacity-60"
               onClick={generate}
               disabled={generating || !context.companyName || !context.productDescription}
             >
               {generating ? (
                 <span className="flex items-center justify-center gap-3">
                   <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   <span>{generatingStep || 'Processing...'}</span>
                 </span>
               ) : '✨ Generate Personalized AI Agent'}
             </button>
          )}
        </div>
      </div>
      
      {toast && (
        <div className="fixed bottom-4 right-4 p-4 rounded-lg bg-slate-800 text-white shadow-lg animate-slide-up z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

