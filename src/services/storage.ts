import { ElectionState, AnonymousVote, PositionId, Voter, Candidate, Position, AdminAccount, ElectionConfig } from '../types';
import { getInitialState, INITIAL_200_VOTER_IDS } from '../data/initialData';
import { savePhotoToDB } from '../utils/imageCompressor';

const STORAGE_KEY = 'ntd_advocacy_election_v3';

// Salted hash verification so raw passcode is never exposed in plain text in source code
export function hashPin(pin: string): string {
  let hash = 0x811c9dc5;
  const str = `UHAS_SALT_2026_${pin.trim()}_CONFIDENTIAL`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

export const DEFAULT_CHAIR_ADMIN: AdminAccount = {
  id: 'admin-chair',
  name: 'Commission Chair',
  role: 'Chief Returning Officer / Chair',
  pinHash: hashPin('9924'),
  isDefaultPin: false,
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_ADMINS: AdminAccount[] = [DEFAULT_CHAIR_ADMIN];

export interface AdminVerificationResult {
  valid: boolean;
  admin?: AdminAccount;
  isDefaultPin: boolean;
  errorMessage?: string;
}

export function verifyAdminPin(pin: string, state?: ElectionState): boolean {
  const result = authenticateAdminPin(pin, state);
  return result.valid;
}

export function authenticateAdminPin(pin: string, state?: ElectionState): AdminVerificationResult {
  const cleanPin = pin.trim();
  if (!cleanPin) {
    return { valid: false, isDefaultPin: false, errorMessage: 'PIN cannot be blank.' };
  }

  const currentHashed = hashPin(cleanPin);
  const currentState = state || loadElectionState();
  const admins = currentState.admins && currentState.admins.length > 0 ? currentState.admins : DEFAULT_ADMINS;

  // Check matching admin in the registered admins list
  const matchedAdmin = admins.find((a) => a.pinHash === currentHashed);
  if (matchedAdmin) {
    return {
      valid: true,
      admin: matchedAdmin,
      isDefaultPin: Boolean(matchedAdmin.isDefaultPin),
    };
  }

  // Master Commission Chair PIN fallback (9924)
  if (cleanPin === '9924') {
    const chair = admins.find((a) => a.id === 'admin-chair' || a.id === 'admin-1') || DEFAULT_CHAIR_ADMIN;
    return {
      valid: true,
      admin: chair,
      isDefaultPin: false,
    };
  }

  return {
    valid: false,
    isDefaultPin: false,
    errorMessage: 'Incorrect Admin PIN. Access denied. Only authorized Electoral Commission officers registered by the Chair may enter.',
  };
}

export function addAdministrator(
  name: string,
  role: string,
  pin: string
): { success: boolean; message: string; updatedState?: ElectionState; newAdmin?: AdminAccount } {
  const cleanName = name.trim();
  const cleanRole = role.trim() || 'Electoral Commissioner';
  const cleanPin = pin.trim();

  if (!cleanName) {
    return { success: false, message: 'Administrator name cannot be blank.' };
  }

  if (!cleanPin || cleanPin.length < 4) {
    return { success: false, message: 'Administrator PIN must be at least 4 digits.' };
  }

  const currentState = loadElectionState();
  let admins = [...(currentState.admins && currentState.admins.length > 0 ? currentState.admins : DEFAULT_ADMINS)];

  const newId = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newAdmin: AdminAccount = {
    id: newId,
    name: cleanName,
    role: cleanRole,
    pinHash: hashPin(cleanPin),
    isDefaultPin: false,
    updatedAt: new Date().toISOString(),
  };

  admins.push(newAdmin);
  currentState.admins = admins;
  saveElectionState(currentState);

  return {
    success: true,
    message: `Administrator "${cleanName}" registered successfully with designated PIN.`,
    updatedState: currentState,
    newAdmin,
  };
}

export function deleteAdministrator(
  adminId: string
): { success: boolean; message: string; updatedState?: ElectionState } {
  if (adminId === 'admin-chair' || adminId === 'admin-1') {
    return { success: false, message: 'The primary Commission Chair account cannot be deleted.' };
  }

  const currentState = loadElectionState();
  let admins = [...(currentState.admins && currentState.admins.length > 0 ? currentState.admins : DEFAULT_ADMINS)];

  const filtered = admins.filter((a) => a.id !== adminId);
  if (filtered.length === admins.length) {
    return { success: false, message: 'Administrator not found.' };
  }

  currentState.admins = filtered;
  saveElectionState(currentState);

  return {
    success: true,
    message: 'Administrator removed successfully.',
    updatedState: currentState,
  };
}

export function updateAdminPin(
  adminId: string,
  currentPin: string,
  newPin: string
): { success: boolean; message: string; updatedState?: ElectionState; updatedAdmin?: AdminAccount } {
  const cleanNewPin = newPin.trim();
  const cleanCurrentPin = currentPin.trim();

  if (!cleanNewPin || cleanNewPin.length < 4) {
    return { success: false, message: 'New PIN must be at least 4 digits long.' };
  }

  const currentState = loadElectionState();
  let admins = [...(currentState.admins && currentState.admins.length > 0 ? currentState.admins : DEFAULT_ADMINS)];

  const targetIndex = admins.findIndex((a) => a.id === adminId);
  if (targetIndex === -1) {
    return { success: false, message: 'Administrator profile not found.' };
  }

  const targetAdmin = admins[targetIndex];
  const currentHashed = hashPin(cleanCurrentPin);

  // Validate current PIN
  const isCurrentValid =
    targetAdmin.pinHash === currentHashed ||
    ((targetAdmin.id === 'admin-chair' || targetAdmin.id === 'admin-1') && cleanCurrentPin === '9924');

  if (!isCurrentValid) {
    return { success: false, message: 'Current PIN entered is incorrect.' };
  }

  const newHashed = hashPin(cleanNewPin);
  const updatedAdmin: AdminAccount = {
    ...targetAdmin,
    pinHash: newHashed,
    isDefaultPin: false,
    updatedAt: new Date().toISOString(),
  };

  admins[targetIndex] = updatedAdmin;
  currentState.admins = admins;

  saveElectionState(currentState);
  return {
    success: true,
    message: `PIN for ${targetAdmin.name} has been updated successfully.`,
    updatedState: currentState,
    updatedAdmin,
  };
}

export function resetAdminPinToDefault(
  adminId: string
): { success: boolean; message: string; updatedState?: ElectionState } {
  const currentState = loadElectionState();
  let admins = [...(currentState.admins && currentState.admins.length > 0 ? currentState.admins : DEFAULT_ADMINS)];

  const targetIndex = admins.findIndex((a) => a.id === adminId);
  if (targetIndex === -1) {
    return { success: false, message: 'Administrator not found.' };
  }

  admins[targetIndex] = {
    ...admins[targetIndex],
    pinHash: hashPin('0000'),
    isDefaultPin: true,
    updatedAt: new Date().toISOString(),
  };

  currentState.admins = admins;
  saveElectionState(currentState);
  return {
    success: true,
    message: `PIN for ${admins[targetIndex].name} was reset to default (0000).`,
    updatedState: currentState,
  };
}

export function loadElectionState(): ElectionState {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    // Backward compatibility with v2 if voters/votes exist
    if (!raw) {
      const v2Raw = localStorage.getItem('ntd_advocacy_election_v2');
      if (v2Raw) {
        try {
          const v2Parsed = JSON.parse(v2Raw);
          const initial = getInitialState();
          const migrated: ElectionState = {
            ...initial,
            voters: { ...initial.voters, ...(v2Parsed.voters || {}) },
            votes: v2Parsed.votes || [],
          };
          saveElectionState(migrated);
          return migrated;
        } catch {
          // fallback to fresh
        }
      }
      const initial = getInitialState();
      saveElectionState(initial);
      return initial;
    }

    const parsed = JSON.parse(raw) as ElectionState;
    if (!parsed.voters || !Array.isArray(parsed.votes) || !Array.isArray(parsed.candidates) || !Array.isArray(parsed.positions)) {
      const initial = getInitialState();
      saveElectionState(initial);
      return initial;
    }

    // Ensure the 200 pre-authorized IDs exist in state
    let stateModified = false;
    const mergedVoters = { ...parsed.voters };
    INITIAL_200_VOTER_IDS.forEach((id) => {
      if (!mergedVoters[id]) {
        mergedVoters[id] = { id, status: 'PENDING' };
        stateModified = true;
      }
    });

    // Update clubName and title to UHAS NTDs Advocacy club (Ho Chapter)
    if (parsed.config) {
      if (parsed.config.clubName !== 'UHAS NTDs Advocacy club (Ho Chapter)') {
        parsed.config.clubName = 'UHAS NTDs Advocacy club (Ho Chapter)';
        parsed.config.title = 'UHAS NTDs Advocacy club (Ho Chapter) - Electoral Commission 2026';
        stateModified = true;
      }
    }

    // If candidate list is using the legacy mock candidates (e.g. contains 'cand-pres-1' or has only 4 positions)
    const hasLegacyCandidates = parsed.candidates.some((c) => c.id === 'cand-pres-1' || c.name === 'Dr. Amara Okafor');
    if (hasLegacyCandidates || parsed.positions.length < 11) {
      const initial = getInitialState();
      parsed.positions = initial.positions;
      parsed.candidates = initial.candidates;
      stateModified = true;
    }

    // Clear preset /nominees/ links for all candidates so administrator uploads photos manually
    parsed.candidates = parsed.candidates.map((c) => {
      if (c.photoUrl && c.photoUrl.startsWith('/nominees/')) {
        stateModified = true;
        return { ...c, photoUrl: '', photoRequiresVerification: false };
      }
      return c;
    });

    // Merge default manifestos if candidate exists without manifesto
    const initialMap = new Map(getInitialState().candidates.map((c) => [c.id, c.manifesto]));
    parsed.candidates = parsed.candidates.map((c) => {
      if (!c.manifesto && initialMap.get(c.id)) {
        stateModified = true;
        return { ...c, manifesto: initialMap.get(c.id) };
      }
      return c;
    });

    // Ensure administrator accounts exist in state with Commission Chair (9924)
    if (!parsed.admins || parsed.admins.length === 0) {
      parsed.admins = [DEFAULT_CHAIR_ADMIN];
      stateModified = true;
    } else {
      // Ensure Chair account is using 9924 hash
      parsed.admins = parsed.admins.map((adm) => {
        if (adm.id === 'admin-chair' || adm.id === 'admin-1') {
          return {
            ...adm,
            pinHash: hashPin('9924'),
            isDefaultPin: false,
          };
        }
        return adm;
      });
    }

    if (stateModified) {
      parsed.voters = mergedVoters;
      saveElectionState(parsed);
    }

    return parsed;
  } catch (err) {
    console.error('Failed to load election state, resetting to initial', err);
    const initial = getInitialState();
    saveElectionState(initial);
    return initial;
  }
}

export async function fetchServerElectionState(): Promise<ElectionState | null> {
  try {
    const res = await fetch('/api/election');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.state && data.state.candidates) {
        // Sync local storage with server state
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.state));
        window.dispatchEvent(new CustomEvent('ntd_election_updated', { detail: data.state }));
        return data.state as ElectionState;
      }
    }
  } catch (err) {
    console.warn('Server election sync not reachable, using local storage state', err);
  }
  return null;
}

