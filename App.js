import React, { useState, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { Platform } from 'react-native';
import OnboardingScreen from './screens/OnboardingScreen';


// Import all your screens
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import MyPageScreen from './screens/MyPageScreen';
import SettingsScreen from './screens/SettingsScreen';

import UniversitySelectionScreen from './screens/UniversitySelectionScreen';
import GenreSelectionScreen from './screens/GenreSelectionScreen';
import ProfileEditScreen from './screens/ProfileEditScreen';

import CircleProfileScreen from './screens/CircleProfileScreen';
import FeatureSelectionScreen from './screens/FeatureSelectionScreen';
import FrequencySelectionScreen from './screens/FrequencySelectionScreen';
import GenderRatioSelectionScreen from './screens/GenderRatioSelectionScreen';
import ActivityDaySelectionScreen from './screens/ActivityDaySelectionScreen';
import HelpScreen from './screens/HelpScreen';
import LoginScreen from './screens/LoginScreen';
import PasswordResetScreen from './screens/PasswordResetScreen';
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
import CircleMessageDetailScreen from './screens/CircleMessageDetailScreen';
import CircleManagementDetailScreen from './screens/CircleManagementDetailScreen';
import CircleLeadershipTransferScreen from './screens/CircleLeadershipTransferScreen';
import ReportScreen from './screens/ReportScreen';
import BlockManagementScreen from './screens/BlockManagementScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';

import ImageCropScreen from './screens/ImageCropScreen';
import StudentIdCameraScreen from './screens/StudentIdCameraScreen';
import ArticleDetailScreen from './screens/ArticleDetailScreen';


const AuthStack = createStackNavigator();
const HomeStack = createStackNavigator();
const SearchStack = createStackNavigator();
const MyPageStack = createStackNavigator();
const SettingsStack = createStackNavigator();
const CircleManagementStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator(); // For modals

// 直接遷移処理関数
const handleDirectNavigation = (data) => {
  if (!navigationRef) {
    console.log('ナビゲーション参照が設定されていません');
    return;
  }

  console.log('直接遷移を実行:', data);
  
  try {
    if (data.type === 'joinRequest') {
      // 入会申請通知の場合：直接CircleMemberManagement画面に遷移
      navigationRef.navigate('サークル管理', {
        screen: 'CircleMemberManagement',
        params: {
          circleId: data.circleId,
          initialTab: 'requests'
        }
      });
    } else if (data.type === 'contact') {
      // サークル連絡通知の場合：直接CircleMember画面に遷移
      navigationRef.navigate('CircleMember', {
        circleId: data.circleId,
        initialTab: 1 // 連絡タブのインデックス
      });
    }
  } catch (error) {
    console.error('直接遷移エラー:', error);
    // エラー時は遷移しない（シンプルに）
  }
};

// 通知の初期設定
const initializeNotifications = () => {
  // Android用の通知チャンネル設定
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      console.log('通知ハンドラーが呼ばれました:', notification);
      
      // 通知データをグローバル変数に保存（通知タップ時に使用）
      if (notification.request.content.data) {
        const data = notification.request.content.data;
        console.log('通知データ:', data);
        
        global.pendingNotification = {
          data: data,
          timestamp: Date.now()
        };
        
        // 通知受信時に未読数をリアルタイム更新
        if (data.type === 'contact') {
          // 重複処理防止: 同じmessageIdの通知は1回のみ処理
          const notificationKey = `${data.circleId}_${data.messageId}`;
          if (processedNotificationIds.has(notificationKey)) {
            console.log('重複通知をスキップ:', notificationKey);
            return {
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
            };
          }
          
          processedNotificationIds.add(notificationKey);
          console.log('通知受信: 未読数更新開始', data.circleId);
          updateUnreadCountsRealtime(data.circleId, 1);
          // 新しいメッセージの未読状態も設定
          if (data.messageId && global.updateMessageReadStatus) {
            global.updateMessageReadStatus(data.messageId, false);
          }
          
          // 古い通知IDをクリーンアップ（メモリリーク防止）
          setTimeout(() => {
            processedNotificationIds.delete(notificationKey);
          }, 60000); // 1分後にクリーンアップ
        }
        
        console.log('通知データを保存しました（タップ待ち）');
      }
      
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });

  // 通知タップ時のイベントリスナーを設定
  const notificationListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('通知がタップされました:', response);
    
    if (response.notification.request.content.data) {
      const data = response.notification.request.content.data;
      console.log('タップされた通知データ:', data);
      
      // 直接遷移を実行
      handleDirectNavigation(data);
    }
  });
};

// グローバルナビゲーション参照
let navigationRef = null;

// 通知の重複処理防止用
let processedNotificationIds = new Set();



// リアルタイム未読数更新関数
const updateUnreadCountsRealtime = (circleId, delta) => {
  // ホーム画面とマイページ画面、CircleMemberScreenの未読数を更新
  if (global.updateHomeUnreadCounts) {
    global.updateHomeUnreadCounts(circleId, delta);
  }
  if (global.updateMyPageUnreadCounts) {
    global.updateMyPageUnreadCounts(circleId, delta);
  }
  if (global.updateCircleMemberUnreadCounts) {
    global.updateCircleMemberUnreadCounts(circleId, delta);
  }
};

