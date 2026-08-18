import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, ShieldAlert, X, ArrowRight } from 'lucide-react';
import { verifyAdminPin } from '../services/storage';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(pinInput)) {
      setPinInput('');
      setErrorMsg(null);
      onLoginSuccess();
    } else {
      setErrorMsg('Incorrect Admin PIN. Access denied.');
      setPinInput('');
    }
  };

  const handleKeyClick = (num: string) => {
    if (pinInput.length < 8) {
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
      <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-2xl relative space-y-6 animate-scaleIn text-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 rounded-lg text-teal-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Electoral Admin Panel</h3>
              <p className="text-xs text-slate-500 font-semibold">Passcode Protected Access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="adminPin"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
            >
              Enter Admin Secret PIN
            </label>

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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 rounded-lg text-slate-900 font-mono text-center tracking-widest text-lg placeholder:text-slate-400 outline-none transition"
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
                    className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs transition border border-rose-200 cursor-pointer"
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
                    className="py-2.5 bg-[#00923f] hover:bg-[#007a34] text-white font-bold rounded-lg text-xs transition border border-emerald-600 cursor-pointer flex items-center justify-center"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeyClick(key)}
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-lg text-sm transition border border-slate-200 cursor-pointer font-mono"
                >
                  {key}
                </button>
              );
            })}
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider rounded-lg transition shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Unlock Admin Panel</span>
          </button>
        </form>
      </div>
    </div>
  );
};
