"use client";
import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { workspacesApi } from "@/lib/api";
import {
  Zap,
  LayoutDashboard,
  Users,
  Phone,
  Bot,
  Brain,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  Plus,
  TrendingUp,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const { logout, user } = useAuth();

  const [workspace, setWorkspace] = useState<{ name: string; id: string } | null>(null);

  const activeWorkspaceId =
    (params?.id as string) ||
    (typeof window !== "undefined" ? localStorage.getItem("workspace_id") : null);

  useEffect(() => {
    if (pathname === "/dashboard/onboarding") return;

    workspacesApi
      .list()
      .then((res) => {
        const wss = res.data.data.workspaces;
        if (wss && wss.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const matched = wss.find((w: any) => w.id === activeWorkspaceId);
          if (matched) {
            setWorkspace(matched);
            localStorage.setItem("workspace_id", matched.id);
          } else if (!activeWorkspaceId) {
            setWorkspace(wss[0]);
            localStorage.setItem("workspace_id", wss[0].id);
          }
        } else {
          router.push("/dashboard/onboarding");
        }
      })
      .catch(() => {});
  }, [activeWorkspaceId, pathname, router]);

  const isWorkspaceContext = pathname.includes("/dashboard/workspace/");

  const workspaceNavItems: NavItem[] = isWorkspaceContext && activeWorkspaceId
    ? [
        { href: `/dashboard/workspace/${activeWorkspaceId}`, label: "Overview", icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
        { href: `/dashboard/workspace/${activeWorkspaceId}/leads`, label: "Leads", icon: <Users className="w-[18px] h-[18px]" /> },
        { href: `/dashboard/workspace/${activeWorkspaceId}/calls`, label: "Calls", icon: <Phone className="w-[18px] h-[18px]" /> },
        { href: `/dashboard/workspace/${activeWorkspaceId}/agent`, label: "AI Agent", icon: <Bot className="w-[18px] h-[18px]" /> },
        { href: `/dashboard/workspace/${activeWorkspaceId}/learning`, label: "Learning Loop", icon: <Brain className="w-[18px] h-[18px]" /> },
      ]
    : [
        { href: "/dashboard", label: "Workspaces", icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
      ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const userInitials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0 bg-white border-r border-slate-200 z-20">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#191c1e]">FlowZint</div>
              <div className="text-[10px] text-[#777587] font-medium truncate max-w-[110px]">
                {isWorkspaceContext && workspace ? workspace.name : "Sales Intelligence"}
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/workspace/new"
            className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
            title="Create Workspace"
          >
            <Plus className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {isWorkspaceContext && (
          <div className="mb-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors rounded-md hover:bg-indigo-50"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              All Workspaces
            </Link>
            <div className="mt-3 mb-1 px-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#777587]">
                Navigation
              </span>
            </div>
          </div>
        )}

        {!isWorkspaceContext && (
          <div className="mb-1 px-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#777587]">
              General
            </span>
          </div>
        )}

        {workspaceNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive(item.href) ? "active" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
            {isActive(item.href) && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-slate-100 space-y-0.5">
        {/* Upgrade Plan */}
        <div className="mb-2">
          <button className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            <TrendingUp className="w-4 h-4" />
            Upgrade Plan
          </button>
        </div>

        <Link href="#" className="nav-item">
          <Settings className="w-[18px] h-[18px]" />
          Settings
        </Link>
        <Link href="#" className="nav-item">
          <HelpCircle className="w-[18px] h-[18px]" />
          Support
        </Link>

        {/* User info + logout */}
        <div className="mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#191c1e] truncate">{user?.name || "User"}</div>
              <div className="text-[10px] text-[#777587] truncate">{user?.email || ""}</div>
            </div>
            <button
              onClick={logout}
              className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
