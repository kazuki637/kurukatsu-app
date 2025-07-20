import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Import all your screens
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import MyPageScreen from './screens/MyPageScreen';
import SettingsScreen from './screens/SettingsScreen';

import UniversitySelectionScreen from './screens/UniversitySelectionScreen';
import GenreSelectionScreen from './screens/GenreSelectionScreen';
import ProfileEditScreen from './screens/ProfileEditScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import PrivacySettingsScreen from './screens/PrivacySettingsScreen';
import CircleDetailScreen from './screens/CircleDetailScreen';
import FeatureSelectionScreen from './screens/FeatureSelectionScreen';
import FrequencySelectionScreen from './screens/FrequencySelectionScreen';
import GenderRatioSelectionScreen from './screens/GenderRatioSelectionScreen';
import HelpScreen from './screens/HelpScreen';
import LoginScreen from './screens/LoginScreen';
import MembersSelectionScreen from './screens/MembersSelectionScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import SearchResultsScreen from './screens/SearchResultsScreen';
import SignupScreen from './screens/SignupScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';
import CircleManagementScreen from './screens/CircleManagementScreen';
import CircleRegistrationScreen from './screens/CircleRegistrationScreen';
import CircleProfileEditScreen from './screens/CircleProfileEditScreen';
import CircleMemberManagementScreen from './screens/CircleMemberManagementScreen';
import CircleScheduleManagementScreen from './screens/CircleScheduleManagementScreen';
import AddScheduleScreen from './screens/AddScheduleScreen';
import CircleContactScreen from './screens/CircleContactScreen';
import CircleMemberScreen from './screens/CircleMemberScreen';
import CircleSettingsScreen from './screens/CircleSettingsScreen';


const AuthStack = createStackNavigator();
const HomeStack = createStackNavigator();
const SearchStack = createStackNavigator();
const MyPageStack = createStackNavigator();
const SettingsStack = createStackNavigator();
const CircleManagementStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator(); // For modals

// Authentication Stack
function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

// Home Tab Stack
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="CircleDetail" component={CircleDetailScreen} />
    </HomeStack.Navigator>
  );
}

// Search Tab Stack
function SearchStackScreen() {
  return (
    <SearchStack.Navigator screenOptions={{ headerShown: false }}>
      <SearchStack.Screen name="Search" component={SearchScreen} />
      <SearchStack.Screen name="UniversitySelection" component={UniversitySelectionScreen} />
      <SearchStack.Screen name="GenreSelection" component={GenreSelectionScreen} />
      <SearchStack.Screen name="FeatureSelection" component={FeatureSelectionScreen} />
      <SearchStack.Screen name="FrequencySelection" component={FrequencySelectionScreen} />
      <SearchStack.Screen name="MembersSelection" component={MembersSelectionScreen} />
      <SearchStack.Screen name="GenderRatioSelection" component={GenderRatioSelectionScreen} />
      <SearchStack.Screen name="SearchResults" component={SearchResultsScreen} />
      <SearchStack.Screen name="CircleDetail" component={CircleDetailScreen} />
    </SearchStack.Navigator>
  );
}

// MyPage Tab Stack
function MyPageStackScreen() {
  return (
    <MyPageStack.Navigator screenOptions={{ headerShown: false }}>
      <MyPageStack.Screen name="MyPage" component={MyPageScreen} />
      <MyPageStack.Screen name="CircleDetail" component={CircleDetailScreen} />
      <MyPageStack.Screen name="CircleMember" component={CircleMemberScreen} />
      <MyPageStack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <MyPageStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <MyPageStack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
      <MyPageStack.Screen name="Settings" component={SettingsScreen} />
    </MyPageStack.Navigator>
  );
}

