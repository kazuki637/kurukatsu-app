import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import CommonHeader from '../components/CommonHeader';


const SettingItem = ({ label, icon, onPress, isDestructive = false }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress}>
    <View style={styles.settingItemContent}>
      <Ionicons name={icon} size={24} color={isDestructive ? '#ff3b30' : '#007bff'} style={styles.icon} />
      <Text style={[styles.settingItemText, isDestructive && styles.destructiveText]}>{label}</Text>
    </View>
    {!isDestructive && <Ionicons name="chevron-forward" size={20} color="#ccc" />}
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {

  const handleLogout = async () => {
    Alert.alert(
      "ログアウト",
      "本当にログアウトしますか？",
      [
        {
          text: "キャンセル",
          style: "cancel"
        },
        { 
          text: "ログアウト", 
          onPress: async () => {
            try {
              // FCMトークンを削除
        
              // ログアウト
              await signOut(auth);
              // ログアウト成功後、ログイン画面にリダイレクトするなどの処理が必要な場合がある
              // この例では、ナビゲーションスタックの制御はApp.js側で行うことを想定
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('ログアウトエラー', 'ログアウトに失敗しました。');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const settingsOptions = [
    
    { label: 'お問い合わせ', icon: 'help-circle-outline', screen: 'HelpScreen' },
    { label: '利用規約', icon: 'document-text-outline', screen: 'TermsOfServiceScreen' },
    { label: 'プライバシーポリシー', icon: 'shield-checkmark-outline', screen: 'PrivacyPolicyScreen' },
  ];

  return (
    <View style={styles.container}>
      <CommonHeader title="設定" showBackButton={false} />
      <SafeAreaView style={styles.contentSafeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            {settingsOptions.map((item, index) => (
              <SettingItem
                key={index}
                label={item.label}
                icon={item.icon}
                onPress={() => navigation.navigate(item.screen)}
              />
            ))}
          </View>

          <View style={styles.section}>
            <SettingItem
              label="ログアウト"
              icon="log-out-outline"
              onPress={handleLogout}
              isDestructive
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
  },
  icon: {
    marginRight: 15,
  },
  settingItemText: {
    fontSize: 16,
    color: '#333',
  },
  destructiveText: {
    color: '#ff3b30',
  },
});
