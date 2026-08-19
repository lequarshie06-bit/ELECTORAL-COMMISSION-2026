import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { VoterLogin } from './components/VoterLogin';
import { BallotForm } from './components/BallotForm';
import { VoteConfirmation } from './components/VoteConfirmation';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';
import { ElectionState, PositionId } from './types';
import { loadElectionState, castAnonymousVote, fetchServerElectionState } from './services/storage';

export default function App() {
  const [electionState, setElectionState] = useState<ElectionState>(() => loadElectionState());
  const [mode, setMode] = useState<'LOGIN' | 'BALLOT' | 'CONFIRMATION' | 'ADMIN'>('LOGIN');
  const [currentVoterId, setCurrentVoterId] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Sync state across browser tabs, local updates, and Cloud Server
  useEffect(() => {
    // Initial fetch from cloud backend
    fetchServerElectionState().then((serverState) => {
      if (serverState) {
        setElectionState(serverState);
      }
    });

    const handleStateUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ElectionState>;
      if (customEvent.detail && customEvent.detail.candidates) {
        setElectionState(customEvent.detail);
      } else {
        setElectionState(loadElectionState());
      }
    };

    window.addEventListener('storage', handleStateUpdate);
    window.addEventListener('ntd_election_updated', handleStateUpdate);

    // Periodic cloud sync poll every 8 seconds
    const interval = setInterval(() => {
      fetchServerElectionState().then((serverState) => {
        if (serverState) {
          setElectionState(serverState);
        }
      });
    }, 8000);

    return () => {
      window.removeEventListener('storage', handleStateUpdate);
      window.removeEventListener('ntd_election_updated', handleStateUpdate);
      clearInterval(interval);
    };
  }, []);

  // Voter authentication success handler
  const handleVoterLoginSuccess = (voterId: string) => {
    setCurrentVoterId(voterId);
    setMode('BALLOT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Ballot submit handler
  const handleSubmitVote = (selections: Record<PositionId, string>) => {
    if (!currentVoterId) return;

    const res = castAnonymousVote(currentVoterId, selections);
    if (res.success) {
      setElectionState(loadElectionState());
      setMode('CONFIRMATION');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert(res.errorMessage || 'Failed to submit vote. Please try again.');
    }
  };

  // Confirmation view return handler
  const handleDoneConfirmation = () => {
    setCurrentVoterId(null);
    setMode('LOGIN');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin authentication handler
  const handleAdminAuthSuccess = () => {
    setIsAdminModalOpen(false);
    setIsAdminAuthenticated(true);
    setMode('ADMIN');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitAdmin = () => {
    setIsAdminAuthenticated(false);
    setMode('LOGIN');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoutVoter = () => {
    setCurrentVoterId(null);
    setMode('LOGIN');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between selection:bg-teal-500 selection:text-white">
      {/* Top Header Navigation */}
      <Navbar
        currentVoterId={currentVoterId}
        isAdminAuthenticated={isAdminAuthenticated}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onExitAdminMode={handleExitAdmin}
        onLogoutVoter={handleLogoutVoter}
        electionLocked={electionState.config.isLocked}
        config={electionState.config}
      />

      {/* Main View Router */}
      <main className="flex-grow">
        {mode === 'ADMIN' && isAdminAuthenticated ? (
          <AdminDashboard
            electionState={electionState}
            onRefreshState={(newState) => setElectionState(newState)}
            onExitAdmin={handleExitAdmin}
          />
        ) : mode === 'BALLOT' && currentVoterId ? (
          <BallotForm
            voterId={currentVoterId}
            electionState={electionState}
            onSubmitVote={handleSubmitVote}
            onCancel={handleLogoutVoter}
          />
        ) : mode === 'CONFIRMATION' ? (
          <VoteConfirmation onDone={handleDoneConfirmation} />
        ) : (
          <VoterLogin
            electionState={electionState}
            onLoginSuccess={handleVoterLoginSuccess}
            onOpenAdmin={() => setIsAdminModalOpen(true)}
          />
        )}
      </main>

      {/* Admin Passcode Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onLoginSuccess={handleAdminAuthSuccess}
      />

      {/* Footer */}
      <Footer onOpenAdmin={() => setIsAdminModalOpen(true)} />
    </div>
  );
};
