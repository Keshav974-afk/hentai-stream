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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050608]/90 backdrop-blur-2xl animate-fade-in"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-carbon-900/95 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden p-6 sm:p-8 text-center space-y-6">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-cinema-red/20 rounded-full blur-3xl pointer-events-none" />

        {/* Warning Icon Badge */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-b from-cinema-red/30 to-carbon-850 border border-cinema-red/40 flex items-center justify-center shadow-lg shadow-cinema-red/20">
          <ShieldAlert className="w-9 h-9 text-cinema-red" />
          <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-cinema-red text-white shadow-md">
            18+
          </span>
        </div>

        {/* Header Titles */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cinema-red/10 border border-cinema-red/25 text-cinema-red text-[11px] font-bold tracking-wider uppercase mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Mature Content Notice</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Adult Content & Age Verification
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
            This streaming archive contains animated adult media (hentai) with sexually explicit themes intended solely for mature audiences.
          </p>
        </div>

        {/* Terms Box */}
        <div className="text-left bg-carbon-850/80 rounded-xl p-3.5 sm:p-4 border border-white/5 space-y-2.5 text-xs text-gray-300">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>You must be at least <strong>18 years of age</strong> (or legal majority in your country) to enter.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>You confirm that adult animated material is legal to view in your jurisdiction.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>You are accessing this content voluntarily and will not permit minors to access this screen.</p>
          </div>
        </div>

        {/* Remember choice checkbox */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded bg-carbon-800 border-white/20 text-cinema-red focus:ring-cinema-red focus:ring-offset-0"
            />
            <span>Remember my confirmation on this device</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-cinema-red hover:bg-[#ff1e2b] text-white font-bold text-sm tracking-wide transition shadow-lg shadow-cinema-red/25 hover:shadow-cinema-red/40 active:scale-[0.99] cursor-pointer"
          >
            <span>I AM 18 OR OLDER — ENTER</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleExit}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium text-xs border border-white/10 transition cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>I Am Under 18 / Exit</span>
          </button>
        </div>

        {/* Legal Micro-notice */}
        <p className="text-[10px] text-gray-500 leading-normal">
          Complies with 18 U.S.C. 2257 record-keeping requirements. All characters depicted are fictional and are portrayed as 18 years of age or older.
        </p>
      </div>
    </div>
  );
};
