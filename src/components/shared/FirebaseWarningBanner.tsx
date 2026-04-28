"use client";

import { hasFirebaseConfig } from "@/lib/firebase";
import { AlertCircle, X } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * Non-blocking developer warning shown when Firebase env vars are missing.
 * Only visible in development mode. Dismissible by the user.
 *
 * Uses a `mounted` guard so the server and client both render `null`
 * on the initial pass — avoiding React hydration mismatches.
 */
export function FirebaseWarningBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always return null during SSR and initial hydration — prevents mismatch
  if (!mounted) return null;

  // After mount: hide if Firebase is configured, dismissed, or in production
  if (hasFirebaseConfig || dismissed || process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 text-sm flex items-start gap-3 relative">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
      <div className="flex-1">
        <p className="font-semibold text-amber-400">Firebase not configured — running in local demo mode</p>
        <p className="mt-1 text-amber-300/80 text-xs leading-relaxed">
          Add your Firebase environment variables to <code className="bg-amber-500/20 px-1 py-0.5 rounded text-amber-300">.env.local</code> to enable live Firestore sync.
          See <code className="bg-amber-500/20 px-1 py-0.5 rounded text-amber-300">.env.example</code> for the full list.
          Restart the dev server after adding values.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 hover:bg-amber-500/20 rounded transition-colors"
        aria-label="Dismiss warning"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