// Settings Tab Stack
function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} />
      <SettingsStack.Screen name="NotificationSettingsScreen" component={NotificationSettingsScreen} />
      <SettingsStack.Screen name="PrivacySettingsScreen" component={PrivacySettingsScreen} />
      <SettingsStack.Screen name="HelpScreen" component={HelpScreen} />
      <SettingsStack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
      <SettingsStack.Screen name="TermsOfServiceScreen" component={TermsOfServiceScreen} />
    </SettingsStack.Navigator>
  );
}

// Circle Management Tab Stack
function CircleManagementStackScreen() {
  return (
    <CircleManagementStack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <CircleManagementStack.Screen name="CircleManagementScreen" component={CircleManagementScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleRegistration" component={CircleRegistrationScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleProfileEdit" component={CircleProfileEditScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleSettings" component={CircleSettingsScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleMemberManagement" component={CircleMemberManagementScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleScheduleManagement" component={CircleScheduleManagementScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="AddSchedule" component={AddScheduleScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleContact" component={CircleContactScreen} options={{ headerShown: false, gestureEnabled: true }} />
    </CircleManagementStack.Navigator>
  );
}

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'ホーム') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === '検索') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'マイページ') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'サークル管理') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === '設定') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        // パフォーマンス最適化
        lazy: true,
        lazyPlaceholder: () => null,
        // 画面遷移の最適化
        animationEnabled: true,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      })}
    >
      <Tab.Screen name="ホーム" component={HomeStackScreen} />
      <Tab.Screen name="検索" component={SearchStackScreen} />
      <Tab.Screen name="マイページ" component={MyPageStackScreen} />
      <Tab.Screen name="サークル管理" component={CircleManagementStackScreen} />
      <Tab.Screen name="設定" component={SettingsStackScreen} />
    </Tab.Navigator>
  );
}

// モーダルとしてProfileEditScreenを表示するコンポーネント
function ProfileEditScreenModal() {
  return (
    <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', zIndex: 999, flex: 1 }}>
      <ProfileEditScreen forceToHome={true} />
    </SafeAreaView>
  );
}

// Root Stack Navigator (for modals and initial auth flow)
function AppNavigator() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });
    return subscriber; // unsubscribe on unmount
  }, []);

  if (initializing) return null; // Show a splash screen or loading indicator

  return (
    <RootStack.Navigator>
      {user ? (
        <RootStack.Screen 
          name="Main" 
          component={MainTabNavigatorWithProfileCheck} 
          options={{ headerShown: false }} 
        />
      ) : (
        <RootStack.Screen 
          name="Auth" 
          component={AuthStackScreen} 
          options={{ headerShown: false }} 
        />
      )}
      
    </RootStack.Navigator>
  );
}

function MainTabNavigatorWithProfileCheck() {
  const [profileChecked, setProfileChecked] = React.useState(false);
  const [needsProfile, setNeedsProfile] = React.useState(false);
  const [user, setUser] = React.useState(auth.currentUser);
  const [isInitialCheck, setIsInitialCheck] = React.useState(true);

  React.useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setNeedsProfile(false);
        setProfileChecked(true);
        setIsInitialCheck(false);
        return;
      }
      
      // 初回のみプロフィールチェックを実行
      if (!isInitialCheck) {
        return;
      }
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        // プロフィール未設定（name, nickname, university, grade, gender, birthdayのいずれか未入力）なら強制
        if (!docSnap.exists()) {
          setNeedsProfile(true);
        } else {
          const d = docSnap.data();
          if (!d.name || !d.nickname || !d.university || !d.grade || !d.gender || !d.birthday) {
            setNeedsProfile(true);
          } else {
            setNeedsProfile(false);
          }
        }
      } catch (e) {
        setNeedsProfile(true);
      } finally {
        setProfileChecked(true);
        setIsInitialCheck(false);
      }
    };
    checkProfile();
  }, [user, isInitialCheck]);

  // プロフィールチェック中でもメイン画面を表示
  return (
    <>
      <MainTabNavigator />
      {needsProfile && profileChecked && (
        <ProfileEditScreenModal />
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
