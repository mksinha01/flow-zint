"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { workspacesApi } from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⚡" },
  { href: "/dashboard/leads", label: "Leads", icon: "👥" },
  { href: "/dashboard/calls", label: "Calls", icon: "📞" },
  { href: "/dashboard/agent", label: "AI Agent", icon: "🤖" },
  { href: "/dashboard/learning", label: "Learning Loop", icon: "🧠" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [workspace, setWorkspace] = useState<{name: string, id: string} | null>(null);

  useEffect(() => {
    if (pathname === "/dashboard/workspace/new") return;

    workspacesApi.list().then(res => {
      const wss = res.data.data.workspaces;
      if (wss && wss.length > 0) {
        setWorkspace(wss[0]);
        localStorage.setItem("workspace_id", wss[0].id);
      } else {
        router.push("/dashboard/workspace/new");
      }
    }).catch(() => {});
  }, [pathname, router]);

  const handleLogout = () => {
    logout();
  };

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{
        background: "rgba(10,10,20,0.95)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div className="p-5 mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              boxShadow: "0 0 20px rgba(139,92,246,0.4)",
            }}
          >
            ⚡
          </div>
          <div>
            <div className="text-base font-bold gradient-text">FlowZint</div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {workspace ? workspace.name : "AI Sales Platform"}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        <div className="mb-3 px-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Main
          </span>
        </div>
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`sidebar-item ${isActive ? "active" : ""}`}>
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: "#a78bfa" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-left"
          style={{ color: "#f87171" }}
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
