import React from 'react';
import { Shield, Lock } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  return (
    <footer className="bg-white border-t border-slate-200 px-4 sm:px-10 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 font-medium uppercase tracking-widest shrink-0 mt-auto">
      <span>© {new Date().getFullYear()} UHAS NTDs ADVOCACY CLUB (HO CHAPTER) | ELECTORAL COMMISSION</span>
      <div className="flex items-center space-x-4">
        <button
          onClick={onOpenAdmin}
          className="hover:text-slate-900 flex items-center space-x-1.5 border border-slate-200 px-3 py-1 rounded-md bg-slate-50 transition-colors text-slate-700 font-bold cursor-pointer"
        >
          <Lock className="w-3 h-3 text-[#00923f]" />
          <span>ADMIN PORTAL</span>
        </button>
        <span className="hidden md:inline text-slate-400 font-mono">ENCRYPTED BALLOT SESSION</span>
      </div>
    </footer>
  );
};
