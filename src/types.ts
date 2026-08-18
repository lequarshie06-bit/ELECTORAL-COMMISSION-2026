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
}

export interface ElectionState {
  config: ElectionConfig;
  voters: Record<string, Voter>; // Keyed by Voter ID
  votes: AnonymousVote[];
  candidates: Candidate[];
  positions: Position[];
}