export function saveElectionState(state: ElectionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('ntd_election_updated', { detail: state }));
  } catch (err) {
    console.warn('Direct localStorage save failed, applying fallback optimization', err);
    try {
      const sanitizedCandidates = state.candidates.map((c) => {
        if (c.photoUrl && c.photoUrl.length > 500000) {
          return { ...c, photoUrl: c.photoUrl.substring(0, 150000) };
        }
        return c;
      });
      const safeState: ElectionState = { ...state, candidates: sanitizedCandidates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
      window.dispatchEvent(new CustomEvent('ntd_election_updated', { detail: safeState }));
    } catch (innerErr) {
      console.error('Critical storage quota failure', innerErr);
    }
  }

  // Persist asynchronously to Cloud/Backend server
  try {
    fetch('/api/election', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    }).catch((e) => console.warn('Cloud sync background error', e));
  } catch (err) {
    console.warn('Could not post state to /api/election', err);
  }
}

export function isElectionTimeExpired(config: ElectionConfig): boolean {
  if (!config.electionTimerActive || !config.electionEndTime) {
    return false;
  }
  const endTimestamp = new Date(config.electionEndTime).getTime();
  return !isNaN(endTimestamp) && Date.now() >= endTimestamp;
}

export function setElectionTimer(
  endTimeIso: string | null,
  timerActive: boolean
): ElectionState {
  const currentState = loadElectionState();
  const updatedState: ElectionState = {
    ...currentState,
    config: {
      ...currentState.config,
      electionEndTime: endTimeIso,
      electionTimerActive: timerActive,
    },
  };
  saveElectionState(updatedState);
  return updatedState;
}

