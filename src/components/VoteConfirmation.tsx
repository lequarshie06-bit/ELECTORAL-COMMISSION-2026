import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, ShieldCheck, Heart, ArrowRight, Lock, Clock, LogOut } from 'lucide-react';

interface VoteConfirmationProps {
  onDone: () => void;
}

export const VoteConfirmation: React.FC<VoteConfirmationProps> = ({ onDone }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);

  useEffect(() => {
    // Launch celebratory confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00923f', '#00a878', '#96ca4f', '#f59e0b', '#0b2545'],
      });
    } catch (e) {
      console.log('Confetti trigger skipped', e);
    }
  }, []);

  // 1-minute (60-second) automatic logout timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDone]);

  // Format MM:SS
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${minutes}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const progressPercent = (secondsRemaining / 60) * 100;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50 text-slate-800">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm space-y-6 relative overflow-hidden animate-scaleIn">
        {/* Top Progress Bar for 1-minute auto logout */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-[#00923f] transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-slate-900 text-[#00923f] border-2 border-[#00923f] shadow-md">
          <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
        </div>

        {/* Required Confirmation Text */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00923f] font-mono">
            UHAS NTDs Advocacy club (Ho Chapter)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight uppercase">
            Vote Submitted!
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed pt-1">
            Your vote has been submitted successfully. Thank you for participating.
          </p>
        </div>

        {/* 1-Minute Auto Logout Banner */}
        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-950 font-medium">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00923f] animate-pulse shrink-0" />
            <span className="text-left">Automatic session logout:</span>
          </div>
          <span className="font-mono font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-emerald-300 shadow-2xs">
            {formatTime(secondsRemaining)}
          </span>
        </div>

        {/* Verification Token / Security Shield */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-left space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5 font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-4 h-4 text-[#00923f]" />
              Confidentiality Verification
            </span>
            <span className="font-mono text-emerald-800 text-[10px] bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-bold">
              VERIFIED
            </span>
          </div>
          <p className="text-slate-600 text-xs leading-relaxed">
            Your ballot selections have been encrypted and stored anonymously. Your Voter ID has been updated to <span className="text-emerald-700 font-mono font-bold">VOTED</span> status to prevent repeat voting.
          </p>
        </div>

        {/* NTD Advocacy Motto */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center gap-2 text-xs text-slate-700 font-medium">
          <Heart className="w-4 h-4 text-[#00923f] shrink-0" />
          <span>UHAS NTDs Advocacy • Health & Equity for All</span>
        </div>

        {/* Return / Logout Button */}
        <button
          onClick={onDone}
          className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition shadow-md flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer group"
        >
          <LogOut className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition" />
          <span>Log Out & Return to Portal ({secondsRemaining}s)</span>
        </button>

        {/* Privacy Note */}
        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-mono uppercase tracking-wider font-semibold">
          <Lock className="w-3 h-3 text-slate-500" />
          <span>Privacy Rule Active • Public tally viewing disabled</span>
        </p>
      </div>
    </div>
  );
};
