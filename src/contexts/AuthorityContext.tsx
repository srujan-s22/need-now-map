"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthorityContextType {
  isUnlocked: boolean;
  unlock: (passcode: string) => boolean;
  lock: () => void;
  isInitialized: boolean;
}

const AuthorityContext = createContext<AuthorityContextType | undefined>(undefined);

export function AuthorityProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check session storage on mount
    const storedState = sessionStorage.getItem("authority_unlocked");
    if (storedState === "true") {
      setIsUnlocked(true);
    }
    setIsInitialized(true);
  }, []);

  const unlock = (passcode: string) => {
    const correctPasscode = process.env.NEXT_PUBLIC_AUTHORITY_PASSCODE || "demo123";
    if (passcode === correctPasscode) {
      setIsUnlocked(true);
      sessionStorage.setItem("authority_unlocked", "true");
      return true;
    }
    return false;
  };

  const lock = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem("authority_unlocked");
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