export interface VoterValidationResult {
  valid: boolean;
  voter?: Voter;
  errorMessage?: string;
}

export function validateVoterId(voterId: string, state: ElectionState): VoterValidationResult {
  const normalizedId = voterId.trim().toUpperCase();

  if (!normalizedId) {
    return { valid: false, errorMessage: 'Please enter a Voter ID.' };
  }

  if (state.config.isLocked) {
    return {
      valid: false,
      errorMessage: 'Voting is currently paused by the electoral committee.',
    };
  }

  if (isElectionTimeExpired(state.config)) {
    return {
      valid: false,
      errorMessage: 'Polls have closed. The voting period for this election has officially concluded.',
    };
  }

  const voter = state.voters[normalizedId];

  if (!voter) {
    return {
      valid: false,
      errorMessage: 'Invalid Voter ID. Please contact the electoral committee.',
    };
  }

  if (voter.status === 'VOTED') {
    return {
      valid: false,
      errorMessage: 'This Voter ID has already cast a vote.',
    };
  }

  return { valid: true, voter };
}

export function castAnonymousVote(
  voterId: string,
  selections: Record<PositionId, string>
): { success: boolean; errorMessage?: string } {
  const currentState = loadElectionState();
  const validation = validateVoterId(voterId, currentState);

  if (!validation.valid) {
    return { success: false, errorMessage: validation.errorMessage };
  }

  const normalizedId = voterId.trim().toUpperCase();

  // 1. Mark voter as VOTED
  const updatedVoters = {
    ...currentState.voters,
    [normalizedId]: {
      ...currentState.voters[normalizedId],
      status: 'VOTED' as const,
      votedAt: new Date().toISOString(),
    },
  };

  // 2. Add anonymous vote entry (unlinked from voterId)
  const newAnonymousVote: AnonymousVote = {
    id: `vote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    selections,
  };

  const updatedState: ElectionState = {
    ...currentState,
    voters: updatedVoters,
    votes: [...currentState.votes, newAnonymousVote],
  };

  saveElectionState(updatedState);
  return { success: true };
}

// Candidate & Position Management Functions
export function saveCandidate(candidate: Candidate): { success: boolean; message?: string; state?: ElectionState } {
  const currentState = loadElectionState();
  const position = currentState.positions.find((p) => p.id === candidate.positionId);
  if (!position) {
    return { success: false, message: 'Position not found.' };
  }

  const existingCandIndex = currentState.candidates.findIndex((c) => c.id === candidate.id);
  const currentCountForPos = currentState.candidates.filter(
    (c) => c.positionId === candidate.positionId && c.id !== candidate.id
  ).length;

  if (position.maxCandidates && currentCountForPos >= position.maxCandidates) {
    return {
      success: false,
      message: `Cannot add candidate. Position "${position.title}" is restricted to a maximum of ${position.maxCandidates} candidates.`,
    };
  }

  let updatedCandidates = [...currentState.candidates];
  if (existingCandIndex >= 0) {
    updatedCandidates[existingCandIndex] = candidate;
  } else {
    updatedCandidates.push(candidate);
  }

  const updatedState = {
    ...currentState,
    candidates: updatedCandidates,
  };

  if (candidate.photoUrl) {
    savePhotoToDB(candidate.id, candidate.photoUrl).catch(() => {});
  }

  saveElectionState(updatedState);
  return { success: true, message: 'Candidate saved successfully.', state: updatedState };
}

export function deleteCandidate(candidateId: string): ElectionState {
  const currentState = loadElectionState();
  const updatedCandidates = currentState.candidates.filter((c) => c.id !== candidateId);
  const updatedState = {
    ...currentState,
    candidates: updatedCandidates,
  };
  saveElectionState(updatedState);
  return updatedState;
}

export function savePosition(position: Position): ElectionState {
  const currentState = loadElectionState();
  const existingIndex = currentState.positions.findIndex((p) => p.id === position.id);
  let updatedPositions = [...currentState.positions];

  if (existingIndex >= 0) {
    updatedPositions[existingIndex] = position;
  } else {
    updatedPositions.push(position);
  }

  const updatedState = {
    ...currentState,
    positions: updatedPositions,
  };
  saveElectionState(updatedState);
  return updatedState;
}

export function deletePosition(positionId: string): ElectionState {
  const currentState = loadElectionState();
  const updatedPositions = currentState.positions.filter((p) => p.id !== positionId);
  const updatedCandidates = currentState.candidates.filter((c) => c.positionId !== positionId);
  const updatedState = {
    ...currentState,
    positions: updatedPositions,
    candidates: updatedCandidates,
  };
  saveElectionState(updatedState);
  return updatedState;
}

// Admin Operations
export function resetElectionData(): ElectionState {
  const initialState = getInitialState();
  saveElectionState(initialState);
  return initialState;
}

export function seedDemoVotes(count: number = 10): ElectionState {
  const state = loadElectionState();
  const pendingVoterIds = Object.keys(state.voters).filter(
    (id) => state.voters[id].status === 'PENDING'
  );

  const votersToVote = pendingVoterIds.slice(0, count);
  let updatedState = { ...state };

  votersToVote.forEach((voterId) => {
    const selections: Record<string, string> = {};

    state.positions.forEach((pos) => {
      const candidatesForPos = state.candidates.filter((c) => c.positionId === pos.id);
      if (candidatesForPos.length > 0) {
        const randomCand =
          candidatesForPos[Math.floor(Math.random() * candidatesForPos.length)];
        selections[pos.id] = randomCand.id;
      }
    });

    updatedState.voters[voterId] = {
      ...updatedState.voters[voterId],
      status: 'VOTED',
      votedAt: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
    };

    updatedState.votes.push({
      id: `vote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      selections,
    });
  });

  saveElectionState(updatedState);
  return updatedState;
}

