"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, LayoutDashboard, PlusCircle, Menu, HomeIcon, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthority } from "@/contexts/AuthorityContext";

const NAV_ITEMS = [
  { name: "Home", href: "/", icon: HomeIcon },
  { name: "Admin Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Live Map", href: "/live-map", icon: MapPin },
  { name: "Report", href: "/report", icon: PlusCircle },
];

export function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { isUnlocked, lock } = useAuthority();

  return (
    <div className="md:hidden border-b border-border bg-card relative z-50">
      <div className="flex items-center justify-between p-4">
        <Link href="/" className="font-bold text-lg tracking-tight text-primary">
          NeedNow Map
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-muted-foreground focus:outline-none"
          aria-label="Toggle Navigation"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {isOpen && (
        <nav className="absolute top-full left-0 right-0 bg-card border-b border-border px-4 py-4 space-y-2 shadow-xl z-50">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
          
          {isUnlocked && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs font-semibold text-green-500 bg-green-500/10 px-3 py-2 rounded-md mb-2">
                <ShieldCheck className="h-4 w-4" />
                Authority Access Verified
              </div>
              <button
                onClick={() => {
                  lock();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
              >
                <Lock className="h-5 w-5" />
                Lock Command Centre
              </button>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
