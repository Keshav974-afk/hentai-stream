import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, ArrowRight, XCircle, CheckCircle2 } from 'lucide-react';

const AGE_STORAGE_KEY = 'hentai_stream_age_verified';

export const AgeWarningModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    try {
      const verified = localStorage.getItem(AGE_STORAGE_KEY);
      if (verified !== 'true') {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }

    const handleOpenAgeGate = () => setIsOpen(true);
    window.addEventListener('open-age-warning', handleOpenAgeGate);
    return () => window.removeEventListener('open-age-warning', handleOpenAgeGate);
  }, []);

  const handleConfirm = () => {
    try {
      if (remember) {
        localStorage.setItem(AGE_STORAGE_KEY, 'true');
      } else {
        sessionStorage.setItem(AGE_STORAGE_KEY, 'true');
      }
    } catch {}
    setIsOpen(false);
  };

  const handleExit = () => {
    window.location.href = 'https://www.google.com';
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0e1015] border border-white/10 overflow-hidden p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        {/* Warning Icon Badge - Sleek matte dark with neutral border */}
        <div className="relative mx-auto w-14 h-14 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-[#E50914]" />
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-[#E50914] text-white">
            18+
          </span>
        </div>

        {/* Header Titles */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-[10px] font-semibold tracking-wider uppercase">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Age Restricted Content</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Adult Content Warning & Verification
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
            This archive contains Japanese animated adult media (hentai) with explicit themes intended exclusively for mature audiences.
          </p>
        </div>

        {/* Terms Box */}
        <div className="text-left bg-black/40 rounded-xl p-4 border border-white/5 space-y-2.5 text-xs text-zinc-300">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>You must be at least <strong>18 years of age</strong> (or the legal age of majority in your jurisdiction) to enter.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>You confirm that accessing adult animated media is lawful in your location.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>You access this content voluntarily and will not permit minors to view this screen.</p>
          </div>
        </div>

        {/* Remember choice checkbox */}
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-800 border-white/20 text-[#E50914] focus:ring-0"
            />
            <span>Remember verification on this device</span>
          </label>
        </div>

        {/* Action Buttons - Solid clean buttons without glowing halos */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm tracking-wide transition active:scale-[0.99] cursor-pointer"
          >
            <span>I AM 18 OR OLDER — ENTER</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleExit}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-semibold text-xs tracking-wide transition border border-white/5 active:scale-[0.99] cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>I AM UNDER 18 — EXIT SITE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
