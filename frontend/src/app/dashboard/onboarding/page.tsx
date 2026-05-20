'use client';
import { useEffect, useState } from 'react';
import { businessApi, agentApi } from '@/lib/api';
// import type { BusinessContext } from '@/types';

const STEPS = [
  { id: 1, label: 'Business Info', icon: '🏢' },
  { id: 2, label: 'Upload Docs', icon: '📄' },
  { id: 3, label: 'Generate Agent', icon: '🤖' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const [context, setContext] = useState<Record<string, string>>({
    companyName: '', industry: '', productDescription: '',
    targetAudience: '', callObjective: '', keySellingPoints: '',
    commonObjections: '', calendarLink: '',
  });
  const [docs, setDocs] = useState<{ name: string; status: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<{ version: number; status: string } | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    businessApi.get().then(r => {
      if (r.data.data?.context) {
        setContext(r.data.data.context);
        setSaved(true);
      }
    }).catch(() => {});
  }, []);

  const saveContext = async () => {
    setSaving(true);
    try {
      await businessApi.save(context as unknown as Record<string, unknown>);
      setSaved(true);
      showToast('✅ Business info saved!');
    } catch { showToast('❌ Failed to save'); }
    finally { setSaving(false); }
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

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await agentApi.generate();
      setGeneratedConfig(r.data.data.config);
      setGenerated(true);
      showToast('✅ AI Agent generated and ready!');
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      showToast('❌ ' + (ax?.response?.data?.message || 'Failed to generate'));
    } finally { setGenerating(false); }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setContext(c => ({ ...c, [k]: e.target.value }));

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workspace Setup</h1>
          <p className="page-subtitle">Configure your AI sales agent in 3 steps</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="stepper" style={{ marginBottom: 36 }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div className="step-item" style={{ cursor: 'pointer' }} onClick={() => setStep(s.id)}>
              <div className={`step-circle ${step === s.id ? 'active' : step > s.id ? 'done' : ''}`}>
                {step > s.id ? '✓' : s.id}
              </div>
              <div className={`step-label ${step === s.id ? 'active' : step > s.id ? 'done' : ''}`}>
                {s.icon} {s.label}
              </div>
            </div>
            {i < STEPS.length - 1 && <div className="step-divider" style={{ flex: 1 }} />}
          </div>
        ))}
      </div>

      {/* Step 1 — Business Info */}
      {step === 1 && (
        <div className="glass-card" style={{ padding: 32, animation: 'fadeIn 0.3s ease' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>🏢 Business Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Company Name *</label>
                <input className="input" placeholder="Acme Corp" value={context.companyName} onChange={set('companyName')} />
              </div>
              <div className="input-group">
                <label className="input-label">Industry *</label>
                <select className="input" value={context.industry} onChange={set('industry')}>
                  <option value="">Select industry...</option>
                  {['SaaS / Software', 'Healthcare', 'Finance', 'Real Estate', 'E-commerce', 'Consulting', 'Education', 'Manufacturing', 'Other'].map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Product / Service Description *</label>
              <textarea className="input" placeholder="Describe what you sell and how it helps customers..." value={context.productDescription} onChange={set('productDescription')} style={{ minHeight: 100 }} />
            </div>

            <div className="input-group">
              <label className="input-label">Target Audience *</label>
              <input className="input" placeholder="e.g. Mid-size SaaS companies with 50-500 employees" value={context.targetAudience} onChange={set('targetAudience')} />
            </div>

            <div className="input-group">
              <label className="input-label">Call Objective *</label>
              <select className="input" value={context.callObjective} onChange={set('callObjective')}>
                <option value="">Select objective...</option>
                <option value="qualify">Qualify leads for demos</option>
                <option value="book_demo">Book product demos directly</option>
                <option value="follow_up">Follow up on proposals</option>
                <option value="upsell">Upsell existing customers</option>
                <option value="survey">Conduct market research surveys</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Key Selling Points *</label>
              <textarea className="input" placeholder="List your top 3-5 selling points, one per line..." value={context.keySellingPoints} onChange={set('keySellingPoints')} style={{ minHeight: 90 }} />
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Common Objections</label>
                <textarea className="input" placeholder="e.g. Too expensive, Not the right time..." value={context.commonObjections} onChange={set('commonObjections')} style={{ minHeight: 80 }} />
              </div>
              <div className="input-group">
                <label className="input-label">Calendar / Booking Link</label>
                <input className="input" placeholder="https://calendly.com/..." value={context.calendarLink} onChange={set('calendarLink')} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <div>{saved && <span style={{ fontSize: 13, color: 'var(--success)' }}>✅ Saved</span>}</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={saveContext} disabled={saving}>
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => { saveContext(); setStep(2); }}
                disabled={!context.companyName || !context.productDescription || saving}
              >
                Next: Upload Docs →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Document Upload */}
      {step === 2 && (
        <div className="glass-card" style={{ padding: 32, animation: 'fadeIn 0.3s ease' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>📄 Knowledge Base Documents</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
            Upload sales decks, case studies, product docs, pricing sheets (PDF, DOCX, TXT). The AI will read these to craft better conversations.
          </p>

          {/* Upload dropzone */}
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px', borderRadius: 12, border: '2px dashed var(--border)',
            cursor: 'pointer', marginBottom: 20, transition: 'border-color 0.2s',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Drop files here or click to browse</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>PDF, DOCX, TXT · Max 10MB each</div>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              style={{ display: 'none' }}
              onChange={e => {
                Array.from(e.target.files || []).forEach(uploadDoc);
                e.target.value = '';
              }}
            />
          </label>

          {/* Uploaded files list */}
          {docs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {docs.map((doc, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)'
                }}>
                  <span style={{ fontSize: 20 }}>
                    {doc.status === 'done' ? '✅' : doc.status === 'error' ? '❌' : '⏳'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{doc.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {doc.status === 'done' ? 'Processed' : doc.status === 'error' ? 'Failed' : 'Uploading...'}
                    </div>
                  </div>
                  {doc.status === 'uploading' && <div className="spinner" />}
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 13, color: 'var(--accent-light)' }}>
            💡 <strong>Tip:</strong> Documents are optional but strongly recommended. The more context you provide, the better your AI agent will perform.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)} disabled={uploading}>
              {uploading ? 'Please wait...' : 'Next: Generate Agent →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Generate Agent */}
      {step === 3 && (
        <div className="glass-card" style={{ padding: 32, animation: 'fadeIn 0.3s ease' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>🤖 Generate Your AI Agent</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>
            GPT-4o will analyze your business context and documents to create a personalized sales agent with custom scripts, qualification questions, and objection handlers.
          </p>

          {/* Preview */}
          <div style={{ display: 'grid', gap: 16, marginBottom: 28 }}>
            <div style={{ padding: '16px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Company</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{context.companyName || '—'}</div>
            </div>
            <div style={{ padding: '16px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Product</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{context.productDescription || '—'}</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, padding: '16px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Industry</div>
                <div>{context.industry || '—'}</div>
              </div>
              <div style={{ flex: 1, padding: '16px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Objective</div>
                <div>{context.callObjective || '—'}</div>
              </div>
              <div style={{ flex: 1, padding: '16px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Documents</div>
                <div>{docs.filter(d => d.status === 'done').length} uploaded</div>
              </div>
            </div>
          </div>

          {generated && generatedConfig ? (
            <div style={{ padding: '20px 24px', borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>
                🎉 Agent v{generatedConfig.version} Generated!
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {generatedConfig.status === 'ACTIVE'
                  ? 'Your agent is now active and ready to make calls.'
                  : 'Your agent is pending review. Activate it from the AI Agent page.'}
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-lg pulse-glow"
              onClick={generate}
              disabled={generating || !context.companyName || !context.productDescription}
              style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}
            >
              {generating ? (
                <><div className="spinner" style={{ width: 20, height: 20 }} /> Generating with GPT-4o...</>
              ) : '✨ Generate AI Agent'}
            </button>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
            {generated && (
              <a href="/dashboard/agent" className="btn btn-primary">View Agent Config →</a>
            )}
          </div>
        </div>
      )}

      {toast && <div className={`notification ${toast.startsWith('✅') ? 'notification-success' : 'notification-error'}`}>{toast}</div>}
    </div>
  );
}
