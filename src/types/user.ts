export type UserRole = 'ADMIN' | 'LEADER' | 'HR' | 'MEMBER';

export type User = {
  id: string;
  email: string;
  name: string;
  mobileNumber?: string;
  designation?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  role: UserRole;
  departmentId: string | null;
  /** Legacy single leader (some APIs still return this). */
  leaderId?: string | null;
  leaderIds?: string[];
  avatarUrl?: string;
  totpEnabled?: boolean;
};
