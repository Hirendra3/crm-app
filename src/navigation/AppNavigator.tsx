import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { User } from '../types/user';
import { LoginScreen } from '../screens/LoginScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { MailScreen } from '../screens/MailScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { AttendanceMeScreen } from '../screens/AttendanceMeScreen';
import { UserDetailScreen } from '../screens/UserDetailScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { DepartmentsScreen } from '../screens/DepartmentsScreen';
import { TeamScreen } from '../screens/TeamScreen';
import { ChatListScreen } from '../screens/ChatListScreen';
import { ChatThreadScreen } from '../screens/ChatThreadScreen';
import { BroadcastListScreen } from '../screens/BroadcastListScreen';
import { BroadcastThreadScreen } from '../screens/BroadcastThreadScreen';
import { AttendanceMarkScreen } from '../screens/AttendanceMarkScreen';
import { AttendanceReportScreen } from '../screens/AttendanceReportScreen';
import { LeaveScreen } from '../screens/LeaveScreen';
import { AuditScreen } from '../screens/AuditScreen';
import { SessionsScreen } from '../screens/SessionsScreen';
import { CandidatesScreen } from '../screens/CandidatesScreen';
import { CandidateDetailScreen } from '../screens/CandidateDetailScreen';
import { TeamLocationScreen } from '../screens/TeamLocationScreen';
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import type { MainTabParamList, MoreStackParamList, RootStackParamList } from './types';
import { colors } from '../theme/colors';

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.error,
  },
};

const stackScreenOptions = {
  headerTintColor: colors.text,
  headerTitleStyle: { color: colors.text } as const,
  headerStyle: { backgroundColor: colors.surface },
  contentStyle: { backgroundColor: colors.bg },
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const TabBar = createBottomTabNavigator<MainTabParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function MoreNavigator() {
  return (
    <MoreStack.Navigator initialRouteName="MoreMenu" screenOptions={stackScreenOptions}>
      <MoreStack.Screen name="MoreMenu" component={MoreScreen} options={{ title: 'More' }} />
      <MoreStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Alerts' }}
      />
      <MoreStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <MoreStack.Screen
        name="AttendanceMe"
        component={AttendanceMeScreen}
        options={{ title: 'My attendance' }}
      />
      <MoreStack.Screen name="Users" component={UsersScreen} options={{ title: 'Employees' }} />
      <MoreStack.Screen
        name="UserDetail"
        component={UserDetailScreen}
        options={{ title: 'Employee' }}
      />
      <MoreStack.Screen
        name="Departments"
        component={DepartmentsScreen}
        options={{ title: 'Departments' }}
      />
      <MoreStack.Screen name="Team" component={TeamScreen} options={{ title: 'My Team' }} />
      <MoreStack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Chat' }} />
      <MoreStack.Screen
        name="ChatThread"
        component={ChatThreadScreen}
        options={({ route }) => ({
          title: (route.params as { peerName?: string }).peerName ?? 'Chat',
        })}
      />
      <MoreStack.Screen
        name="BroadcastList"
        component={BroadcastListScreen}
        options={{ title: 'Team Broadcast' }}
      />
      <MoreStack.Screen
        name="BroadcastThread"
        component={BroadcastThreadScreen}
        options={({ route }) => ({
          title: (route.params as { title?: string }).title ?? 'Broadcast',
        })}
      />
      <MoreStack.Screen
        name="AttendanceMark"
        component={AttendanceMarkScreen}
        options={{ title: 'Mark attendance' }}
      />
      <MoreStack.Screen
        name="AttendanceReport"
        component={AttendanceReportScreen}
        options={{ title: 'Attendance report' }}
      />
      <MoreStack.Screen name="Leave" component={LeaveScreen} options={{ title: 'Leave' }} />
      <MoreStack.Screen name="Audit" component={AuditScreen} options={{ title: 'Chat audit' }} />
      <MoreStack.Screen name="Sessions" component={SessionsScreen} options={{ title: 'Sessions' }} />
      <MoreStack.Screen
        name="Candidates"
        component={CandidatesScreen}
        options={{ title: 'Hiring' }}
      />
      <MoreStack.Screen
        name="CandidateDetail"
        component={CandidateDetailScreen}
        options={{ title: 'Candidate' }}
      />
      <MoreStack.Screen
        name="TeamLocation"
        component={TeamLocationScreen}
        options={{ title: 'Team Locations' }}
      />
      <MoreStack.Screen
        name="Placeholder"
        component={PlaceholderScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </MoreStack.Navigator>
  );
}

const tabIcon =
  (symbol: string) =>
  ({ focused }: { color: string; focused: boolean }) =>
    (
      <Text
        style={{
          fontSize: focused ? 24 : 22,
          lineHeight: 28,
          opacity: focused ? 1 : 0.55,
        }}>
        {symbol}
      </Text>
    );

function MainTabs() {
  const { token, updateUser } = useAuth();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void api.get<{ user: User }>('/api/auth/me').then(res => {
      if (!cancelled) void updateUser(res.data.user);
    });
    return () => {
      cancelled = true;
    };
  }, [token, updateUser]);

  return (
    <TabBar.Navigator
      screenOptions={{
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        headerStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}>
      <TabBar.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: tabIcon('🏠'),
        }}
      />
      <TabBar.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: 'Tasks',
          tabBarIcon: tabIcon('📋'),
        }}
      />
      <TabBar.Screen
        name="Mail"
        component={MailScreen}
        options={{
          title: 'Mail',
          tabBarIcon: tabIcon('✉️'),
        }}
      />
      <TabBar.Screen
        name="MoreFlow"
        component={MoreNavigator}
        options={{
          headerShown: false,
          title: 'More',
          tabBarIcon: tabIcon('☰'),
        }}
        listeners={({ navigation }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('MoreFlow', { screen: 'MoreMenu' });
          },
        })}
      />
    </TabBar.Navigator>
  );
}

export function AppNavigator() {
  const { token, ready } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={token ? 'Main' : 'Welcome'}>
        {!token ? (
          <RootStack.Group>
            <RootStack.Screen name="Welcome" component={WelcomeScreen} />
            <RootStack.Screen name="Login" component={LoginScreen} />
          </RootStack.Group>
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <RootStack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{
                headerShown: true,
                title: 'Task',
                ...stackScreenOptions,
              }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
