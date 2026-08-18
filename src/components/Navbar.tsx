import React from 'react';
import { Shield, Lock, LogOut, CheckCircle2, UserCheck, GraduationCap } from 'lucide-react';

interface NavbarProps {
  currentVoterId: string | null;
  isAdminAuthenticated: boolean;
  onOpenAdminModal: () => void;
  onExitAdminMode: () => void;
  onLogoutVoter: () => void;
  electionLocked: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentVoterId,
  isAdminAuthenticated,
  onOpenAdminModal,
  onExitAdminMode,
  onLogoutVoter,
  electionLocked,
}) => {
  return (
    <header className="h-20 bg-slate-900 text-white flex items-center justify-between px-4 sm:px-10 border-b-4 border-[#00923f] shadow-lg shrink-0 sticky top-0 z-30">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="w-10 h-10 bg-[#00923f] rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-md shrink-0 border border-emerald-400">
          UHAS
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-sm sm:text-base tracking-tight leading-none text-white uppercase">
            UHAS NTDs Advocacy club (Ho Chapter)
          </span>
          <span className="text-[10px] sm:text-xs text-amber-400 font-bold uppercase tracking-widest mt-1">
            Electoral Commission 2026
          </span>
        </div>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center space-x-3 sm:space-x-6">
        {electionLocked && (
          <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-full font-medium border border-amber-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="hidden sm:inline">Voting Paused</span>
          </span>
        )}

        {isAdminAuthenticated ? (
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Session Mode</p>
              <p className="text-xs font-mono font-bold text-amber-400">Admin Active</p>
            </div>
            <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>
            <button
              onClick={onExitAdminMode}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-700 transition uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>Exit Admin</span>
            </button>
          </div>
        ) : currentVoterId ? (
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Voter Session</p>
              <p className="text-xs font-mono text-emerald-400 font-bold">{currentVoterId}</p>
            </div>
            <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>
            <button
              onClick={onLogoutVoter}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold border border-slate-700 transition uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Change ID</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAdminModal}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Portal</span>
          </button>
        )}
      </div>
    </header>
  );
};