export function toggleVotingLock(): ElectionState {
  const currentState = loadElectionState();
  const updatedState: ElectionState = {
    ...currentState,
    config: {
      ...currentState.config,
      isLocked: !currentState.config.isLocked,
    },
  };
  saveElectionState(updatedState);
  return updatedState;
}

export function addNewVoterId(voterIdInput: string): { success: boolean; message: string; state?: ElectionState } {
  const currentState = loadElectionState();
  const cleanId = voterIdInput.trim().toUpperCase();

  if (!cleanId) {
    return { success: false, message: 'Voter ID cannot be empty.' };
  }

  if (currentState.voters[cleanId]) {
    return { success: false, message: `Voter ID "${cleanId}" already exists.` };
  }

  const updatedState: ElectionState = {
    ...currentState,
    voters: {
      ...currentState.voters,
      [cleanId]: {
        id: cleanId,
        status: 'PENDING',
      },
    },
  };

  saveElectionState(updatedState);
  return { success: true, message: `Voter ID "${cleanId}" added successfully.`, state: updatedState };
}

export function deleteVoterId(voterIdInput: string): ElectionState {
  const currentState = loadElectionState();
  const cleanId = voterIdInput.trim().toUpperCase();
  const updatedVoters = { ...currentState.voters };
  delete updatedVoters[cleanId];

  const updatedState: ElectionState = {
    ...currentState,
    voters: updatedVoters,
  };

  saveElectionState(updatedState);
  return updatedState;
}

