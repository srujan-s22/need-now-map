"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, LayoutDashboard, PlusCircle, AlertTriangle, HomeIcon, Lock, Unlock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthority } from "@/contexts/AuthorityContext";

const NAV_ITEMS = [
  { name: "Home", href: "/", icon: HomeIcon },
  { name: "Admin Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Live Map", href: "/live-map", icon: MapPin },
  { name: "Report Incident", href: "/report", icon: PlusCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isUnlocked, lock } = useAuthority();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
      <div className="p-6 pb-2">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <span className="font-bold text-lg tracking-tight">NeedNow Map</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
        {isUnlocked && (
          <div className="mt-6 pt-4 border-t border-border/50 px-3">
             <div className="flex items-center gap-2 text-xs font-semibold text-green-500 bg-green-500/10 px-2 py-1.5 rounded-md">
               <ShieldCheck className="h-4 w-4" />
               Authority Access Verified
             </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-border">
        {isUnlocked ? (
          <button
            onClick={lock}
            className="w-full flex items-center justify-between p-2 rounded-md hover:bg-destructive/10 text-destructive group transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-destructive/10 flex items-center justify-center text-destructive group-hover:bg-destructive group-hover:text-white transition-colors">
                <Lock className="h-4 w-4" />
              </div>
              <div className="text-sm text-left">
                <p className="font-medium">Lock Access</p>
                <p className="text-xs text-destructive/70">Command Centre</p>
              </div>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-3 p-2">
            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
              <Unlock className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-muted-foreground">Public Mode</p>
              <p className="text-xs text-muted-foreground/70">Authorities locked</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
