import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import CommonHeader from '../components/CommonHeader';

const NotificationSettingItem = ({ label, description, value, onValueChange, icon }) => (
  <View style={styles.settingItem}>
    <View style={styles.settingItemContent}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={24} color="#007bff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.settingItemLabel}>{label}</Text>
        <Text style={styles.settingItemDescription}>{description}</Text>
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#e0e0e0', true: '#007bff' }}
      thumbColor={value ? '#fff' : '#f4f3f4'}
    />
  </View>
);

export default function NotificationSettingsScreen({ navigation }) {
  const [joinRequestNotifications, setJoinRequestNotifications] = useState(true);
  const [contactNotifications, setContactNotifications] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const notificationSettings = userData.notificationSettings || {};
        
        setJoinRequestNotifications(notificationSettings.joinRequest !== false);
        setContactNotifications(notificationSettings.contact !== false);
      }
    } catch (error) {
      console.error('通知設定の読み込みに失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNotificationSettings = async (type, value) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        notificationSettings: {
          [type]: value
        }
      }, { merge: true });

      console.log(`${type}通知設定を保存:`, value);
    } catch (error) {
      console.error('通知設定の保存に失敗:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  const handleJoinRequestToggle = (value) => {
    setJoinRequestNotifications(value);
    saveNotificationSettings('joinRequest', value);
  };

  const handleContactToggle = (value) => {
    setContactNotifications(value);
    saveNotificationSettings('contact', value);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CommonHeader 
        title="通知設定" 
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      <SafeAreaView style={styles.contentSafeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <NotificationSettingItem
              label="入会申請通知"
              description="サークルに入会申請が届いた際の通知"
              value={joinRequestNotifications}
              onValueChange={handleJoinRequestToggle}
              icon="person-add-outline"
            />
            
            <NotificationSettingItem
              label="サークル連絡通知"
              description="サークルからの連絡や出欠確認の通知"
              value={contactNotifications}
              onValueChange={handleContactToggle}
              icon="chatbubble-outline"
            />
          </View>


        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  scrollContent: {
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  settingItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },

});