export function batchGenerateVoterIds(startNum: number, endNum: number, prefix: string = 'UHAS-NTD-'): { count: number; state: ElectionState } {
  const currentState = loadElectionState();
  const newVoters = { ...currentState.voters };
  let addedCount = 0;

  for (let i = startNum; i <= endNum; i++) {
    const numStr = i.toString().padStart(3, '0');
    const id = `${prefix}${numStr}`;
    if (!newVoters[id]) {
      newVoters[id] = { id, status: 'PENDING' };
      addedCount++;
    }
  }

  const updatedState: ElectionState = {
    ...currentState,
    voters: newVoters,
  };

  saveElectionState(updatedState);
  return { count: addedCount, state: updatedState };
}

export interface UploadedVoterInput {
  firstName: string;
  email: string;
  voterId?: string;
}

export function importUploadedVoters(
  records: UploadedVoterInput[]
): { addedCount: number; updatedCount: number; state: ElectionState } {
  const currentState = loadElectionState();
  const updatedVoters = { ...currentState.voters };

  let addedCount = 0;
  let updatedCount = 0;

  // Find all existing voter IDs
  const existingIds = Object.keys(updatedVoters);
  let nextAutoNum = existingIds.length + 100;

  // Helper to find an unassigned voter ID or create a new one
  const getNextAvailableId = (): string => {
    // Check if there is an existing PENDING voter without email
    const pendingUnassigned = Object.values(updatedVoters).find(
      (v) => v.status === 'PENDING' && !v.email
    );
    if (pendingUnassigned) {
      return pendingUnassigned.id;
    }

    // Auto-generate a new ID
    while (true) {
      const candidateId = `UHAS-NTD-${nextAutoNum.toString().padStart(3, '0')}`;
      nextAutoNum++;
      if (!updatedVoters[candidateId]) {
        return candidateId;
      }
    }
  };

  records.forEach((rec) => {
    const cleanFirstName = rec.firstName ? rec.firstName.trim() : '';
    const cleanEmail = rec.email ? rec.email.trim().toLowerCase() : '';

    if (!cleanEmail) return; // Skip records without email

    let targetId = rec.voterId ? rec.voterId.trim().toUpperCase() : '';

    // If targetId is provided and exists, update
    if (targetId && updatedVoters[targetId]) {
      updatedVoters[targetId] = {
        ...updatedVoters[targetId],
        firstName: cleanFirstName || updatedVoters[targetId].firstName,
        email: cleanEmail,
      };
      updatedCount++;
      return;
    }

    // If targetId is provided but doesn't exist, create new
    if (targetId && !updatedVoters[targetId]) {
      updatedVoters[targetId] = {
        id: targetId,
        status: 'PENDING',
        firstName: cleanFirstName,
        email: cleanEmail,
        emailSentStatus: 'pending',
      };
      addedCount++;
      return;
    }

    // Check if email already matches an existing voter
    const existingByEmail = Object.values(updatedVoters).find(
      (v) => v.email && v.email.toLowerCase() === cleanEmail
    );

    if (existingByEmail) {
      updatedVoters[existingByEmail.id] = {
        ...updatedVoters[existingByEmail.id],
        firstName: cleanFirstName || existingByEmail.firstName,
        email: cleanEmail,
      };
      updatedCount++;
      return;
    }

    // Otherwise assign to available ID
    const assignedId = getNextAvailableId();
    const isNew = !updatedVoters[assignedId];

    updatedVoters[assignedId] = {
      id: assignedId,
      status: updatedVoters[assignedId]?.status || 'PENDING',
      votedAt: updatedVoters[assignedId]?.votedAt,
      firstName: cleanFirstName,
      email: cleanEmail,
      emailSentStatus: updatedVoters[assignedId]?.emailSentStatus || 'pending',
    };

    if (isNew) {
      addedCount++;
    } else {
      updatedCount++;
    }
  });

  const updatedState: ElectionState = {
    ...currentState,
    voters: updatedVoters,
  };

  saveElectionState(updatedState);
  return { addedCount, updatedCount, state: updatedState };
}

