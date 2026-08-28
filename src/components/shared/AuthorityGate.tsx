"use client";

import { useAuthority } from "@/contexts/AuthorityContext";
import { Lock, ShieldAlert, Key, Loader2 } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export function AuthorityGate({ children }: { children: React.ReactNode }) {
  const { isUnlocked, unlock, isInitialized } = useAuthority();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Avoid flash of login screen if it's actually unlocked.
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-full min-h-[calc(100vh-4rem)] bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode || isVerifying) return;

    setIsVerifying(true);
    setError(false);

    try {
      const success = await unlock(passcode);
      if (!success) {
        setError(true);
        setPasscode("");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full min-h-[calc(100vh-4rem)] bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/20 via-red-500 to-red-500/20" />
        
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Dashboard Access</h1>
            <p className="text-sm text-muted-foreground mt-2">
              The Admin Dashboard is restricted to authorised emergency responders only.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Key className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <input
                type="password"
                placeholder="Enter access code"
                autoFocus
                disabled={isVerifying}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-shadow disabled:opacity-50"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError(false);
                }}
              />
            </div>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500 font-medium"
              >
                Access Denied. Invalid Authorization Code.
              </motion.p>
            )}
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-medium px-4 py-3 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Verify Authorization
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border flex flex-col items-center space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            CIVIC RESPONSE PROTOCOL V1.0<br/>
            UNAUTHORIZED ACCESS IS LOGGED
          </p>
        </div>
      </motion.div>
    </div>
  );
}
