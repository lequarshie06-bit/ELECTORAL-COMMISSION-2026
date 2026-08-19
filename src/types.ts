export type PositionId = string;

export interface Position {
  id: string;
  title: string;
  description: string;
  maxCandidates?: number;
}

export interface Candidate {
  id: string;
  positionId: string;
  name: string;
  titleAndDept: string;
  photoUrl: string;
  manifesto?: string;
  school?: string;
  level?: string;
  photoRequiresVerification?: boolean;
}

export interface Voter {
  id: string; // e.g. "UHAS-NTD-44NN"
  status: 'PENDING' | 'VOTED';
  votedAt?: string; // ISO string
  firstName?: string;
  email?: string;
  emailSentStatus?: 'pending' | 'sent' | 'failed';
  emailSentAt?: string;
}

export interface AnonymousVote {
  id: string; // Unique ballot GUID
  timestamp: string;
  selections: Record<string, string>; // positionId -> candidateId
}

export interface ElectionConfig {
  title: string;
  clubName: string;
  year: string;
  isLocked: boolean; // Admin can pause/lock voting
  electionEndTime?: string | null; // ISO string when voting concludes
  electionTimerActive?: boolean; // Whether scheduled end timer is active
}

export interface AdminAccount {
  id: string; // e.g. 'admin-1', 'admin-2', 'admin-3'
  name: string; // e.g. 'Chief Returning Officer (Admin 1)'
  role: string; // e.g. 'Commission Chair'
  pinHash: string; // Hashed PIN digest
  isDefaultPin: boolean; // true if still using default '0000'
  lastLoginAt?: string;
  updatedAt?: string;
}

export interface ElectionState {
  config: ElectionConfig;
  voters: Record<string, Voter>; // Keyed by Voter ID
  votes: AnonymousVote[];
  candidates: Candidate[];
  positions: Position[];
  admins?: AdminAccount[];
}
