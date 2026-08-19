import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  RotateCcw,
  Plus,
  Download,
  Dices,
  ShieldCheck,
  Search,
  X,
  AlertTriangle,
  AlertCircle,
  Award,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  Image as ImageIcon,
  Edit,
  Trash2,
  Save,
  User,
  Settings,
  Mail,
  PieChart as PieChartIcon,
  UserX,
  CheckSquare,
  Square,
  FileText,
  Quote,
  BookOpen,
  Menu,
  ChevronRight,
  Cloud,
  LogOut,
  LayoutDashboard,
  Key,
  KeyRound,
} from 'lucide-react';
import { Candidate, ElectionState, Position, PositionId, Voter, AdminAccount } from '../types';
import { VoterEmailBroadcast } from './VoterEmailBroadcast';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ElectionCountdown } from './ElectionCountdown';
import {
  resetElectionData,
  seedDemoVotes,
  toggleVotingLock,
  addNewVoterId,
  deleteVoterId,
  batchGenerateVoterIds,
  saveCandidate,
  deleteCandidate,
  savePosition,
  deletePosition,
  verifyAdminPin,
  clearAllVoters,
  deleteSpecificVoters,
  updateAdminPin,
  resetAdminPinToDefault,
  addAdministrator,
  deleteAdministrator,
  setElectionTimer,
  isElectionTimeExpired,
  DEFAULT_ADMINS,
} from '../services/storage';
import { compressCandidatePhoto } from '../utils/imageCompressor';

interface AdminDashboardProps {
  electionState: ElectionState;
  onRefreshState: (newState: ElectionState) => void;
  onExitAdmin: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  electionState,
  onRefreshState,
  onExitAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'results' | 'candidates' | 'audit' | 'roster' | 'email_broadcast' | 'timer' | 'officers' | 'controls'
  >('analytics');
  const [voterSearch, setVoterSearch] = useState('');
  const [voterFilter, setVoterFilter] = useState<'ALL' | 'VOTED' | 'PENDING'>('ALL');

