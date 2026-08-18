import React, { useState } from 'react';
import { Shield, KeyRound, AlertCircle, ArrowRight, Lock, HeartHandshake } from 'lucide-react';
import { ElectionState } from '../types';
import { validateVoterId } from '../services/storage';

interface VoterLoginProps {
  electionState: ElectionState;
  onLoginSuccess: (voterId: string) => void;
  onOpenAdmin: () => void;
}

export const VoterLogin: React.FC<VoterLoginProps> = ({
  electionState,
  onLoginSuccess,
  onOpenAdmin,
}) => {
  const [voterIdInput, setVoterIdInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = validateVoterId(voterIdInput, electionState);
    if (!validation.valid) {
      setErrorMsg(validation.errorMessage || 'Invalid Voter ID.');
      return;
    }

    if (validation.voter) {
      onLoginSuccess(validation.voter.id);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 bg-slate-50 text-slate-800">
      <div className="max-w-md w-full space-y-6">
        {/* Card Header & Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-slate-900 text-[#00923f] border-2 border-[#00923f] shadow-md">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight uppercase leading-tight">
            UHAS NTDs Advocacy club (Ho Chapter)
          </h1>
          <p className="text-xs sm:text-sm text-amber-600 font-bold max-w-xs mx-auto uppercase tracking-wider">
            Electoral Commission 2026
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm relative">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="voterId"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                <span>Unique Voter ID</span>
              </label>

              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  id="voterId"
                  value={voterIdInput}
                  onChange={(e) => {
                    setVoterIdInput(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Enter Voter ID"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 focus:border-[#00923f] focus:ring-2 focus:ring-[#00923f]/20 rounded-lg text-slate-900 font-mono placeholder:text-slate-400 text-sm sm:text-base uppercase tracking-wider transition outline-none"
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </div>

            {/* Error Message Display */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-800 text-xs sm:text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-rose-900 uppercase text-[11px] tracking-wider">Authentication Error</span>
                  <p className="font-medium">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider cursor-pointer group"
            >
              <span>Access Confidential Ballot</span>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Privacy Guarantee Note */}
          <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-slate-600 text-xs">
            <Lock className="w-4 h-4 text-[#00923f] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-900 font-bold">Strict Anonymity Guaranteed:</strong> Your Voter ID authorizes ballot access but is strictly unlinked from your candidate choices.
            </p>
          </div>
        </div>

        {/* Footer Admin Link */}
        <div className="text-center pt-1">
          <button
            onClick={onOpenAdmin}
            className="text-xs text-slate-500 hover:text-slate-900 transition flex items-center justify-center gap-1.5 mx-auto font-semibold uppercase tracking-wider cursor-pointer"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-[#00923f]" />
            <span>Admin Commission Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
