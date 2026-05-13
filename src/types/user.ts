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
  leaderId: string | null;
  avatarUrl?: string;
};
