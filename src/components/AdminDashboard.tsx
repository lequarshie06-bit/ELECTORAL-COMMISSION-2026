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
} from 'lucide-react';
import { Candidate, ElectionState, Position, PositionId, Voter } from '../types';
import { VoterEmailBroadcast } from './VoterEmailBroadcast';
import { AnalyticsDashboard } from './AnalyticsDashboard';
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
  const [activeTab, setActiveTab] = useState<'analytics' | 'results' | 'candidates' | 'audit' | 'roster' | 'email_broadcast' | 'controls'>('analytics');
  const [voterSearch, setVoterSearch] = useState('');
  const [voterFilter, setVoterFilter] = useState<'ALL' | 'VOTED' | 'PENDING'>('ALL');

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

  const { voters, votes, candidates, positions, config } = electionState;

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-slate-800">
      {/* Top Admin Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-slate-900 text-[#00923f] text-[10px] font-bold px-3 py-1 rounded border border-slate-800 font-mono flex items-center gap-1.5 uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00923f]" />
                ADMINISTRATIVE CONTROL PANEL
              </span>
              <span className="text-xs text-amber-600 font-bold uppercase tracking-wider">
                UHAS NTDs ADVOCACY CLUB (HO CHAPTER)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight uppercase">
              Electoral Commission 2026
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Restricted portal for real-time turnout metrics, candidate management, and voter code audit exports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleLock}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition flex items-center gap-2 cursor-pointer ${
                config.isLocked
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              {config.isLocked ? (
                <>
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Voting Paused (Click to Resume)</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-emerald-600" />
                  <span>Voting Active (Click to Pause)</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadVoterCodesCSV}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-300" />
              <span>Download Voter Codes (CSV)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Export Full Audit CSV</span>
            </button>
          </div>
        </div>

        {/* Turnout KPI Metrics Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Turnout</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                {votedCount} / {totalVotersCount}
              </span>
              <span className="text-xs text-[#00923f] font-bold">{turnoutPercentage}% Cast</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl text-[#00923f]">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Anonymous Votes</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                {votes.length}
              </span>
              <span className="text-xs text-emerald-700 font-bold">Ballots Processed</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl text-emerald-400">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Pending Voters</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                {pendingCount}
              </span>
              <span className="text-xs text-amber-700 font-bold">Awaiting Submission</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">System Status</span>
              <span className="text-lg font-extrabold text-slate-900 mt-1 block uppercase">
                {config.isLocked ? 'PAUSED' : 'OPEN'}
              </span>
              <span className="text-xs text-slate-500 font-medium font-mono">UHAS Electoral Portal</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Turnout Progress Gauge */}
        <div className="mt-4 pt-2">
          <div className="flex justify-between items-center text-xs text-slate-600 font-medium mb-1.5">
            <span>Overall Turnout Progress Gauge</span>
            <span className="font-mono text-[#00923f] font-bold">{turnoutPercentage}% Complete</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
            <div
              className="bg-[#00923f] h-full transition-all duration-500"
              style={{ width: `${turnoutPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <PieChartIcon className="w-4 h-4 text-[#00923f]" />
          <span>Analytics & Visual Charts</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'results'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <span>Real-Time Results</span>
        </button>

        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'candidates'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-[#00923f]" />
          <span>Candidates & Limits ({candidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Voter Audit ({allVoterList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Plus className="w-4 h-4 text-[#00923f]" />
          <span>Roster & ID Generator</span>
        </button>

        <button
          onClick={() => setActiveTab('email_broadcast')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'email_broadcast'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Mail className="w-4 h-4 text-[#00923f]" />
          <span>CSV/XLSX Upload & Email Broadcast</span>
        </button>

        <button
          onClick={() => setActiveTab('controls')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'controls'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Dices className="w-4 h-4 text-amber-400" />
          <span>Electoral Tools & Reset</span>
        </button>
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

      {/* TAB 5: ELECTORAL TOOLS & RESET */}
      {activeTab === 'controls' && (
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
      )}

      {/* TAB 6: EMAIL BROADCAST & SPREADSHEET UPLOAD */}
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
    </div>
  );
};