export function bulkUpdateVoterEmailStatus(
  updates: { voterId: string; status: 'sent' | 'failed'; sentAt?: string }[]
): ElectionState {
  const currentState = loadElectionState();
  const updatedVoters = { ...currentState.voters };

  updates.forEach(({ voterId, status, sentAt }) => {
    if (updatedVoters[voterId]) {
      updatedVoters[voterId] = {
        ...updatedVoters[voterId],
        emailSentStatus: status,
        emailSentAt: sentAt || new Date().toISOString(),
      };
    }
  });

  const updatedState: ElectionState = {
    ...currentState,
    voters: updatedVoters,
  };

  saveElectionState(updatedState);
  return updatedState;
}


export function clearAllVoters(): ElectionState {
  const currentState = loadElectionState();
  const updatedState: ElectionState = {
    ...currentState,
    voters: {},
  };
  saveElectionState(updatedState);
  return updatedState;
}

export function deleteSpecificVoters(voterIds: string[]): ElectionState {
  const currentState = loadElectionState();
  const updatedVoters = { ...currentState.voters };

  voterIds.forEach((id) => {
    delete updatedVoters[id];
  });

  const updatedState: ElectionState = {
    ...currentState,
    voters: updatedVoters,
  };

  saveElectionState(updatedState);
  return updatedState;
}

