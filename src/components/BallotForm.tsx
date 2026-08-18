import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  User,
  Vote,
  X,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  FileText,
  Quote,
} from 'lucide-react';
import { Candidate, ElectionState, PositionId } from '../types';

interface BallotFormProps {
  voterId: string;
  electionState: ElectionState;
  onSubmitVote: (selections: Record<PositionId, string>) => void;
  onCancel: () => void;
}

export const BallotForm: React.FC<BallotFormProps> = ({
  voterId,
  electionState,
  onSubmitVote,
  onCancel,
}) => {
  const { positions, candidates } = electionState;

  // Selected candidate per position
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Active position step index (positions should not all be on the same page)
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [viewingManifestoCandidate, setViewingManifestoCandidate] = useState<Candidate | null>(null);

  const activePosition = positions[currentStep] || positions[0];
  const activeCandidates = candidates.filter((c) => c.positionId === activePosition?.id);

  const handleSelect = (positionId: string, candidateId: string) => {
    setSelections((prev) => ({
      ...prev,
      [positionId]: candidateId,
    }));
    setValidationError(null);
  };

  const isPositionComplete = (posId: string) => {
    return Boolean(selections[posId]);
  };

  const completedPositionsCount = positions.filter((p) => isPositionComplete(p.id)).length;
  const totalPositions = positions.length;

  const handleNextStep = () => {
    if (!activePosition) return;
    if (!selections[activePosition.id]) {
      setValidationError(`Please select a candidate for "${activePosition.title}" before proceeding.`);
      return;
    }
    setValidationError(null);
    if (currentStep < totalPositions - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Last step -> review
      handleOpenReview();
    }
  };

  const handlePrevStep = () => {
    setValidationError(null);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenReview = () => {
    const missing = positions.find((p) => !selections[p.id]);
    if (missing) {
      const missingIndex = positions.findIndex((p) => p.id === missing.id);
      setCurrentStep(missingIndex >= 0 ? missingIndex : 0);
      setValidationError(`Please select a candidate for "${missing.title}".`);
      return;
    }
    setValidationError(null);
    setShowReviewModal(true);
  };

  const handleFinalSubmit = () => {
    setShowReviewModal(false);
    onSubmitVote(selections);
  };

  if (!positions || positions.length === 0) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-xl text-center space-y-4">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">No Positions Configured</h2>
        <p className="text-slate-600 text-xs font-medium leading-relaxed">
          The electoral commission has not configured any active voting positions yet.
        </p>
        <button
          onClick={onCancel}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
        >
          Return to Portal
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 text-slate-800">
      {/* Top Banner & Instructions */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-slate-900 text-[#00923f] text-[10px] font-bold px-2.5 py-1 rounded border border-slate-800 uppercase tracking-widest">
                Official Ballot
              </span>
              <span className="text-xs text-amber-600 font-bold uppercase tracking-wider">
                UHAS NTDs Advocacy club (Ho Chapter)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 tracking-tight uppercase">
              Electoral Commission 2026
            </h1>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 flex items-center justify-between sm:justify-start gap-3">
            <div className="text-xs text-slate-500">
              Authorized Voter:
              <span className="block text-sm font-mono font-bold text-[#00923f]">
                {voterId}
              </span>
            </div>
            <button
              onClick={onCancel}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition underline cursor-pointer uppercase tracking-wider"
            >
              Exit Session
            </button>
          </div>
        </div>

        {/* Position Navigation Tabs/Progress */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span className="font-bold text-slate-900 uppercase tracking-wider">
              Position {currentStep + 1} of {totalPositions}: <span className="text-[#00923f]">{activePosition?.title}</span>
            </span>
            <span>
              {completedPositionsCount} of {totalPositions} Selected
            </span>
          </div>

          {/* Step Pill Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {positions.map((pos, idx) => {
              const isDone = isPositionComplete(pos.id);
              const isActive = idx === currentStep;

              return (
                <button
                  key={pos.id}
                  onClick={() => {
                    setValidationError(null);
                    setCurrentStep(idx);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white border-2 border-[#00923f] shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span>{idx + 1}. {pos.title}</span>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-bold">{validationError}</span>
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="text-rose-600 hover:text-rose-900 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Single Active Position View */}
      {activePosition && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm transition-all duration-200 space-y-6">
          {/* Position Title & Status Header */}
          <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#00923f] text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                  {currentStep + 1}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {activePosition.title}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                {activePosition.description}
              </p>
            </div>

            {isPositionComplete(activePosition.id) ? (
              <span className="bg-emerald-50 text-emerald-800 text-xs px-3 py-1 rounded-md border border-emerald-300 font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Selection Recorded
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-800 text-xs px-3 py-1 rounded-md border border-amber-300 font-bold uppercase tracking-wider shrink-0 self-start sm:self-center">
                Choice Required
              </span>
            )}
          </div>

          {/* Candidates Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeCandidates.map((candidate) => {
              const isSelected = selections[activePosition.id] === candidate.id;

              return (
                <div
                  key={candidate.id}
                  onClick={() => handleSelect(activePosition.id, candidate.id)}
                  className={`group relative rounded-xl border p-5 sm:p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-50/70 border-2 border-[#00923f] shadow-md'
                      : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {/* Candidate Photo / Image Placeholder - Larger, Prominent & High Clarity */}
                        <div className="relative shrink-0">
                          {candidate.photoUrl ? (
                            <img
                              src={candidate.photoUrl}
                              alt={candidate.name}
                              referrerPolicy="no-referrer"
                              className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl object-cover border-2 shadow-sm transition ${
                                isSelected ? 'border-[#00923f] ring-2 ring-[#00923f]/30' : 'border-slate-300 group-hover:border-slate-400'
                              }`}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                                const fallback = (e.target as HTMLElement).nextElementSibling;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                          ) : null}

                          {/* Clean Avatar Photo Placeholder */}
                          <div
                            className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 flex flex-col items-center justify-center text-slate-700 font-extrabold text-2xl sm:text-3xl shrink-0 shadow-xs ${
                              candidate.photoUrl ? 'hidden' : ''
                            }`}
                          >
                            <span>{candidate.name ? candidate.name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}</span>
                            <span className="text-[9px] font-mono text-slate-500 font-normal uppercase tracking-wider mt-0.5">Nominee</span>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg group-hover:text-[#00923f] transition">
                            {candidate.name}
                          </h3>
                          <p className="text-xs text-[#00923f] font-bold mt-0.5">
                            {candidate.titleAndDept}
                          </p>
                          {candidate.school && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200">
                                {candidate.school}
                              </span>
                              {candidate.level && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                  {candidate.level}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Radio Button */}
                      <div
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#00923f] border-[#00923f] text-white shadow-sm'
                            : 'border-slate-300 group-hover:border-slate-400 bg-white'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Manifesto Preview & Read Manifesto Action Button */}
                    {candidate.manifesto && (
                      <div className="p-3 bg-white/90 border border-slate-200 rounded-lg text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                            <Quote className="w-3 h-3 text-[#00923f]" />
                            Nominee Manifesto & Vision
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingManifestoCandidate(candidate);
                            }}
                            className="text-[11px] font-bold text-[#00923f] hover:text-[#007a34] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Read Full</span>
                          </button>
                        </div>
                        <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed italic">
                          "{candidate.manifesto}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  <div className="mt-5 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Nominee for {activePosition.title}
                    </span>
                    <span
                      className={`font-bold ${
                        isSelected ? 'text-[#00923f]' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {isSelected ? '✓ Selected' : 'Click to select candidate'}
                    </span>
                  </div>
                </div>
              );
            })}

            {activeCandidates.length === 0 && (
              <div className="col-span-full p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                <p className="font-semibold text-sm">No candidates currently registered for this position.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Bottom Step Pagination Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStep === 0}
          className={`w-full sm:w-auto px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
            currentStep === 0
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Position</span>
        </button>

        <div className="text-center hidden sm:block text-xs text-slate-500 font-medium">
          Step <strong className="text-slate-900">{currentStep + 1}</strong> of {totalPositions}
        </div>

        {currentStep < totalPositions - 1 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="w-full sm:w-auto px-6 py-3 bg-[#00923f] hover:bg-[#007a34] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Next: {positions[currentStep + 1]?.title}</span>
            <ChevronRight className="w-4 h-4 text-amber-300" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenReview}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              completedPositionsCount === totalPositions
                ? 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800'
                : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 hover:text-slate-700'
            }`}
          >
            <span>Review & Submit Official Ballot</span>
            <Vote className="w-4 h-4 text-amber-400" />
          </button>
        )}
      </div>

      {/* Nominee Full Manifesto Reader Modal */}
      {viewingManifestoCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleIn text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <BookOpen className="w-5 h-5 text-[#00923f]" />
                <h3 className="text-base font-extrabold uppercase tracking-tight">
                  Nominee Manifesto & Vision
                </h3>
              </div>
              <button
                onClick={() => setViewingManifestoCandidate(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Info Header */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              {viewingManifestoCandidate.photoUrl ? (
                <img
                  src={viewingManifestoCandidate.photoUrl}
                  alt={viewingManifestoCandidate.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-300 shadow-md shrink-0"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-700 font-extrabold text-2xl shrink-0 shadow-xs">
                  {viewingManifestoCandidate.name.charAt(0)}
                </div>
              )}
              <div>
                <span className="bg-slate-900 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                  {positions.find((p) => p.id === viewingManifestoCandidate.positionId)?.title}
                </span>
                <h4 className="font-extrabold text-slate-900 text-lg mt-1">
                  {viewingManifestoCandidate.name}
                </h4>
                <p className="text-xs text-[#00923f] font-bold">
                  {viewingManifestoCandidate.titleAndDept}
                </p>
                {viewingManifestoCandidate.school && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="bg-white text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200">
                      {viewingManifestoCandidate.school}
                    </span>
                    {viewingManifestoCandidate.level && (
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                        {viewingManifestoCandidate.level}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Manifesto Body */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#00923f] uppercase tracking-wider font-mono">
                <Quote className="w-4 h-4" />
                <span>Official Campaign Statement & Priorities</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                {viewingManifestoCandidate.manifesto || 'No detailed manifesto submitted yet.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setViewingManifestoCandidate(null)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-lg transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activePosition && viewingManifestoCandidate) {
                    handleSelect(viewingManifestoCandidate.positionId, viewingManifestoCandidate.id);
                  }
                  setViewingManifestoCandidate(null);
                }}
                className="w-1/2 py-2.5 px-4 bg-[#00923f] hover:bg-[#007a34] text-white text-xs font-bold uppercase rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>Select this Nominee</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-6 animate-scaleIn text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 rounded-lg text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">Review Your Selections</h3>
                  <p className="text-xs text-slate-500 font-mono font-bold">Voter ID: {voterId}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Candidates Summary */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {positions.map((pos) => {
                const cand = candidates.find((c) => c.id === selections[pos.id]);
                return (
                  <div
                    key={pos.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      {cand?.photoUrl ? (
                        <img
                          src={cand.photoUrl}
                          alt={cand.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover border border-slate-300 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                          {cand?.name ? cand.name.charAt(0) : '?'}
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">
                          {pos.title}
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm block mt-0.5">
                          {cand?.name || 'No selection'}
                        </span>
                        <span className="text-[#00923f] text-[11px] font-bold block">
                          {cand?.titleAndDept}
                        </span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong className="text-amber-950 font-bold">Finality Notice:</strong> Once submitted, your vote is recorded anonymously. Your Voter ID will be marked as VOTED and cannot be reused.
              </p>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="w-full sm:w-1/2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="w-full sm:w-1/2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>Confirm & Submit Vote</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
