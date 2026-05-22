"use client";
import { useState } from "react";
import { Bell, HelpCircle, Search, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface TopBarProps {
  onMobileMenuToggle?: () => void;
}

export default function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const { user } = useAuth();
  const [hasNotifications] = useState(true);

  const userInitials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
      {/* Mobile menu */}
      <button
        className="md:hidden p-1.5 rounded-lg text-[#777587] hover:bg-slate-100 transition-colors"
        onClick={onMobileMenuToggle}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="hidden md:flex flex-1 max-w-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#777587] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads, calls, or insights..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#f2f4f6] border border-transparent rounded-lg text-[#191c1e] placeholder:text-[#777587] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
      </div>

      {/* Mobile brand */}
      <div className="md:hidden flex-1 flex justify-center">
        <span className="text-base font-bold text-indigo-600">FlowZint</span>
      </div>

      {/* Trailing actions */}
      <div className="flex items-center gap-1">
        <button className="relative p-2 rounded-full text-[#777587] hover:text-[#191c1e] hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5" />
          {hasNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
        <button className="p-2 rounded-full text-[#777587] hover:text-[#191c1e] hover:bg-slate-100 transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
        <div className="ml-1 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold cursor-pointer hover:ring-2 hover:ring-indigo-200 transition-all">
          {userInitials}
        </div>
      </div>
    </header>
  );
}
