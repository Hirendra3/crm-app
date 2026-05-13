import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { AttendanceMeScreen } from '../screens/AttendanceMeScreen';
import { UserDetailScreen } from '../screens/UserDetailScreen';
import { UsersScreen } from '../screens/UsersScreen';
import type { MainTabParamList, MoreStackParamList, RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const TabBar = createBottomTabNavigator<MainTabParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function MoreNavigator() {
  return (
    <MoreStack.Navigator>
      <MoreStack.Screen
        name="MoreMenu"
        component={MoreScreen}
        options={{ title: 'More' }}
      />
      <MoreStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <MoreStack.Screen
        name="AttendanceMe"
        component={AttendanceMeScreen}
        options={{ title: 'My attendance' }}
      />
      <MoreStack.Screen
        name="Users"
        component={UsersScreen}
        options={{ title: 'Employees' }}
      />
      <MoreStack.Screen
        name="Placeholder"
        component={PlaceholderScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
      <MoreStack.Screen
        name="UserDetail"
        component={UserDetailScreen}
        options={{ title: 'Employee' }}
      />
    </MoreStack.Navigator>
  );
}

function MainTabs() {
  return (
    <TabBar.Navigator>
      <TabBar.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Home' }}
      />
      <TabBar.Screen name="Tasks" component={TasksScreen} />
      <TabBar.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Inbox' }}
      />
      <TabBar.Screen
        name="MoreFlow"
        component={MoreNavigator}
        options={{ headerShown: false, title: 'More' }}
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
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
        ) : (
          <RootStack.Screen name="Main" component={MainTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
