import type { UserRole } from '../types/user';
import type { MoreNavItem } from './types';

/** Mirrors crm-web `AppLayout` sidebar entries (path → screen). */
export const MORE_NAV_ITEMS: MoreNavItem[] = [
  { label: 'Departments', screen: 'Departments', roles: ['ADMIN'] },
  { label: 'Employees', screen: 'Users', roles: ['ADMIN', 'HR'] },
  { label: 'Hiring', screen: 'Candidates', roles: ['ADMIN', 'HR'] },
  { label: 'My Team', screen: 'Team', roles: ['ADMIN', 'LEADER', 'HR'] },
  { label: 'Team Broadcast', screen: 'BroadcastList', roles: ['ADMIN', 'LEADER', 'MEMBER', 'HR'] },
  { label: 'Chat', screen: 'ChatList', roles: ['ADMIN', 'LEADER', 'HR', 'MEMBER'] },
  { label: 'Alerts', screen: 'Notifications', roles: ['ADMIN', 'LEADER', 'HR', 'MEMBER'] },
  { label: 'Mark attendance', screen: 'AttendanceMark', roles: ['ADMIN', 'HR'] },
  { label: 'My attendance', screen: 'AttendanceMe', roles: ['ADMIN', 'LEADER', 'HR', 'MEMBER'] },
  { label: 'Attendance report', screen: 'AttendanceReport', roles: ['ADMIN', 'LEADER', 'HR'] },
  { label: 'Leave', screen: 'Leave', roles: ['ADMIN', 'LEADER', 'HR', 'MEMBER'] },
  { label: 'Chat audit', screen: 'Audit', roles: ['ADMIN'] },
  { label: 'Sessions', screen: 'Sessions', roles: ['ADMIN', 'LEADER', 'HR', 'MEMBER'] },
  { label: 'Team Locations', screen: 'TeamLocation', roles: ['ADMIN', 'HR'] },
  { label: 'Profile & settings', screen: 'Profile', roles: ['ADMIN', 'LEADER', 'HR', 'MEMBER'] },
];

export function navItemsForRole(role: string | undefined): MoreNavItem[] {
  if (!role) return [];
  return MORE_NAV_ITEMS.filter(i => i.roles.includes(role as UserRole));
}
