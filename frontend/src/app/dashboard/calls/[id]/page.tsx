'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { callsApi } from '@/lib/api';
import type { Call, Objection } from '@/types';

export default function CallDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analysis' | 'transcript'>('analysis');

  useEffect(() => {
    callsApi.get(id).then(r => setCall(r.data.data.call)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>;
  if (!call) return <div className="empty-state"><p>Call not found</p></div>;

  const a = call.analysis;
  const duration = call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : '—';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Link href="/dashboard/calls" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Calls</Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <Link href={`/dashboard/leads/${call.leadId}`} style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>{call.lead?.name}</Link>
          </div>
          <h1 className="page-title">Call Detail</h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📞 {call.lead?.name}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>⏱ {duration}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📅 {new Date(call.createdAt).toLocaleString()}</span>
            {call.agentConfig && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>🤖 Agent v{call.agentConfig.version}</span>}
          </div>
        </div>
        <StatusBadge status={call.status} />
      </div>

      {/* Recording */}
      {call.recordingUrl && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>RECORDING</h3>
          <audio controls style={{ width: '100%', filter: 'invert(1) hue-rotate(180deg)' }}>
            <source src={call.recordingUrl} />
          </audio>
        </div>
      )}

      {/* Analysis + Transcript tabs */}
      {(a || call.transcript) && (
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
            {(['analysis', 'transcript'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                disabled={t === 'transcript' && !call.transcript}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
                  background: activeTab === t ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: activeTab === t ? 'var(--accent-light)' : 'var(--text-secondary)',
                  opacity: (t === 'transcript' && !call.transcript) ? 0.4 : 1,
                }}
              >
                {t === 'analysis' ? '📊 Analysis' : '📝 Transcript'}
              </button>
            ))}
          </div>

          {activeTab === 'analysis' && a ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Score + Classification + Sentiment */}
              <div className="grid-3">
                <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
                  <ScoreRing score={a.leadScore} />
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>Lead Score</div>
                </div>
                <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <span className={`badge badge-${a.classification?.toLowerCase()}`} style={{ fontSize: 16, padding: '8px 20px' }}>
                    {classEmoji(a.classification)} {a.classification}
                  </span>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Classification</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.buyingIntent ? 'var(--success)' : 'var(--danger)' }} />
                    <span style={{ fontSize: 13 }}>{a.buyingIntent ? 'Buying intent detected' : 'No buying intent'}</span>
                  </div>
                </div>
                <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ fontSize: 32 }}>{sentimentEmoji(a.sentiment)}</div>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize', color: sentimentColor(a.sentiment) }}>{a.sentiment?.toLowerCase()}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Sentiment</div>
                </div>
              </div>

              {/* Summary */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>CALL SUMMARY</h3>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-primary)' }}>{a.summary}</p>
              </div>

              {/* Objections */}
              {a.objections && (a.objections as Objection[]).length > 0 && (
                <div className="glass-card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    OBJECTIONS DETECTED ({(a.objections as Objection[]).length})
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(a.objections as Objection[]).map((obj, i) => (
                      <span key={i} style={{
                        padding: '6px 14px', borderRadius: 99,
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#fca5a5', fontSize: 13
                      }}>
                        💬 {obj.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'analysis' ? (
            <div className="glass-card">
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <p className="empty-state-title">Analysis not yet available</p>
                <p className="empty-state-desc">The call must complete before analysis runs</p>
              </div>
            </div>
          ) : null}

          {activeTab === 'transcript' && call.transcript && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>TRANSCRIPT</h3>
              <TranscriptViewer transcript={call.transcript} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="score-ring" style={{ width: 110, height: 110, margin: '0 auto' }}>
      <svg width="110" height="110">
        <circle cx="55" cy="55" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
        <circle
          cx="55" cy="55" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="score-ring-text">
        <div style={{ fontSize: 28, fontWeight: 800, color }}>{score}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ 100</div>
      </div>
    </div>
  );
}

function TranscriptViewer({ transcript }: { transcript: string }) {
  const lines = transcript.split('\n').filter(Boolean);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
      {lines.map((line, i) => {
        const isAgent = line.toLowerCase().startsWith('agent:') || line.toLowerCase().startsWith('ai:');
        return (
          <div key={i} style={{ display: 'flex', gap: 12, justifyContent: isAgent ? 'flex-start' : 'flex-end' }}>
            {isAgent && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, marginTop: 2 }}>🤖</div>
            )}
            <div style={{
              maxWidth: '70%', padding: '10px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.6,
              background: isAgent ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isAgent ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              {line.replace(/^(agent:|ai:|customer:|lead:)/i, '').trim()}
            </div>
            {!isAgent && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, marginTop: 2 }}>👤</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    QUEUED: 'badge-neutral', IN_PROGRESS: 'badge-info', COMPLETED: 'badge-success',
    FAILED: 'badge-danger', NO_ANSWER: 'badge-neutral',
  };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status.replace('_', ' ')}</span>;
}

function classEmoji(c: string) { return c === 'HOT' ? '🔥' : c === 'WARM' ? '🌡️' : '🧊'; }
function sentimentEmoji(s: string) { return s === 'POSITIVE' ? '😊' : s === 'NEGATIVE' ? '😞' : '😐'; }
function sentimentColor(s: string) {
  if (s === 'POSITIVE') return 'var(--success)';
  if (s === 'NEGATIVE') return 'var(--danger)';
  return 'var(--warning)';
}
