"use client";
import { clsx } from "clsx";

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
  const colors = {
    purple: "rgba(139, 92, 246, 0.1)",
    green: "rgba(34, 197, 94, 0.1)",
    red: "rgba(239, 68, 68, 0.1)",
    amber: "rgba(245, 158, 11, 0.1)",
    blue: "rgba(59, 130, 246, 0.1)",
  };
  const textColors = {
    purple: "#a78bfa",
    green: "#4ade80",
    red: "#f87171",
    amber: "#fbbf24",
    blue: "#60a5fa",
  };

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
          {title}
        </span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: colors[color], color: textColors[color] }}
        >
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </div>
      )}
      {trend && (
        <div
          className={cn("mt-2 text-[12px] font-medium flex items-center gap-1")}
          style={{ color: trend.positive ? "#4ade80" : "#f87171" }}
        >
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
  const cls = {
    HOT: "badge-hot",
    WARM: "badge-warm",
    COLD: "badge-cold",
  }[classification];
  const emoji = { HOT: "🔥", WARM: "☀️", COLD: "❄️" }[classification];
  return (
    <span className={cls}>
      {emoji} {classification}
    </span>
  );
}

// ─── SENTIMENT BADGE ──────────────────────────────────────────────────────────
interface SentimentBadgeProps {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
}

export function SentimentBadge({ sentiment }: SentimentBadgeProps) {
  const styles: Record<string, { bg: string; color: string; emoji: string }> = {
    POSITIVE: { bg: "rgba(34,197,94,0.12)", color: "#4ade80", emoji: "😊" },
    NEUTRAL: { bg: "rgba(148,163,184,0.12)", color: "#94a3b8", emoji: "😐" },
    NEGATIVE: { bg: "rgba(239,68,68,0.12)", color: "#f87171", emoji: "😞" },
  };
  const s = styles[sentiment];
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 w-fit"
      style={{
        background: s.bg,
        color: s.color,
        borderColor: s.color + "30",
      }}
    >
      {s.emoji} {sentiment}
    </span>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<string, { bg: string; color: string }> = {
    NEW: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
    CALLED: { bg: "rgba(139,92,246,0.1)", color: "#a78bfa" },
    QUALIFIED: { bg: "rgba(34,197,94,0.1)", color: "#4ade80" },
    DISQUALIFIED: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
    BOOKED: { bg: "rgba(59,130,246,0.1)", color: "#60a5fa" },
    COMPLETED: { bg: "rgba(34,197,94,0.1)", color: "#4ade80" },
    FAILED: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
    IN_PROGRESS: { bg: "rgba(245,158,11,0.1)", color: "#fbbf24" },
    QUEUED: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
    VOICEMAIL: { bg: "rgba(139,92,246,0.1)", color: "#a78bfa" },
    ACTIVE: { bg: "rgba(34,197,94,0.1)", color: "#4ade80" },
    PENDING_REVIEW: { bg: "rgba(245,158,11,0.1)", color: "#fbbf24" },
    ARCHIVED: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
    DRAFT: { bg: "rgba(139,92,246,0.1)", color: "#a78bfa" },
  };
  const s = styles[status] || { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" };
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
      style={{ background: s.bg, color: s.color, borderColor: s.color + "30" }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────
interface ScoreRingProps {
  score: number;
  size?: number;
}

export function ScoreRing({ score, size = 80 }: ScoreRingProps) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color =
    score >= 70 ? "#ef4444" : score >= 45 ? "#f59e0b" : "#3b82f6";

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - dash}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="score-label">
        <span className="text-lg font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>
          /100
        </span>
      </div>
    </div>
  );
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-lg", className)} style={{ minHeight: 20 }} />;
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa" }}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-lg p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
