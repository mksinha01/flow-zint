"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { workspacesApi } from "@/lib/api";
import { Building2, Users, Phone, Star, Target, Flame, Sun, Snowflake, Calendar, Plus, Trash2, ArrowRight, Loader2 } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-xl ${className ?? ""}`} style={{ minHeight: 20 }} />;
}

export default function WorkspacesPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const wRes = await workspacesApi.list();
      setWorkspaces(wRes.data.data?.workspaces || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const enterWorkspace = (id: string) => {
    localStorage.setItem("workspace_id", id);
    router.push(`/dashboard/workspace/${id}`);
  };

  const handleDeleteWorkspace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this workspace? This cannot be undone.")) return;
    try {
      await workspacesApi.delete(id);
      if (localStorage.getItem("workspace_id") === id) localStorage.removeItem("workspace_id");
      load();
    } catch {
      alert("Failed to delete workspace. Only the owner can delete it.");
    }
  };

  const statItems = (stats: Record<string, number>) => [
    { icon: <Users className="w-3.5 h-3.5" />, label: "Leads", value: stats.totalLeads },
    { icon: <Phone className="w-3.5 h-3.5" />, label: "Today", value: stats.callsToday },
    { icon: <Star className="w-3.5 h-3.5" />, label: "Avg Score", value: stats.avgLeadScore, color: "text-amber-500" },
    { icon: <Target className="w-3.5 h-3.5" />, label: "Success", value: `${stats.successRate}%`, color: "text-green-600" },
    { icon: <Flame className="w-3.5 h-3.5" />, label: "Hot", value: stats.hotLeads, color: "text-red-500" },
    { icon: <Sun className="w-3.5 h-3.5" />, label: "Warm", value: stats.warmLeads, color: "text-amber-500" },
    { icon: <Snowflake className="w-3.5 h-3.5" />, label: "Cold", value: stats.coldLeads, color: "text-blue-500" },
    { icon: <Calendar className="w-3.5 h-3.5" />, label: "Demos", value: stats.bookings, color: "text-indigo-600" },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#191c1e]">Workspaces Portal</h1>
        <p className="text-sm text-[#777587] mt-0.5">
          Select a workspace to manage leads, view agent performance, and configure learning loops.
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {workspaces.map((w) => {
            const stats = w.stats || {
              totalLeads: 0, totalCalls: 0, callsToday: 0, callsThisWeek: 0,
              hotLeads: 0, warmLeads: 0, coldLeads: 0, avgLeadScore: 0, bookings: 0, successRate: 0,
            };
            const items = statItems(stats);
            const initials = w.name ? w.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "WS";

            return (
              <div
                key={w.id}
                onClick={() => enterWorkspace(w.id)}
                className="card group cursor-pointer p-5 flex flex-col gap-4 hover:border-indigo-300 hover:shadow-[0_4px_12px_rgba(79,70,229,0.08)] transition-all duration-200"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      {initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#191c1e] group-hover:text-indigo-600 transition-colors leading-tight">
                        {w.name}
                      </h3>
                      <p className="text-xs text-[#777587] mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {w.businessContext?.companyName || "No business context set"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteWorkspace(w.id, e)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete workspace"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-2">
                  {items.map((item) => (
                    <div
                      key={item.label}
                      className="bg-[#f7f9fb] rounded-lg p-2.5 flex flex-col gap-1 border border-slate-100"
                    >
                      <div className="flex items-center gap-1 text-[#777587]">
                        {item.icon}
                        <span className="text-[10px] font-medium">{item.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${item.color ?? "text-[#191c1e]"}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Enter link */}
                <div className="flex items-center justify-end gap-1 text-sm font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors pt-1 border-t border-slate-100">
                  Enter Workspace
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}

          {/* Create workspace card */}
          <div
            onClick={() => router.push("/dashboard/onboarding")}
            className="cursor-pointer p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 flex flex-col items-center justify-center gap-2 text-[#777587] hover:text-indigo-600 transition-all duration-200 min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-bold text-base">Create Workspace</span>
            <span className="text-xs text-[#777587] text-center max-w-[200px]">
              Add a new environment for another business domain.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