  // Mobile Sidebar Drawer State
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Selected Voter IDs for Bulk Unregistration
  const [selectedVoterIds, setSelectedVoterIds] = useState<string[]>([]);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearAllConfirmPin, setClearAllConfirmPin] = useState('');
  const [clearAllError, setClearAllError] = useState<string | null>(null);

  // Candidate & Position Editing State
  const [editingCandidate, setEditingCandidate] = useState<Partial<Candidate> | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [voterToDelete, setVoterToDelete] = useState<string | null>(null);
  const [candidatePosFilter, setCandidatePosFilter] = useState<string>('all');
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [candidateMsg, setCandidateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState<string | null>(null); // candidateId or 'modal'
  const [photoSuccessToast, setPhotoSuccessToast] = useState<string | null>(null);

  // Position Editing State
  const [editingPosition, setEditingPosition] = useState<Partial<Position> | null>(null);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);
  const [positionModalOpen, setPositionModalOpen] = useState(false);

  // Roster addition forms state
  const [newVoterInput, setNewVoterInput] = useState('');
  const [rosterMsg, setRosterMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Batch generate state
  const [batchStart, setBatchStart] = useState(201);
  const [batchEnd, setBatchEnd] = useState(220);

  // Reset confirmation state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  // Admin PIN management state
  const [adminPinModalOpen, setAdminPinModalOpen] = useState(false);
  const [selectedAdminForPin, setSelectedAdminForPin] = useState<AdminAccount | null>(null);
  const [pinCurrentInput, setPinCurrentInput] = useState('');
  const [pinNewInput, setPinNewInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [pinManagementMsg, setPinManagementMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Administrator Modal & Form State
  const [addAdminModalOpen, setAddAdminModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('Electoral Commissioner');
  const [newAdminPin, setNewAdminPin] = useState('0000');
  const [addAdminMsg, setAddAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<AdminAccount | null>(null);

  // Election Timer State
  const [timerDateTimeInput, setTimerDateTimeInput] = useState<string>(() => {
    if (electionState.config.electionEndTime) {
      try {
        const d = new Date(electionState.config.electionEndTime);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      } catch {
        return '';
      }
    }
    return '';
  });
  const [timerMsg, setTimerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { voters, votes, candidates, positions, config, admins } = electionState;
  const currentAdmins: AdminAccount[] = admins && admins.length > 0 ? admins : DEFAULT_ADMINS;

  // Turnout Stats Calculation
  const allVoterList: Voter[] = Object.values(voters);
  const totalVotersCount = allVoterList.length;
  const votedCount = allVoterList.filter((v) => v.status === 'VOTED').length;
  const pendingCount = totalVotersCount - votedCount;
  const turnoutPercentage = totalVotersCount > 0 ? ((votedCount / totalVotersCount) * 100).toFixed(1) : '0.0';

  // Real-time vote tallies per position & candidate
  const getCandidateTally = (candidateId: string) => {
    return votes.filter((v) => {
      return Object.values(v.selections).includes(candidateId);
    }).length;
  };

  const getPositionTotalVotes = (positionId: string) => {
    return votes.filter((v) => Boolean(v.selections[positionId])).length;
  };

  // Filtered voters list for Audit Tab
  const filteredVoters = allVoterList.filter((v) => {
    const term = voterSearch.toLowerCase().trim();
    const matchesSearch =
      v.id.toLowerCase().includes(term) ||
      (v.firstName && v.firstName.toLowerCase().includes(term)) ||
      (v.email && v.email.toLowerCase().includes(term));
    if (voterFilter === 'VOTED') return matchesSearch && v.status === 'VOTED';
    if (voterFilter === 'PENDING') return matchesSearch && v.status === 'PENDING';
    return matchesSearch;
  });

  // Action handlers
  const handleToggleLock = () => {
    const updated = toggleVotingLock();
    onRefreshState(updated);
  };

  const handleSeedVotes = (count: number) => {
    const updated = seedDemoVotes(count);
    onRefreshState(updated);
  };

  const handleAddVoter = (e: React.FormEvent) => {
    e.preventDefault();
    setRosterMsg(null);
    const res = addNewVoterId(newVoterInput);
    if (res.success && res.state) {
      setRosterMsg({ type: 'success', text: res.message });
      setNewVoterInput('');
      onRefreshState(res.state);
    } else {
      setRosterMsg({ type: 'error', text: res.message });
    }
  };

  const handleBatchGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setRosterMsg(null);
    const res = batchGenerateVoterIds(batchStart, batchEnd);
    setRosterMsg({
      type: 'success',
      text: `Successfully generated ${res.count} new Voter IDs.`,
    });
    onRefreshState(res.state);
  };

  const handleDeleteVoterIdAction = (voterId: string) => {
    setVoterToDelete(voterId);
  };

  const confirmDeleteVoter = () => {
    if (!voterToDelete) return;
    const newState = deleteVoterId(voterToDelete);
    onRefreshState(newState);
    setVoterToDelete(null);
  };

  const handleExecuteReset = () => {
    if (!verifyAdminPin(resetConfirmPin)) {
      setResetError('Incorrect Admin PIN.');
      return;
    }
    const freshState = resetElectionData();
    onRefreshState(freshState);
    setShowResetModal(false);
    setResetConfirmPin('');
    setResetError(null);
  };

  // Image File Uploader to Base64 with automatic lightweight compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsPhotoUploading('modal');
      try {
        const compressedDataUrl = await compressCandidatePhoto(file, 450, 450, 0.82);
        setEditingCandidate((prev) => ({
          ...prev,
          photoUrl: compressedDataUrl,
          photoRequiresVerification: false,
        }));
      } catch (err) {
        console.error('Photo compression error', err);
      } finally {
        setIsPhotoUploading(null);
      }
    }
  };

  // Direct quick photo upload from candidate cards with automatic lightweight compression
  const handleQuickCandidatePhotoUpload = async (candidate: Candidate, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsPhotoUploading(candidate.id);
      try {
        const compressedDataUrl = await compressCandidatePhoto(file, 450, 450, 0.82);
        const updatedCandidate: Candidate = {
          ...candidate,
          photoUrl: compressedDataUrl,
          photoRequiresVerification: false,
        };
        const res = saveCandidate(updatedCandidate);
        if (res.success && res.state) {
          onRefreshState(res.state);
          setPhotoSuccessToast(`Photo saved successfully for ${candidate.name}!`);
          setTimeout(() => setPhotoSuccessToast(null), 3500);
        } else {
          alert(res.message || 'Failed to save photo.');
        }
      } catch (err) {
        console.error('Quick photo upload failed', err);
      } finally {
        setIsPhotoUploading(null);
      }
    }
  };

  // Candidate Save Handler
  const handleSaveCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate?.name || !editingCandidate?.positionId) {
      setCandidateMsg({ type: 'error', text: 'Please fill in candidate name and select a position.' });
      return;
    }

    let photoToSave = editingCandidate.photoUrl || '';
    if (photoToSave && photoToSave.startsWith('data:image/') && photoToSave.length > 200000) {
      try {
        photoToSave = await compressCandidatePhoto(photoToSave, 450, 450, 0.82);
      } catch (err) {
        console.warn('Could not re-compress photo', err);
      }
    }

    const candidateToSave: Candidate = {
      id: editingCandidate.id || `cand-${Date.now()}`,
      name: editingCandidate.name,
      positionId: editingCandidate.positionId,
      titleAndDept: editingCandidate.titleAndDept || (editingCandidate.school ? `${editingCandidate.school}${editingCandidate.level ? ` • ${editingCandidate.level}` : ''}` : 'Candidate'),
      school: editingCandidate.school,
      level: editingCandidate.level,
      photoUrl: photoToSave,
      manifesto: editingCandidate.manifesto || '',
      photoRequiresVerification: false,
    };

    const res = saveCandidate(candidateToSave);
    if (res.success && res.state) {
      onRefreshState(res.state);
      setCandidateModalOpen(false);
      setEditingCandidate(null);
      setCandidateMsg(null);
      setPhotoSuccessToast(`Candidate profile saved successfully!`);
      setTimeout(() => setPhotoSuccessToast(null), 3500);
    } else {
      setCandidateMsg({ type: 'error', text: res.message });
    }
  };

  const handleDeleteCandidateAction = (candidate: Candidate) => {
    setCandidateToDelete(candidate);
  };

  const confirmDeleteCandidate = () => {
    if (!candidateToDelete) return;
    const newState = deleteCandidate(candidateToDelete.id);
    if (newState) {
      onRefreshState(newState);
    }
    setCandidateToDelete(null);
  };

  // Position Handlers
  const handleDeletePositionAction = (pos: Position) => {
    setPositionToDelete(pos);
  };

  const confirmDeletePosition = () => {
    if (!positionToDelete) return;
    const newState = deletePosition(positionToDelete.id);
    if (newState) {
      onRefreshState(newState);
    }
    setPositionToDelete(null);
  };

  const handleSavePositionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPosition?.title?.trim()) {
      return;
    }

    const posId =
      editingPosition.id ||
      `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const posToSave: Position = {
      id: posId,
      title: editingPosition.title.trim(),
      description: editingPosition.description?.trim() || '',
      maxCandidates: Number(editingPosition.maxCandidates) || 4,
    };

    const newState = savePosition(posToSave);
    if (newState) {
      onRefreshState(newState);
      setPositionModalOpen(false);
      setEditingPosition(null);
    }
  };

  // Export Unique Voter Codes CSV
  const handleDownloadVoterCodesCSV = () => {
    let csv = 'Voter ID,Status,Voted Timestamp\n';
    allVoterList.forEach((v) => {
      csv += `${v.id},${v.status},${v.votedAt || ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UHAS_NTD_Voter_Codes_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Comprehensive CSV Election Audit Report Exporter
  const handleExportCSV = () => {
    let csv = 'UHAS NTDs ADVOCACY CLUB (HO CHAPTER) - ELECTORAL COMMISSION 2026 REPORT\n';
    csv += `Export Timestamp: ${new Date().toLocaleString()}\n`;
    csv += `Total Voters: ${totalVotersCount}, Total Votes Cast: ${votedCount}, Turnout: ${turnoutPercentage}%\n\n`;

    csv += '--- RESULTS TALLY PER POSITION ---\n';
    positions.forEach((pos) => {
      csv += `Position: ${pos.title} (Max Candidates: ${pos.maxCandidates || 'Unlimited'})\n`;
      const posCandidates = candidates.filter((c) => c.positionId === pos.id);
      const totalPosVotes = getPositionTotalVotes(pos.id);

      posCandidates.forEach((c) => {
        const count = getCandidateTally(c.id);
        const pct = totalPosVotes > 0 ? ((count / totalPosVotes) * 100).toFixed(1) : '0';
        csv += `Candidate: "${c.name}", Department: "${c.titleAndDept}", Votes: ${count}, Share: ${pct}%\n`;
      });
      csv += '\n';
    });

    csv += '--- AUTHORIZED VOTERS LIST ---\n';
    csv += 'Voter ID,Status,Timestamp\n';
    allVoterList.forEach((v) => {
      csv += `${v.id},${v.status},${v.votedAt || 'N/A'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UHAS_NTDs_Advocacy_Club_Ho_Chapter_Election_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Voter Selection and Unregistration Handlers
  const handleToggleSelectAllVoters = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allFilteredIds = filteredVoters.map((v) => v.id);
      setSelectedVoterIds(allFilteredIds);
    } else {
      setSelectedVoterIds([]);
    }
  };

  const handleToggleSelectVoter = (voterId: string) => {
    setSelectedVoterIds((prev) =>
      prev.includes(voterId) ? prev.filter((id) => id !== voterId) : [...prev, voterId]
    );
  };

  const handleDeleteSelectedVoters = () => {
    if (selectedVoterIds.length === 0) return;
    if (
      window.confirm(
        `Are you sure you want to unregister ${selectedVoterIds.length} selected voter(s)? This will remove them from the election roster.`
      )
    ) {
      const updatedState = deleteSpecificVoters(selectedVoterIds);
      onRefreshState(updatedState);
      setSelectedVoterIds([]);
    }
  };

  const handleClearAllVotersSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClearAllError(null);

    if (clearAllConfirmPin !== '2026') {
      setClearAllError('Invalid Electoral Security PIN. Clear action cancelled.');
      return;
    }

    const updatedState = clearAllVoters();
    onRefreshState(updatedState);
    setSelectedVoterIds([]);
    setShowClearAllModal(false);
    setClearAllConfirmPin('');
    alert('All registered voters have been successfully cleared and unregistered.');
  };

  const navItems = [
    {
      id: 'analytics' as const,
      label: 'Analytics & Turnout',
      description: 'Live charts & demographic metrics',
      icon: PieChartIcon,
      badge: `${turnoutPercentage}%`,
      badgeColor: 'bg-emerald-100 text-[#00923f]',
    },
    {
      id: 'results' as const,
      label: 'Live Election Results',
      description: 'Vote tallies & winner standings',
      icon: BarChart3,
      badge: `${votes.length} Votes`,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      id: 'candidates' as const,
      label: 'Nominees & Photos',
      description: 'Candidate cards, photos & limits',
      icon: Users,
      badge: `${candidates.filter((c) => !!c.photoUrl).length}/${candidates.length}`,
      badgeColor: 'bg-emerald-100 text-emerald-900',
    },
    {
      id: 'audit' as const,
      label: 'Voter Register & Audit',
      description: 'Search, filter, and unregister',
      icon: ShieldCheck,
      badge: `${totalVotersCount}`,
      badgeColor: 'bg-slate-100 text-slate-800',
    },
    {
      id: 'roster' as const,
      label: 'Roster & ID Generator',
      description: 'Add new voter passcodes & batch codes',
      icon: Plus,
    },
    {
      id: 'email_broadcast' as const,
      label: 'File Upload & Broadcast',
      description: 'CSV/Excel voter ingest & notifications',
      icon: Mail,
    },
    {
      id: 'timer' as const,
      label: 'Election Timer & Schedule',
      description: 'Countdown timer & auto-conclude polls',
      icon: Clock,
      badge: config.electionTimerActive ? 'Active' : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-900',
    },
    {
      id: 'officers' as const,
      label: 'Commission Chair & Officers',
      description: 'Add administrators & manage PINs',
      icon: UserCheck,
      badge: `${currentAdmins.length} Admins`,
      badgeColor: 'bg-slate-100 text-slate-800',
    },
    {
      id: 'controls' as const,
      label: 'Security & System Controls',
      description: 'Pause election, demo data & factory reset',
      icon: Settings,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6 text-slate-800">
      {/* Mobile Top Navigation Header */}
      <div className="lg:hidden bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-center justify-between gap-3 sticky top-16 z-30">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
        >
          <Menu className="w-4 h-4 text-emerald-400" />
          <span>Admin Menus</span>
        </button>

        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <span className="text-xs font-extrabold text-slate-900 uppercase truncate">
            {navItems.find((n) => n.id === activeTab)?.label}
          </span>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer Navigation */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-5 overflow-y-auto z-10">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-[#00923f] flex items-center justify-center font-black">
                    <ShieldCheck className="w-5 h-5 text-[#00923f]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase">UHAS-NTD CLUB</h3>
                    <span className="text-[10px] text-amber-600 font-extrabold uppercase">ELECTORAL COMMISSION</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cloud Sync Status */}
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cloud Persistence</span>
                </div>
                <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-950 font-extrabold rounded text-[9px] uppercase">
                  Active
                </span>
              </div>

              {/* Navigation Menu List */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                  Navigation Menus
                </span>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#00923f]' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            isActive ? 'bg-slate-800 text-emerald-300' : item.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <button
                onClick={handleToggleLock}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition flex items-center justify-center gap-2 cursor-pointer ${
                  config.isLocked
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                {config.isLocked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{config.isLocked ? 'Voting Paused' : 'Voting Active'}</span>
              </button>

              <button
                onClick={onExitAdmin}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Admin Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Layout: Left Sidebar (Desktop) + Right Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Desktop Sidebar */}
        <aside className="hidden lg:block lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6 sticky top-20">
          {/* Brand Header */}
          <div className="pb-4 border-b border-slate-100 space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-slate-900 text-[#00923f] text-[9px] font-bold px-2.5 py-1 rounded font-mono uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                ADMIN PANEL
              </span>
            </div>
            <h2 className="text-base font-black text-slate-900 tracking-tight uppercase leading-tight">
              UHAS-NTD CLUB
            </h2>
            <p className="text-[11px] text-amber-600 font-extrabold uppercase tracking-wider">
              ELECTORAL COMMISSION
            </p>
          </div>

          {/* Cloud Synchronization Status Indicator */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-950 font-bold">
              <Cloud className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>Cloud Storage</span>
            </div>
            <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-extrabold rounded text-[10px] uppercase tracking-wide">
              Online & Synced
            </span>
          </div>

          {/* Vertical Menu Items */}
          <nav className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 block mb-1">
              Admin Navigation
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition ${isActive ? 'text-[#00923f]' : 'text-slate-400 group-hover:text-slate-700'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        isActive ? 'bg-slate-800 text-emerald-300' : item.badgeColor || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition ${isActive ? 'opacity-100 text-slate-400' : 'text-slate-400'}`} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick System Action Buttons in Sidebar */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={handleToggleLock}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
                config.isLocked
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              {config.isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Resume Voting</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pause Voting</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadVoterCodesCSV}
              className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
              <span>Voter Codes (CSV)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Audit Report (CSV)</span>
            </button>

            <button
              onClick={onExitAdmin}
              className="w-full py-2.5 px-3 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200 mt-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Admin Portal</span>
            </button>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="lg:col-span-9 space-y-6 min-w-0">
          {/* Top Admin Summary Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
                  {navItems.find((n) => n.id === activeTab)?.label}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {navItems.find((n) => n.id === activeTab)?.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                  config.isLocked ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${config.isLocked ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                  {config.isLocked ? 'Voting Paused' : 'Voting Active'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Turnout: {turnoutPercentage}%
                </span>
              </div>
            </div>

            {/* Turnout KPI Metrics Cards */}
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Turnout</span>
                <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
                  {votedCount} / {totalVotersCount}
                </span>
                <span className="text-[11px] text-[#00923f] font-bold">{turnoutPercentage}% Cast</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Ballots</span>
                <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
                  {votes.length}
                </span>
                <span className="text-[11px] text-emerald-700 font-bold">Processed</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Pending</span>
                <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
                  {pendingCount}
                </span>
                <span className="text-[11px] text-amber-700 font-bold">Awaiting</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Cloud Sync</span>
                <span className="text-sm font-extrabold text-emerald-700 mt-1 block uppercase flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5" />
                  Synced
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Real-time</span>
              </div>
            </div>

            {/* Turnout Progress Bar */}
            <div className="mt-3 pt-2">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-[#00923f] h-full transition-all duration-500"
                  style={{ width: `${turnoutPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

      {/* TAB 0: ANALYTICS DASHBOARD WITH CHARTS & REPORT */}
      {activeTab === 'analytics' && (
        <AnalyticsDashboard electionState={electionState} />
      )}

      {/* TAB 1: REAL-TIME RESULTS & TALLIES */}
      {activeTab === 'results' && (
        <div className="space-y-8">
          {positions.map((pos) => {
            const posCandidates = candidates.filter((c) => c.positionId === pos.id);
            const posTotalVotes = getPositionTotalVotes(pos.id);

            // Find highest vote count for leader badge
            let maxVotes = -1;
            posCandidates.forEach((c) => {
              const count = getCandidateTally(c.id);
              if (count > maxVotes) maxVotes = count;
            });

            return (
              <div
                key={pos.id}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[10px] text-[#00923f] font-mono font-bold uppercase tracking-widest">
                      Executive Position
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">{pos.title}</h2>
                  </div>
                  <div className="bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00923f] animate-pulse"></span>
                    <span>Total Position Votes: {posTotalVotes}</span>
                  </div>
                </div>

                {/* Candidate Tallies Grid */}
                <div className="grid grid-cols-1 gap-4">
                  {posCandidates.map((cand) => {
                    const voteCount = getCandidateTally(cand.id);
                    const percentage =
                      posTotalVotes > 0
                        ? ((voteCount / posTotalVotes) * 100).toFixed(1)
                        : '0.0';
                    const isLeader = voteCount > 0 && voteCount === maxVotes;

                    return (
                      <div
                        key={cand.id}
                        className={`p-4 sm:p-5 rounded-xl border transition-all ${
                          isLeader
                            ? 'bg-emerald-50/60 border-2 border-[#00923f] shadow-xs'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {cand.photoUrl ? (
                              <img
                                src={cand.photoUrl}
                                alt={cand.name}
                                referrerPolicy="no-referrer"
                                className="w-12 h-12 rounded-full object-cover border-2 border-slate-300 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-600 font-bold shrink-0">
                                {cand.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-slate-900 text-base">
                                  {cand.name}
                                </h3>
                                {isLeader && (
                                  <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1 uppercase tracking-wider">
                                    <Award className="w-3 h-3 text-[#00923f]" />
                                    LEADING
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#00923f] font-bold">{cand.titleAndDept}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                            <div className="text-left sm:text-right">
                              <span className="text-2xl font-black text-slate-900 font-mono">
                                {voteCount}
                              </span>
                              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                                Votes
                              </span>
                            </div>
                            <div className="text-right bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                              <span className="text-lg font-extrabold text-[#00923f] font-mono">
                                {percentage}%
                              </span>
                              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                                Vote Share
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Animated Visual Bar */}
                        <div className="mt-4 pt-1">
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isLeader
                                  ? 'bg-[#00923f]'
                                  : 'bg-slate-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: CANDIDATE & POSITION MANAGEMENT (Upload Photos, Restrict Limits) */}
      {activeTab === 'candidates' && (
        <div className="space-y-8">
          {/* Header Action Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">
                Candidate Directory & Position Limits
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Upload candidate pictures, update titles/departments, and restrict the max allowed candidates per position.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingCandidate({
                    name: '',
                    titleAndDept: '',
                    positionId: positions[0]?.id || 'president',
                    photoUrl: '',
                    manifesto: '',
                  });
                  setCandidateMsg(null);
                  setCandidateModalOpen(true);
                }}
                className="px-4 py-2.5 bg-[#00923f] hover:bg-[#007a34] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>Add Candidate</span>
              </button>
            </div>
          </div>

          {/* Position Limits Configuration Cards */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#00923f]" />
                Positions & Candidate Limits
              </h3>
              <button
                onClick={() => {
                  setEditingPosition({ title: '', description: '', maxCandidates: 4 });
                  setPositionModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-[#00923f] hover:bg-[#007a34] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>Add Position</span>
              </button>
            </div>

            {positions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                <p className="font-bold text-sm text-slate-600">No positions configured yet.</p>
                <p className="text-xs text-slate-500">Click "Add Position" above to create an official position for voting.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {positions.map((pos) => {
                  const count = candidates.filter((c) => c.positionId === pos.id).length;
                  const max = pos.maxCandidates || 4;

                  return (
                    <div
                      key={pos.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{pos.title}</h4>
                        {pos.description && <p className="text-xs text-slate-500 mt-0.5">{pos.description}</p>}
                        <div className="mt-2 text-xs font-mono font-bold">
                          Candidates Registered:{' '}
                          <span className={count >= max ? 'text-amber-700 font-black' : 'text-[#00923f]'}>
                            {count} / {max} Limit
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingPosition(pos);
                            setPositionModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
                          title="Edit Position Settings"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#00923f]" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeletePositionAction(pos)}
                          className="p-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                          title="Delete Position"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="sr-only sm:not-sr-only">Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Candidate Cards Grid */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            {/* Success Toast */}
            {photoSuccessToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center justify-between text-xs font-bold shadow-sm animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{photoSuccessToast}</span>
                </div>
                <button onClick={() => setPhotoSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Manual Photo Upload Tracker Banner */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900">Manual Candidate Photo Management</div>
                  <div className="text-slate-600 text-[11px]">
                    All preset photo links have been removed. Upload passport photos directly from your device for each nominee below.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 bg-white border border-emerald-300 rounded-lg text-emerald-900 font-extrabold font-mono text-xs shadow-2xs">
                  {candidates.filter((c) => !!c.photoUrl).length} / {candidates.length} Photos Set
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                Registered Candidates ({candidates.length})
              </h3>

              {/* Filter by Position */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Filter:</span>
                <select
                  value={candidatePosFilter}
                  onChange={(e) => setCandidatePosFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="all">All Positions</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {candidates
                .filter((c) => candidatePosFilter === 'all' || c.positionId === candidatePosFilter)
                .map((candidate) => {
                  const pos = positions.find((p) => p.id === candidate.positionId);

                  return (
                    <div
                      key={candidate.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xs"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="bg-slate-900 text-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded uppercase font-mono tracking-wider">
                            {pos?.title || candidate.positionId}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingCandidate(candidate);
                                setCandidateMsg(null);
                                setCandidateModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-[#00923f] hover:bg-white rounded-lg transition cursor-pointer"
                              title="Edit Candidate"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCandidateAction(candidate)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition cursor-pointer"
                              title="Delete Candidate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          {/* Picture Thumbnail - Large, Visible & Clear */}
                          <div className="relative shrink-0 group">
                            {candidate.photoUrl ? (
                              <img
                                src={candidate.photoUrl}
                                alt={candidate.name}
                                referrerPolicy="no-referrer"
                                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-slate-300 shadow-sm transition group-hover:border-[#00923f]"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 flex flex-col items-center justify-center text-slate-700 font-extrabold text-2xl sm:text-3xl shrink-0 shadow-xs">
                                <span>{candidate.name ? candidate.name.charAt(0).toUpperCase() : '?'}</span>
                                <span className="text-[9px] font-mono text-slate-500 font-normal uppercase tracking-wider mt-0.5">No Photo</span>
                              </div>
                            )}

                            {/* Loading Spinner Overlay during quick upload */}
                            {isPhotoUploading === candidate.id && (
                              <div className="absolute inset-0 bg-slate-900/75 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 z-10">
                                <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[9px] font-bold text-emerald-300">Saving...</span>
                              </div>
                            )}

                            {/* Quick Photo Upload Hover Overlay */}
                            <label className="absolute inset-0 bg-slate-900/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer p-1 text-center">
                              <ImageIcon className="w-5 h-5 text-amber-400" />
                              <span className="text-[9px] font-bold uppercase tracking-wider">Change Photo</span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isPhotoUploading === candidate.id}
                                onChange={(e) => handleQuickCandidatePhotoUpload(candidate, e)}
                                className="hidden"
                              />
                            </label>
                          </div>

                          <div className="space-y-1">
                            <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">{candidate.name}</h4>
                            <p className="text-xs text-[#00923f] font-bold">{candidate.titleAndDept}</p>
                            {candidate.school && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200">
                                  {candidate.school}
                                </span>
                                {candidate.level && (
                                  <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                    {candidate.level}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Quick Action Button to Upload Photo */}
                            <div className="pt-2 flex items-center gap-2">
                              <label className={`text-[11px] font-bold text-[#00923f] hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1.5 cursor-pointer transition shadow-2xs ${isPhotoUploading === candidate.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                <ImageIcon className="w-3.5 h-3.5 text-[#00923f]" />
                                <span>{isPhotoUploading === candidate.id ? 'Processing...' : candidate.photoUrl ? 'Replace Photo' : '+ Insert Photo'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={isPhotoUploading === candidate.id}
                                  onChange={(e) => handleQuickCandidatePhotoUpload(candidate, e)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Photo Verification Warning Badge if Flagged */}
                        {candidate.photoRequiresVerification && (
                          <div className="p-2 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-xs">
                            <span className="text-amber-800 font-bold text-[10px] flex items-center gap-1 uppercase tracking-wider">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              Photo Requires Verification
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCandidate(candidate);
                                setCandidateMsg(null);
                                setCandidateModalOpen(true);
                              }}
                              className="text-[10px] font-bold text-[#00923f] hover:underline"
                            >
                              Upload / Link Photo
                            </button>
                          </div>
                        )}

                        {/* Candidate Manifesto Snippet / Status */}
                        <div className="pt-2 border-t border-slate-200/80">
                          {candidate.manifesto ? (
                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 shadow-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00923f] font-mono flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  Nominee Manifesto
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCandidate(candidate);
                                    setCandidateMsg(null);
                                    setCandidateModalOpen(true);
                                  }}
                                  className="text-[10px] text-slate-500 hover:text-[#00923f] font-bold uppercase cursor-pointer"
                                >
                                  Edit
                                </button>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed italic">
                                "{candidate.manifesto}"
                              </p>
                            </div>
                          ) : (
                            <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/80 flex items-center justify-between text-xs">
                              <span className="text-amber-800 text-[11px] font-medium">No manifesto added yet</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCandidate(candidate);
                                  setCandidateMsg(null);
                                  setCandidateModalOpen(true);
                                }}
                                className="text-[11px] font-bold text-[#00923f] hover:underline cursor-pointer"
                              >
                                + Insert Manifesto
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VOTER AUDIT LIST */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span>Voter Audit & Registry Log</span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono text-xs">
                  {allVoterList.length} Registered
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Audit list showing authorized Voter IDs and submission status. Unregister or clear voters as needed.
              </p>
            </div>

            {/* Filter Pills & Clear All Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {(['ALL', 'VOTED', 'PENDING'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setVoterFilter(filter)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                    voterFilter === filter
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowClearAllModal(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold uppercase tracking-wider transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Clear / Unregister ALL Voters</span>
              </button>
            </div>
          </div>

          {/* Search Box & Bulk Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search Voter ID, Name, or Email..."
                value={voterSearch}
                onChange={(e) => setVoterSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm placeholder:text-slate-400 outline-none focus:border-[#00923f] transition"
              />
            </div>

            {selectedVoterIds.length > 0 && (
              <button
                onClick={handleDeleteSelectedVoters}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-extrabold uppercase tracking-wider transition shadow-sm flex items-center gap-2 cursor-pointer shrink-0 animate-pulse"
              >
                <Trash2 className="w-4 h-4" />
                <span>Unregister Selected Voters ({selectedVoterIds.length})</span>
              </button>
            )}
          </div>

          {/* Audit Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-mono font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={handleToggleSelectAllVoters}
                      checked={
                        filteredVoters.length > 0 &&
                        filteredVoters.every((v) => selectedVoterIds.includes(v.id))
                      }
                      className="w-4 h-4 text-[#00923f] rounded border-slate-300 focus:ring-[#00923f] cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Voter Identity & ID</th>
                  <th className="p-3.5">Voting Status</th>
                  <th className="p-3.5">Email Broadcast</th>
                  <th className="p-3.5">Submission Timestamp</th>
                  <th className="p-3.5">Anonymity Safeguard</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredVoters.length > 0 ? (
                  filteredVoters.map((voter) => {
                    const isSelected = selectedVoterIds.includes(voter.id);
                    return (
                      <tr
                        key={voter.id}
                        className={`transition ${isSelected ? 'bg-rose-50/50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectVoter(voter.id)}
                            className="w-4 h-4 text-[#00923f] rounded border-slate-300 focus:ring-[#00923f] cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 text-sm">
                          <div className="font-mono text-slate-900">{voter.id}</div>
                          {voter.firstName && (
                            <div className="text-xs font-sans font-medium text-slate-600 mt-0.5">
                              {voter.firstName} {voter.email && <span className="text-slate-400">(&lt;{voter.email}&gt;)</span>}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          {voter.status === 'VOTED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              VOTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-sans">
                          {voter.emailSentStatus === 'sent' ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-[#00923f] rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sent</span>
                            </span>
                          ) : voter.email ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                              Pending Dispatch
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-mono">No Email</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {voter.votedAt ? new Date(voter.votedAt).toLocaleString() : 'Not Yet Cast'}
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px] font-sans">
                          <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-700 font-semibold">
                            🔒 Selections Unlinked
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleDeleteVoterIdAction(voter.id)}
                            className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 rounded-md font-sans text-xs font-bold flex items-center gap-1 ml-auto cursor-pointer transition"
                            title="Unregister Voter"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Unregister</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                      No matching Voter IDs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ROSTER & ID GENERATOR */}
      {activeTab === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Add Single Voter ID */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#00923f]" />
              Add Single Voter ID
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Pre-authorize a new individual voter ID for the election roster.
            </p>

            <form onSubmit={handleAddVoter} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs text-slate-700 uppercase font-mono font-bold mb-1">
                  New Voter ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. UHAS-NTD-201"
                  value={newVoterInput}
                  onChange={(e) => setNewVoterInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm outline-none focus:border-[#00923f]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer"
              >
                Add Authorized ID
              </button>
            </form>
          </div>

          {/* Batch Generate Voter IDs */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#00923f]" />
              Batch Generate Voter IDs
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Generate sequential Voter IDs (Prefix: UHAS-NTD-XXX).
            </p>

            <form onSubmit={handleBatchGenerate} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 uppercase font-mono font-bold mb-1">
                    Start Number
                  </label>
                  <input
                    type="number"
                    value={batchStart}
                    onChange={(e) => setBatchStart(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-700 uppercase font-mono font-bold mb-1">
                    End Number
                  </label>
                  <input
                    type="number"
                    value={batchEnd}
                    onChange={(e) => setBatchEnd(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Generate Range (UHAS-NTD-{batchStart.toString().padStart(3, '0')} to UHAS-NTD-{batchEnd.toString().padStart(3, '0')})
              </button>
            </form>
          </div>

          {rosterMsg && (
            <div
              className={`md:col-span-2 p-4 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                rosterMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {rosterMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{rosterMsg.text}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ELECTION COUNTDOWN TIMER & SCHEDULE */}
      {activeTab === 'timer' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-slate-900 text-amber-300 text-[10px] font-extrabold px-2.5 py-1 rounded font-mono uppercase tracking-wider">
                    Electoral Schedule
                  </span>
                  {config.electionTimerActive && config.electionEndTime && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 animate-pulse uppercase">
                      Timer Active
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1 uppercase tracking-tight flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#00923f]" />
                  Election Auto-Conclusion Timer
                </h2>
                <p className="text-xs text-slate-500 font-medium max-w-2xl">
                  Set a live official conclusion timestamp for the election. When the timer hits 00:00:00, voting automatically closes across all voter portals and new ballots are blocked.
                </p>
              </div>

              {config.electionTimerActive && config.electionEndTime && (
                <div className="shrink-0">
                  <ElectionCountdown config={config} className="bg-emerald-50 border-emerald-300" />
                </div>
              )}
            </div>

            {/* Current Schedule Status Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Timer Status
                </span>
                <p className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  {config.electionTimerActive ? (
                    <span className="text-[#00923f] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00923f] animate-pulse"></span>
                      Active & Running
                    </span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                      Not Active (Manual Mode)
                    </span>
                  )}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Target Concluding Time
                </span>
                <p className="text-sm font-bold font-mono text-slate-800">
                  {config.electionEndTime
                    ? new Date(config.electionEndTime).toLocaleString('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'No end time set'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Enforcement Rule
                </span>
                <p className="text-xs font-semibold text-slate-700 leading-tight">
                  {isElectionTimeExpired(config)
                    ? '⚠️ Polls Expired - Voting Blocked'
                    : config.electionTimerActive
                    ? 'Auto-locks when timer reaches zero'
                    : 'Manual Admin Pause / Lock'}
                </p>
              </div>
            </div>

            {/* Quick Preset Durations */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Quick Duration Presets (From Now):
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '+15 Minutes', minutes: 15 },
                  { label: '+30 Minutes', minutes: 30 },
                  { label: '+1 Hour', minutes: 60 },
                  { label: '+2 Hours', minutes: 120 },
                  { label: '+4 Hours', minutes: 240 },
                  { label: '+8 Hours', minutes: 480 },
                  { label: '+12 Hours', minutes: 720 },
                  { label: '+24 Hours', minutes: 1440 },
                ].map((preset) => (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => {
                      const targetDate = new Date(Date.now() + preset.minutes * 60 * 1000);
                      const iso = targetDate.toISOString();
                      const localString = new Date(targetDate.getTime() - targetDate.getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16);
                      setTimerDateTimeInput(localString);
                      const updated = setElectionTimer(iso, true);
                      onRefreshState(updated);
                      setTimerMsg({
                        type: 'success',
                        text: `Election timer set for ${preset.label} (Ends at ${targetDate.toLocaleTimeString()}).`,
                      });
                      setTimeout(() => setTimerMsg(null), 4000);
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 hover:border-[#00923f] border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date & Time Configuration Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!timerDateTimeInput) {
                  setTimerMsg({ type: 'error', text: 'Please pick a valid concluding date and time.' });
                  return;
                }
                const chosenTimestamp = new Date(timerDateTimeInput).getTime();
                if (isNaN(chosenTimestamp) || chosenTimestamp <= Date.now()) {
                  setTimerMsg({
                    type: 'error',
                    text: 'The concluding time must be set to a future date & time.',
                  });
                  return;
                }
                const iso = new Date(timerDateTimeInput).toISOString();
                const updated = setElectionTimer(iso, true);
                onRefreshState(updated);
                setTimerMsg({
                  type: 'success',
                  text: `Election schedule updated! Polls will auto-close on ${new Date(
                    timerDateTimeInput
                  ).toLocaleString()}.`,
                });
                setTimeout(() => setTimerMsg(null), 4000);
              }}
              className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4"
            >
              <h3 className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#00923f]" />
                <span>Or Pick Exact Date & Time:</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Poll Closing Date & Time (Local Time)
                  </label>
                  <input
                    type="datetime-local"
                    value={timerDateTimeInput}
                    onChange={(e) => setTimerDateTimeInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 outline-none focus:border-[#00923f]"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>Apply & Start Timer</span>
                  </button>

                  {config.electionTimerActive && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Are you sure you want to stop and clear the active election timer?')) {
                          const updated = setElectionTimer(null, false);
                          onRefreshState(updated);
                          setTimerMsg({ type: 'success', text: 'Election timer stopped. Voting is in manual mode.' });
                          setTimeout(() => setTimerMsg(null), 4000);
                        }
                      }}
                      className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Clear Timer
                    </button>
                  )}
                </div>
              </div>
            </form>

            {timerMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  timerMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {timerMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{timerMsg.text}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: COMMISSION CHAIR & OFFICERS MANAGEMENT */}
      {activeTab === 'officers' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-slate-900 text-[#00923f] text-[10px] font-extrabold px-2.5 py-1 rounded font-mono uppercase tracking-wider">
                    Governance & Access
                  </span>
                  <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                    {currentAdmins.length} Registered Officer(s)
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1 uppercase tracking-tight flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#00923f]" />
                  Commission Chair & Administrators Portal
                </h2>
                <p className="text-xs text-slate-500 font-medium max-w-2xl">
                  From here, the Commission Chair can dynamically register additional administrators, assign designated roles, manage confidential PIN codes, or revoke administrative access.
                </p>
              </div>

              <button
                onClick={() => {
                  setNewAdminName('');
                  setNewAdminRole('Electoral Commissioner');
                  setNewAdminPin(Math.floor(1000 + Math.random() * 9000).toString());
                  setAddAdminMsg(null);
                  setAddAdminModalOpen(true);
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add Administrator</span>
              </button>
            </div>

            {/* Administrators Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {currentAdmins.map((adm, idx) => {
                const isChair = adm.id === 'admin-chair' || adm.id === 'admin-1' || idx === 0;

                return (
                  <div
                    key={adm.id}
                    className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-xs transition ${
                      isChair
                        ? 'bg-slate-900 text-white border-slate-800'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                            isChair
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {isChair ? 'Commission Chair' : `Officer ${idx + 1}`}
                        </span>

                        <span
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isChair
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          Authorized Access
                        </span>
                      </div>

                      <div className="pt-1">
                        <h3
                          className={`text-base font-black tracking-tight ${
                            isChair ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {adm.name}
                        </h3>
                        <p
                          className={`text-xs font-bold ${
                            isChair ? 'text-emerald-400' : 'text-[#00923f]'
                          }`}
                        >
                          {adm.role}
                        </p>
                      </div>

                      <p
                        className={`text-[10px] font-mono ${
                          isChair ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        Registered: {adm.updatedAt ? new Date(adm.updatedAt).toLocaleDateString() : 'Active'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/40 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedAdminForPin(adm);
                          setPinCurrentInput('');
                          setPinNewInput('');
                          setPinConfirmInput('');
                          setPinManagementMsg(null);
                          setAdminPinModalOpen(true);
                        }}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isChair
                            ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span>Change PIN</span>
                      </button>

                      {!isChair && (
                        <button
                          onClick={() => setAdminToDelete(adm)}
                          className="p-2 bg-white border border-slate-300 hover:bg-rose-50 hover:text-rose-700 text-rose-600 rounded-lg transition cursor-pointer text-xs font-bold"
                          title="Remove Administrator"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ELECTORAL TOOLS, SYSTEM CONTROLS & RESET */}
      {activeTab === 'controls' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seed Demo Votes */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Dices className="w-5 h-5 text-[#00923f]" />
                Simulate Demo Votes
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Instantly cast random anonymous votes for pending voters to test live turnout charts and election analytics.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {[5, 10, 20].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleSeedVotes(num)}
                    className="px-4 py-2 bg-slate-50 hover:bg-emerald-50 text-emerald-900 border border-slate-200 hover:border-[#00923f] rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    + Seed {num} Votes
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Election Data */}
            <div className="bg-white border border-rose-200 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-extrabold text-rose-700 uppercase tracking-tight flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                Reset Election Data
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Clear all cast votes, reset voter status back to PENDING, and restore initial configuration.
              </p>

              <button
                onClick={() => setShowResetModal(true)}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Reset Election (Requires Admin Passcode)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: EMAIL BROADCAST & SPREADSHEET UPLOAD */}
      {activeTab === 'email_broadcast' && (
        <VoterEmailBroadcast
          electionState={electionState}
          onRefreshState={onRefreshState}
        />
      )}

      {/* Edit / Add Candidate Modal */}
      {candidateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                {editingCandidate?.id ? 'Edit Nominee Details' : 'Add New Nominee'}
              </h3>
              <button
                onClick={() => {
                  setCandidateModalOpen(false);
                  setEditingCandidate(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {candidateMsg && (
              <div
                className={`p-3 rounded-lg border text-xs font-semibold ${
                  candidateMsg.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {candidateMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveCandidateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Full Candidate Name
                </label>
                <input
                  type="text"
                  required
                  value={editingCandidate?.name || ''}
                  onChange={(e) =>
                    setEditingCandidate((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Samuel K. Boateng"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-[#00923f]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Position
                  </label>
                  <select
                    value={editingCandidate?.positionId || positions[0]?.id}
                    onChange={(e) =>
                      setEditingCandidate((prev) => ({ ...prev, positionId: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-[#00923f]"
                  >
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Title / Department
                  </label>
                  <input
                    type="text"
                    value={editingCandidate?.titleAndDept || ''}
                    onChange={(e) =>
                      setEditingCandidate((prev) => ({ ...prev, titleAndDept: e.target.value }))
                    }
                    placeholder="e.g. School of Nursing and Midwifery"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-[#00923f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    School / Faculty (Acronym or Name)
                  </label>
                  <input
                    type="text"
                    value={editingCandidate?.school || ''}
                    onChange={(e) =>
                      setEditingCandidate((prev) => ({ ...prev, school: e.target.value }))
                    }
                    placeholder="e.g. SONAM, SAHS, SOM, SOP, SPH"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-[#00923f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Academic Level
                  </label>
                  <input
                    type="text"
                    value={editingCandidate?.level || ''}
                    onChange={(e) =>
                      setEditingCandidate((prev) => ({ ...prev, level: e.target.value }))
                    }
                    placeholder="e.g. Level 300, Level 200"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-[#00923f]"
                  />
                </div>
              </div>

              {/* Manifesto Text Area Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#00923f]" />
                    <span>Nominee Manifesto & Strategic Vision</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">
                    {(editingCandidate?.manifesto || '').length} characters
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={editingCandidate?.manifesto || ''}
                  onChange={(e) =>
                    setEditingCandidate((prev) => ({ ...prev, manifesto: e.target.value }))
                  }
                  placeholder="Insert nominee manifesto here (e.g., vision for NTD awareness campaigns, clinical outreach programs, campus chapter growth, research initiatives)..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-900 outline-none focus:border-[#00923f] placeholder:text-slate-400 font-sans"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  This manifesto will be shown directly on the official voting ballot for voters to read before choosing a nominee.
                </p>
              </div>

              {/* Candidate Picture / Photo Section - Large & Clear */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-xs font-bold uppercase text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#00923f]" />
                    Candidate Passport Photograph
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 lowercase">
                    Visible on ballot & results
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Large Photo Preview Slot */}
                  <div className="relative shrink-0">
                    {isPhotoUploading === 'modal' ? (
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center gap-2 shadow-md">
                        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Optimizing...</span>
                      </div>
                    ) : editingCandidate?.photoUrl ? (
                      <div className="relative group">
                        <img
                          src={editingCandidate.photoUrl}
                          alt="Preview"
                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-emerald-600 shadow-md"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setEditingCandidate((prev) => ({ ...prev, photoUrl: '' }))}
                          className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 transition cursor-pointer"
                          title="Remove Photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-200 border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-slate-500 text-center p-2 shadow-inner">
                        <ImageIcon className="w-8 h-8 text-slate-400 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">No Photo Set</span>
                      </div>
                    )}
                  </div>

                  {/* Photo Insertion Controls */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        1. Upload Image from Computer / Phone:
                      </label>
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs transition">
                        <ImageIcon className="w-4 h-4 text-amber-400" />
                        <span>Choose Photo File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        2. Or Enter Image URL / Path:
                      </label>
                      <input
                        type="text"
                        value={editingCandidate?.photoUrl || ''}
                        onChange={(e) =>
                          setEditingCandidate((prev) => ({ ...prev, photoUrl: e.target.value, photoRequiresVerification: false }))
                        }
                        placeholder="e.g. /nominees/Photo.jpg or https://..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus:border-[#00923f]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setCandidateModalOpen(false);
                    setEditingCandidate(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00923f] hover:bg-[#007a34] text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-amber-300" />
                  <span>Save Nominee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Position Limit Modal */}
      {positionModalOpen && editingPosition && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                {editingPosition.id ? 'Edit Position Settings' : 'Create New Position'}
              </h3>
              <button
                onClick={() => {
                  setPositionModalOpen(false);
                  setEditingPosition(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePositionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Position Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Public Relations Officer"
                  value={editingPosition.title || ''}
                  onChange={(e) =>
                    setEditingPosition((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-[#00923f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Position Description
                </label>
                <textarea
                  rows={2}
                  value={editingPosition.description || ''}
                  onChange={(e) =>
                    setEditingPosition((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Responsibilities and scope of this executive position..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-[#00923f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Max Candidates Allowed For Position
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={editingPosition.maxCandidates || 4}
                  onChange={(e) =>
                    setEditingPosition((prev) => ({ ...prev, maxCandidates: Number(e.target.value) }))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-[#00923f]"
                />
                <span className="text-[11px] text-slate-500 font-medium block mt-1">
                  Restricts total candidates that can be registered for this position.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setPositionModalOpen(false);
                    setEditingPosition(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00923f] hover:bg-[#007a34] text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-amber-300" />
                  <span>{editingPosition.id ? 'Save Position Settings' : 'Create Position'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">Confirm Election Reset</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              This action will wipe all anonymous votes and set all voter IDs back to pending status.
            </p>

            <div>
              <label className="block text-xs text-slate-700 uppercase font-mono font-bold mb-1">
                Enter Admin Passcode
              </label>
              <input
                type="password"
                value={resetConfirmPin}
                onChange={(e) => setResetConfirmPin(e.target.value)}
                placeholder="Enter passcode"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-center tracking-widest text-sm"
              />
            </div>

            {resetError && (
              <p className="text-xs text-rose-600 font-bold">{resetError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetError(null);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReset}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                Wipe & Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Voters Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <UserX className="w-6 h-6" />
              <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                Clear / Unregister ALL Voters
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              You are about to unregister <strong className="text-rose-600 font-extrabold">{allVoterList.length} voter(s)</strong> from the election roster. This will wipe all registered voter IDs, names, and emails.
            </p>

            <form onSubmit={handleClearAllVotersSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-700 uppercase font-mono font-bold mb-1">
                  Enter Electoral Security PIN (Default: 2026)
                </label>
                <input
                  type="password"
                  value={clearAllConfirmPin}
                  onChange={(e) => setClearAllConfirmPin(e.target.value)}
                  placeholder="Enter PIN (2026)"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-center tracking-widest text-sm outline-none focus:border-rose-600"
                />
              </div>

              {clearAllError && (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded border border-rose-200">
                  {clearAllError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowClearAllModal(false);
                    setClearAllError(null);
                    setClearAllConfirmPin('');
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-extrabold uppercase tracking-wider shadow-sm transition cursor-pointer"
                >
                  Clear All Voters Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Deletion Confirmation Modal */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                Remove Candidate
              </h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              Are you sure you want to remove candidate <strong className="text-slate-900 font-extrabold">{candidateToDelete.name}</strong> ({candidateToDelete.titleAndDept})?
            </p>
            <p className="text-xs text-slate-500 font-medium">
              This action will permanently delete this candidate from the election portal.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCandidateToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCandidate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Candidate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voter ID Deletion Confirmation Modal */}
      {voterToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                Delete Voter ID
              </h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              Are you sure you want to remove Voter ID <strong className="text-slate-900 font-mono font-bold">{voterToDelete}</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setVoterToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteVoter}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Voter ID</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Position Deletion Confirmation Modal */}
      {positionToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                Delete Position
              </h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              Are you sure you want to delete position <strong className="text-slate-900 font-extrabold">{positionToDelete.title}</strong>?
            </p>
            <p className="text-xs text-rose-700 font-semibold bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
              ⚠️ Warning: Deleting this position will also automatically remove all candidate registrations associated with it ({candidates.filter((c) => c.positionId === positionToDelete.id).length} candidates).
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPositionToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePosition}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Position</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Admin PIN Modal */}
      {adminPinModalOpen && selectedAdminForPin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-300 flex items-center justify-center">
                  <Key className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                    Change Administrator PIN
                  </h3>
                  <span className="text-[11px] text-[#00923f] font-bold">
                    {selectedAdminForPin.name} ({selectedAdminForPin.role})
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setAdminPinModalOpen(false);
                  setSelectedAdminForPin(null);
                  setPinManagementMsg(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPinManagementMsg(null);
                if (pinNewInput !== pinConfirmInput) {
                  setPinManagementMsg({ type: 'error', text: 'New PIN and confirmation PIN do not match.' });
                  return;
                }
                if (pinNewInput.length < 4) {
                  setPinManagementMsg({ type: 'error', text: 'New PIN must be at least 4 characters.' });
                  return;
                }
                const res = updateAdminPin(selectedAdminForPin.id, pinCurrentInput, pinNewInput);
                if (res.success && res.updatedState) {
                  onRefreshState(res.updatedState);
                  setPinManagementMsg({ type: 'success', text: res.message });
                  setTimeout(() => {
                    setAdminPinModalOpen(false);
                    setSelectedAdminForPin(null);
                    setPinManagementMsg(null);
                  }, 1500);
                } else {
                  setPinManagementMsg({ type: 'error', text: res.message });
                }
              }}
              className="space-y-3 pt-1"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Current PIN Code
                </label>
                <input
                  type="password"
                  required
                  value={pinCurrentInput}
                  onChange={(e) => setPinCurrentInput(e.target.value)}
                  placeholder="Enter current PIN"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono tracking-widest text-center text-sm outline-none focus:border-[#00923f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  New Secret PIN Code
                </label>
                <input
                  type="password"
                  required
                  value={pinNewInput}
                  onChange={(e) => setPinNewInput(e.target.value)}
                  placeholder="Enter new PIN (min 4 digits)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono tracking-widest text-center text-sm outline-none focus:border-[#00923f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Confirm New Secret PIN
                </label>
                <input
                  type="password"
                  required
                  value={pinConfirmInput}
                  onChange={(e) => setPinConfirmInput(e.target.value)}
                  placeholder="Repeat new PIN"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono tracking-widest text-center text-sm outline-none focus:border-[#00923f]"
                />
              </div>

              {pinManagementMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    pinManagementMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {pinManagementMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{pinManagementMsg.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setAdminPinModalOpen(false);
                    setSelectedAdminForPin(null);
                    setPinManagementMsg(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>Update PIN Code</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Administrator Modal */}
      {addAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#00923f]" />
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                  Register New Administrator
                </h3>
              </div>
              <button
                onClick={() => setAddAdminModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Only committee members registered here by the Commission Chair will be permitted to access the administrative portal.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAddAdminMsg(null);
                const res = addAdministrator(newAdminName, newAdminRole, newAdminPin);
                if (res.success && res.updatedState) {
                  onRefreshState(res.updatedState);
                  setAddAdminMsg({ type: 'success', text: res.message });
                  setTimeout(() => {
                    setAddAdminModalOpen(false);
                    setAddAdminMsg(null);
                  }, 1200);
                } else {
                  setAddAdminMsg({ type: 'error', text: res.message });
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Full Name / Title *
                </label>
                <input
                  type="text"
                  required
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="e.g. Dr. Kwame Mensah / Jane Doe"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-[#00923f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Official Role / Designation
                </label>
                <input
                  type="text"
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value)}
                  placeholder="e.g. Electoral Commissioner / Returning Officer"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-[#00923f]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Designated PIN Code *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewAdminPin(Math.floor(1000 + Math.random() * 9000).toString())}
                    className="text-[10px] text-emerald-700 font-bold hover:underline uppercase flex items-center gap-1 cursor-pointer"
                  >
                    ⚡ Generate Random PIN
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-center tracking-widest text-base font-bold text-slate-900 outline-none focus:border-[#00923f]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Give this PIN to the officer so they can unlock the administrative portal.
                </p>
              </div>

              {addAdminMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    addAdminMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {addAdminMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{addAdminMsg.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddAdminModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Register Officer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Revoke Administrator Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                Revoke Administrative Access
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Are you sure you want to remove <strong>{adminToDelete.name}</strong> ({adminToDelete.role}) from the Electoral Commission? Their PIN code will no longer grant access to this portal.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = deleteAdministrator(adminToDelete.id);
                  if (res.success && res.updatedState) {
                    onRefreshState(res.updatedState);
                    setAdminToDelete(null);
                  } else {
                    alert(res.message);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
        </main>
      </div>
    </div>
  );
};
