'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { leadsApi, callsApi } from '@/lib/api';
import type { Lead, Call } from '@/types';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    leadsApi.get(id).then(r => setLead(r.data.data.lead)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const dispatch = async () => {
    setDispatching(true);
    try {
      await callsApi.dispatch(id);
      showToast('✅ Call dispatched!');
      const r = await leadsApi.get(id);
      setLead(r.data.data.lead);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      showToast('❌ ' + (ax?.response?.data?.message || 'Failed'));
    } finally { setDispatching(false); }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>;
  if (!lead) return <div className="empty-state"><p>Lead not found</p></div>;

  const statusColor: Record<string, string> = { NEW: '#94a3b8', CALLED: '#3b82f6', QUALIFIED: '#22c55e', DISQUALIFIED: '#ef4444' };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Link href="/dashboard/leads" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Leads</Link>
          </div>
          <h1 className="page-title">{lead.name}</h1>
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            {lead.phone && <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>📞 {lead.phone}</span>}
            {lead.email && <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>✉️ {lead.email}</span>}
            {lead.company && <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>🏢 {lead.company}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor[lead.status], display: 'inline-block' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{lead.status}</span>
          <button className="btn btn-primary" onClick={dispatch} disabled={dispatching || lead.status === 'DISQUALIFIED'}>
            {dispatching ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Dispatching...</> : '📞 Call Now'}
          </button>
        </div>
      </div>

      {/* Notes */}
      {lead.notes && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>NOTES</h3>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7 }}>{lead.notes}</p>
        </div>
      )}

      {/* Call history */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Call History ({lead.calls?.length || 0})</h2>
      {!lead.calls?.length ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-state-icon">📞</div>
            <p className="empty-state-title">No calls yet</p>
            <p className="empty-state-desc">Click "Call Now" to dispatch the first call</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {lead.calls.map((call: Call) => (
            <CallCard key={call.id} call={call} />
          ))}
        </div>
      )}

      {/* Bookings */}
      {lead.bookings && lead.bookings.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Bookings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lead.bookings.map(booking => (
              <div key={booking.id} className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>📅 Demo Scheduled</div>
                    {booking.scheduledAt && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {new Date(booking.scheduledAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <span className={`badge ${booking.confirmationEmailSent ? 'badge-success' : 'badge-neutral'}`}>
                    {booking.confirmationEmailSent ? '✉️ Email Sent' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className={`notification ${toast.startsWith('✅') ? 'notification-success' : 'notification-error'}`}>{toast}</div>
      )}
    </div>
  );
}

function CallCard({ call }: { call: Call }) {
  const a = call.analysis;
  const duration = call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : null;
  const statusColors: Record<string, string> = {
    COMPLETED: 'var(--success)', FAILED: 'var(--danger)', IN_PROGRESS: 'var(--info)', QUEUED: 'var(--text-muted)', NO_ANSWER: 'var(--warning)'
  };
  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: a ? 16 : 0 }}>
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[call.status], display: 'inline-block' }} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>{call.status.replace('_', ' ')}</span>
            {call.agentConfig && <span className="badge badge-active" style={{ fontSize: 11 }}>Agent v{call.agentConfig.version}</span>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {new Date(call.createdAt).toLocaleString()} {duration && `· ${duration}`}
          </div>
        </div>
        <Link href={`/dashboard/calls/${call.id}`} className="btn btn-secondary btn-sm">View Details →</Link>
      </div>
      {a && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(a.leadScore) }}>{a.leadScore}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lead Score</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span className={`badge badge-${a.classification?.toLowerCase()}`}>{a.classification}</span>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Class</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize', color: sentimentColor(a.sentiment) }}>{a.sentiment?.toLowerCase()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sentiment</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: a.buyingIntent ? 'var(--success)' : 'var(--text-muted)' }}>{a.buyingIntent ? '✅ Yes' : '❌ No'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Buying Intent</div>
          </div>
          {a.summary && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{a.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 70) return 'var(--success)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--danger)';
}
function sentimentColor(s: string) {
  if (s === 'POSITIVE') return 'var(--success)';
  if (s === 'NEGATIVE') return 'var(--danger)';
  return 'var(--warning)';
}
