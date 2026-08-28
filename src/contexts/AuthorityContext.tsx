"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface AuthorityContextType {
  isUnlocked: boolean;
  unlock: (passcode: string) => Promise<boolean>;
  lock: () => Promise<void>;
  isInitialized: boolean;
}

const AuthorityContext = createContext<AuthorityContextType | undefined>(undefined);

export function AuthorityProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/authority", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        setIsUnlocked(Boolean(data.isUnlocked));
      } else {
        setIsUnlocked(false);
      }
    } catch (err) {
      console.error("Failed to check authority session:", err);
      setIsUnlocked(false);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const unlock = async (passcode: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/authority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsUnlocked(true);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Failed to unlock authority:", err);
      return false;
    }
  };

  const lock = async () => {
    try {
      await fetch("/api/auth/authority", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to lock authority session:", err);
    } finally {
      setIsUnlocked(false);
    }
  };

  return (
    <AuthorityContext.Provider value={{ isUnlocked, unlock, lock, isInitialized }}>
      {children}
    </AuthorityContext.Provider>
  );
}

export function useAuthority() {
  const context = useContext(AuthorityContext);
  if (context === undefined) {
    throw new Error("useAuthority must be used within an AuthorityProvider");
  }
  return context;
}
