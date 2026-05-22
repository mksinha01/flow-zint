"use client";
import { clsx } from "clsx";
import { Flame, Sun, Snowflake, X } from "lucide-react";

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return clsx(inputs);
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color?: "purple" | "green" | "red" | "amber" | "blue";
}

export function StatCard({ title, value, subtitle, icon, trend, color = "purple" }: StatCardProps) {
  const iconStyles = {
    purple: { bg: "bg-indigo-50", text: "text-indigo-600" },
    green:  { bg: "bg-green-50",  text: "text-green-600" },
    red:    { bg: "bg-red-50",    text: "text-red-500" },
    amber:  { bg: "bg-amber-50",  text: "text-amber-500" },
    blue:   { bg: "bg-blue-50",   text: "text-blue-600" },
  };
  const s = iconStyles[color];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#777587]">{title}</span>
        <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.text} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-[#191c1e]">{value}</div>
      {subtitle && <div className="mt-0.5 text-xs text-[#777587]">{subtitle}</div>}
      {trend && (
        <div className={cn("mt-2 text-xs font-medium flex items-center gap-1", trend.positive ? "text-green-600" : "text-red-500")}>
          {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}% vs last week
        </div>
      )}
    </div>
  );
}

// ─── LEAD BADGE ───────────────────────────────────────────────────────────────
interface LeadBadgeProps {
  classification: "HOT" | "WARM" | "COLD";
}

export function LeadBadge({ classification }: LeadBadgeProps) {
  if (classification === "HOT") return <span className="badge-hot"><Flame className="w-2.5 h-2.5" /> HOT</span>;
  if (classification === "WARM") return <span className="badge-warm"><Sun className="w-2.5 h-2.5" /> WARM</span>;
  return <span className="badge-cold"><Snowflake className="w-2.5 h-2.5" /> COLD</span>;
}

// ─── SENTIMENT BADGE ──────────────────────────────────────────────────────────
interface SentimentBadgeProps {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
}

export function SentimentBadge({ sentiment }: SentimentBadgeProps) {
  const styles: Record<string, { cls: string; emoji: string }> = {
    POSITIVE: { cls: "bg-green-50 text-green-700 border-green-200", emoji: "😊" },
    NEUTRAL:  { cls: "bg-slate-100 text-slate-600 border-slate-200", emoji: "😐" },
    NEGATIVE: { cls: "bg-red-50 text-red-600 border-red-200", emoji: "😞" },
  };
  const s = styles[sentiment] ?? styles.NEUTRAL;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 w-fit ${s.cls}`}>
      {s.emoji} {sentiment}
    </span>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: "bg-slate-100 text-slate-600 border-slate-200",
    CALLED: "bg-indigo-50 text-indigo-600 border-indigo-200",
    QUALIFIED: "bg-green-50 text-green-700 border-green-200",
    DISQUALIFIED: "bg-red-50 text-red-600 border-red-200",
    BOOKED: "bg-blue-50 text-blue-600 border-blue-200",
    COMPLETED: "bg-green-50 text-green-700 border-green-200",
    FAILED: "bg-red-50 text-red-600 border-red-200",
    IN_PROGRESS: "bg-amber-50 text-amber-600 border-amber-200",
    QUEUED: "bg-slate-100 text-slate-600 border-slate-200",
    VOICEMAIL: "bg-indigo-50 text-indigo-600 border-indigo-200",
    ACTIVE: "bg-green-50 text-green-700 border-green-200",
    PENDING_REVIEW: "bg-amber-50 text-amber-600 border-amber-200",
    ARCHIVED: "bg-slate-100 text-slate-500 border-slate-200",
    DRAFT: "bg-indigo-50 text-indigo-600 border-indigo-200",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${styles[status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────
export function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#ef4444" : score >= 45 ? "#f59e0b" : "#3b82f6";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - dash}
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{score}</span>
        <span className="text-[9px] font-medium text-[#777587]">/100</span>
      </div>
    </div>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-lg", className)} style={{ minHeight: 20 }} />;
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon, title, description, action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-2xl">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-[#191c1e] mb-1">{title}</h3>
        <p className="text-sm text-[#777587]">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
export function Modal({
  open, onClose, title, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-[#191c1e]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#777587] hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
