"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Info, AlertCircle } from "lucide-react";

export const toast = {
  success: (msg: string) => typeof document !== 'undefined' && document.dispatchEvent(new CustomEvent('global-toast', { detail: { msg, type: 'success' } })),
  info: (msg: string) => typeof document !== 'undefined' && document.dispatchEvent(new CustomEvent('global-toast', { detail: { msg, type: 'info' } })),
  error: (msg: string) => typeof document !== 'undefined' && document.dispatchEvent(new CustomEvent('global-toast', { detail: { msg, type: 'error' } })),
};

export function Toaster() {
  const [messages, setMessages] = useState<Array<{ id: number, msg: string, type: 'success'|'info'|'error' }>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handler = (e: any) => {
      const id = Date.now() + Math.random();
      setMessages(p => [...p, { id, msg: e.detail.msg, type: e.detail.type }]);
      setTimeout(() => {
        setMessages(p => p.filter(m => m.id !== id));
      }, 4000);
    };
    document.addEventListener('global-toast', handler);
    return () => document.removeEventListener('global-toast', handler);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {messages.map(m => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl pointer-events-auto min-w-[300px] ${
              m.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-100'
                : m.type === 'error'
                ? 'bg-red-950/80 border-red-500/30 text-red-100'
                : 'bg-card/90 border-border/60 text-foreground'
            }`}
          >
            {m.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : m.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-blue-400 shrink-0" />
            )}
            <p className="text-sm font-medium">{m.msg}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
