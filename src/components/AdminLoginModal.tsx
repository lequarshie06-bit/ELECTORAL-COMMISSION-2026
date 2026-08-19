import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { authenticateAdminPin, loadElectionState } from '../services/storage';
import { AdminAccount } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (admin?: AdminAccount) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentState = loadElectionState();

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const result = authenticateAdminPin(pinInput, currentState);
    if (result.valid) {
      setPinInput('');
      setErrorMsg(null);
      onLoginSuccess(result.admin);
    } else {
      setErrorMsg(result.errorMessage || 'Incorrect Admin PIN / Passcode. Access denied.');
      setPinInput('');
    }
  };

  const handleKeyClick = (num: string) => {
    if (pinInput.length < 12) {
      setPinInput((prev) => prev + num);
      if (errorMsg) setErrorMsg(null);
    }
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-scaleIn text-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 rounded-xl text-[#00923f] border border-[#00923f]/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">UHAS-NTD CLUB</h3>
              <p className="text-[11px] text-amber-600 font-bold uppercase tracking-wider">ELECTORAL COMMISSION • ADMIN ACCESS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <div className="mb-1.5">
              <label
                htmlFor="adminPin"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Commission Passcode / PIN
              </label>
            </div>

            <div className="relative">
              <input
                type="password"
                id="adminPin"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:border-[#00923f] focus:ring-2 focus:ring-[#00923f]/20 rounded-xl text-slate-900 font-mono text-center tracking-widest text-xl placeholder:text-slate-400 outline-none transition"
                autoFocus
                maxLength={12}
              />
            </div>
          </div>

          {/* Quick Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '✓'].map((key) => {
              if (key === 'C') {
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={handleClear}
                    className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition border border-rose-200 cursor-pointer"
                  >
                    CLR
                  </button>
                );
              }
              if (key === '✓') {
                return (
                  <button
                    key={key}
                    type="submit"
                    className="py-2.5 bg-[#00923f] hover:bg-[#007a34] text-white font-bold rounded-xl text-xs transition border border-emerald-600 cursor-pointer flex items-center justify-center shadow-xs"
                  >
                    <ArrowRight className="w-4 h-4 text-amber-300" />
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeyClick(key)}
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-sm transition border border-slate-200 cursor-pointer font-mono"
                >
                  {key}
                </button>
              );
            })}
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Unlock Admin Panel</span>
          </button>
        </form>
      </div>
    </div>
  );
};