// グローバルブロック状態管理
let globalBlockedCircleIds = [];

// ブロック状態更新関数（グローバルにエクスポート）
global.updateBlockStatus = (circleId, isBlocked) => {
  if (isBlocked) {
    // ブロック追加
    if (!globalBlockedCircleIds.includes(circleId)) {
      globalBlockedCircleIds.push(circleId);
    }
  } else {
    // ブロック解除
    globalBlockedCircleIds = globalBlockedCircleIds.filter(id => id !== circleId);
  }
  
  // 各画面のブロック状態を更新
  if (global.updateHomeBlockStatus) {
    global.updateHomeBlockStatus(globalBlockedCircleIds);
  }
  if (global.updateSearchResultsBlockStatus) {
    global.updateSearchResultsBlockStatus(globalBlockedCircleIds);
  }
  if (global.updateCircleProfileBlockStatus) {
    global.updateCircleProfileBlockStatus(globalBlockedCircleIds);
  }
  if (global.updateBlockManagementStatus) {
    global.updateBlockManagementStatus(globalBlockedCircleIds);
  }
};

// グローバル入会申請数管理
let globalJoinRequestsCount = {};

// 入会申請数更新関数（グローバルにエクスポート）
global.updateJoinRequestsCount = (circleId, count) => {
  globalJoinRequestsCount[circleId] = count;
  
  // 各画面の入会申請数を更新
  if (global.updateCircleManagementDetailJoinRequests) {
    global.updateCircleManagementDetailJoinRequests(circleId, count);
  }
  if (global.updateCircleMemberManagementJoinRequests) {
    global.updateCircleMemberManagementJoinRequests(circleId, count);
  }
};

// グローバルメンバー数管理
let globalMemberCount = {};

// メンバー数更新関数（グローバルにエクスポート）
global.updateMemberCount = (circleId, count) => {
  globalMemberCount[circleId] = count;
  
  // 各画面のメンバー数を更新
  if (global.updateCircleProfileMemberCount) {
    global.updateCircleProfileMemberCount(circleId, count);
  }
  if (global.updateCircleProfileEditMemberCount) {
    global.updateCircleProfileEditMemberCount(circleId, count);
  }
  if (global.updateCircleMemberScreenMemberCount) {
    global.updateCircleMemberScreenMemberCount(circleId, count);
  }
  if (global.updateCircleMemberManagementMemberCount) {
    global.updateCircleMemberManagementMemberCount(circleId, count);
  }
  if (global.updateCircleContactMemberCount) {
    global.updateCircleContactMemberCount(circleId, count);
  }
};

// グローバルお気に入り状態管理
let globalFavoriteCircleIds = [];

// お気に入り状態更新関数（グローバルにエクスポート）
global.updateFavoriteStatus = (circleId, isFavorite) => {
  if (isFavorite) {
    // お気に入り追加
    if (!globalFavoriteCircleIds.includes(circleId)) {
      globalFavoriteCircleIds.push(circleId);
    }
  } else {
    // お気に入り削除
    globalFavoriteCircleIds = globalFavoriteCircleIds.filter(id => id !== circleId);
  }
  
  // 各画面のお気に入り状態を更新
  if (global.updateMyPageFavoriteStatus) {
    global.updateMyPageFavoriteStatus(globalFavoriteCircleIds);
  }
  if (global.updateSearchResultsFavoriteStatus) {
    global.updateSearchResultsFavoriteStatus(globalFavoriteCircleIds);
  }
};

// Authentication Stack
function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="PasswordReset" component={PasswordResetScreen} />
      <AuthStack.Screen name="ProfileEdit" component={ProfileEditScreen} />
    </AuthStack.Navigator>
  );
}

// Home Tab Stack
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="CircleDetail" component={CircleProfileScreen} />
      <HomeStack.Screen name="CircleMember" component={CircleMemberScreen} />
      <HomeStack.Screen name="CircleMessageDetail" component={CircleMessageDetailScreen} />
      <HomeStack.Screen name="SearchResults" component={SearchResultsScreen} />
      <HomeStack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
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
      <SearchStack.Screen name="ActivityDaySelection" component={ActivityDaySelectionScreen} />
      <SearchStack.Screen name="SearchResults" component={SearchResultsScreen} />
      <SearchStack.Screen name="CircleDetail" component={CircleProfileScreen} />
    </SearchStack.Navigator>
  );
}

// MyPage Tab Stack
function MyPageStackScreen() {
  return (
    <MyPageStack.Navigator screenOptions={{ headerShown: false }}>
      <MyPageStack.Screen name="MyPage" component={MyPageScreen} />
      <MyPageStack.Screen name="CircleDetail" component={CircleProfileScreen} />
      <MyPageStack.Screen name="CircleMember" component={CircleMemberScreen} />
      <MyPageStack.Screen name="CircleMessageDetail" component={CircleMessageDetailScreen} />
      <MyPageStack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      
      <MyPageStack.Screen name="Settings" component={SettingsScreen} />
    </MyPageStack.Navigator>
  );
}

