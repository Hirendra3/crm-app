import type { UserRole } from '../types/user';

import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Main: undefined;
  TaskDetail: { taskId: string; taskJson: string; leaderDeptId?: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Mail: undefined;
  MoreFlow: NavigatorScreenParams<MoreStackParamList>;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Notifications: undefined;
  Profile: undefined;
  AttendanceMe: undefined;
  Users: undefined;
  UserDetail: { userId: string };
  Departments: undefined;
  Team: undefined;
  ChatList: undefined;
  ChatThread: { peerId: string; peerName?: string };
  BroadcastList: undefined;
  BroadcastThread: { departmentId: string; title?: string };
  AttendanceMark: undefined;
  AttendanceReport: undefined;
  Leave: undefined;
  Audit: undefined;
  Sessions: undefined;
  Candidates: undefined;
  CandidateDetail: { candidateId: string };
  TeamLocation: undefined;
  Placeholder: { title: string };
};

export type MoreNavItem = {
  label: string;
  screen: keyof MoreStackParamList;
  params?: MoreStackParamList[keyof MoreStackParamList];
  roles: UserRole[];
};