// Settings Tab Stack
function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} />
      
      <SettingsStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
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
      <CircleManagementStack.Screen name="CircleManagementDetail" component={CircleManagementDetailScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleProfileEdit" component={CircleProfileEditScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleSettings" component={CircleSettingsScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleMemberManagement" component={CircleMemberManagementScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleScheduleManagement" component={CircleScheduleManagementScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="AddSchedule" component={AddScheduleScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleContact" component={CircleContactScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleLeadershipTransfer" component={CircleLeadershipTransferScreen} options={{ headerShown: false, gestureEnabled: true }} />

      <CircleManagementStack.Screen name="CircleMember" component={CircleMemberScreen} options={{ headerShown: false, gestureEnabled: true }} />
      <CircleManagementStack.Screen name="CircleMessageDetail" component={CircleMessageDetailScreen} options={{ headerShown: false, gestureEnabled: true }} />
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
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', zIndex: 999, flex: 1 }}>
      <ProfileEditScreen forceToHome={true} />
    </View>
  );
}





// Root Stack Navigator (for modals and initial auth flow)
function AppNavigator() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {


    const initialize = async () => {
      const seen = await AsyncStorage.getItem('seenOnboarding');
      setShowOnboarding(seen !== 'true');


    };
    
    initialize();

    const subscriber = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false);
      
      // ユーザーログイン時に通知トークンを取得・保存
      if (currentUser) {
        try {
          const { registerForPushNotifications } = await import('./utils/notificationUtils');
          await registerForPushNotifications(currentUser.uid);
          
        } catch (error) {
          console.error('通知トークンの取得に失敗:', error);
        }
      }
    });
    
    // クリーンアップ関数を返す
    return () => {
      subscriber();

    };
  }, []);

  if (initializing || showOnboarding === null) return null;

  return (
    <RootStack.Navigator>
      {showOnboarding ? (
        <RootStack.Screen
          name="Onboarding"
          options={{ headerShown: false }}
        >
          {props => <OnboardingScreen {...props} onFinish={async () => {
            await AsyncStorage.setItem('seenOnboarding', 'true');
            setShowOnboarding(false);
          }} />}
        </RootStack.Screen>
      ) : user ? (
        <>
          <RootStack.Screen 
            name="Main" 
            component={MainTabNavigatorWithProfileCheck} 
            options={{ headerShown: false }} 
          />
          <RootStack.Screen 
            name="ImageCrop" 
            component={ImageCropScreen} 
            options={{ headerShown: false }} 
          />
          <RootStack.Screen 
            name="StudentIdCamera" 
            component={StudentIdCameraScreen} 
            options={{ headerShown: false }} 
          />
          <RootStack.Screen 
            name="ProfileEdit" 
            component={ProfileEditScreen} 
            options={{ headerShown: false }} 
          />
          <RootStack.Screen 
            name="ArticleDetail" 
            component={ArticleDetailScreen} 
            options={{ headerShown: false }} 
          />
          <RootStack.Screen 
            name="CircleMember" 
            component={CircleMemberScreen} 
            options={{ headerShown: false }} 
          />
          <RootStack.Screen 
            name="Report" 
            component={ReportScreen} 
            options={{ headerShown: false }} 
          />
          <RootStack.Screen 
            name="BlockManagement" 
            component={BlockManagementScreen} 
            options={{ headerShown: false }} 
          />
        </>
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
  const [user, setUser] = React.useState(() => {
    const currentUser = auth.currentUser;
    return currentUser;
  });
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
        // プロフィール未設定（name, university, grade, gender, birthdayのいずれか未入力）なら強制
        if (!docSnap.exists()) {
          setNeedsProfile(true);
        } else {
          const d = docSnap.data();
          if (!d.name || !d.university || !d.grade || !d.gender || !d.birthday) {
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
  // 通知の初期化と受信処理
  React.useEffect(() => {
    initializeNotifications();
    
    // フォアグラウンドでの通知受信処理
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('フォアグラウンドで通知を受信:', notification);
      console.log('通知内容:', notification.request.content);
      console.log('通知データ:', notification.request.content.data);
    });

    // 通知タップ時の処理（バックグラウンド・フォアグラウンド両方）
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('通知がタップされました:', response);
      const data = response.notification.request.content.data;
      
      // 連絡通知の場合、CircleMessageDetailScreenに遷移
      if (data.type === 'contact' && navigationRef) {
        // 適切なナビゲーターに遷移
        try {
          navigationRef.navigate('Main', {
            screen: 'Home',
            params: {
              screen: 'CircleMessageDetail',
              params: {
                circleId: data.circleId,
                messageId: data.messageId,
              }
            }
          });
        } catch (error) {
          console.error('通知タップ時の画面遷移エラー:', error);
          // エラーが発生した場合はホーム画面に遷移
          navigationRef.navigate('Main');
        }
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigation => {
          navigationRef = navigation;
        }}
      >
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
