import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import CommonHeader from '../components/CommonHeader';

export default function SettingScreen({ navigation }) {
  // ログアウト機能
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
              await signOut(auth);
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

  // 設定項目のリスト
  const getIntegratedSettingsItems = () => {
    return [
      {
        label: '通知設定',
        icon: 'notifications-outline',
        onPress: () => navigation.navigate('NotificationSettings')
      },
      {
        label: 'ブロックリスト',
        icon: 'lock-closed-outline',
        onPress: () => navigation.navigate('BlockManagement')
      }
    ];
  };

  const getIntegratedInfoItems = () => {
    return [
      {
        label: 'お問い合わせ',
        icon: 'help-circle-outline',
        onPress: () => navigation.navigate('HelpScreen')
      },
      {
        label: '利用規約',
        icon: 'document-text-outline',
        onPress: () => navigation.navigate('TermsOfServiceScreen')
      },
      {
        label: 'プライバシーポリシー',
        icon: 'shield-checkmark-outline',
        onPress: () => navigation.navigate('PrivacyPolicyScreen')
      }
    ];
  };

  return (
    <View style={styles.container}>
      <CommonHeader title="設定" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 設定セクション */}
        <View style={styles.settingsSection}>
          <View style={styles.integratedSettingsCard}>
            {getIntegratedSettingsItems().map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.integratedSettingItem,
                  index < getIntegratedSettingsItems().length - 1 && styles.integratedSettingItemBorder
                ]}
                onPress={item.onPress}
              >
                <View style={styles.settingItemLeft}>
                  <Ionicons name={item.icon} size={20} color="#333" />
                  <Text style={styles.settingItemText}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 情報セクション */}
        <View style={styles.infoSection}>
          <View style={styles.integratedInfoCard}>
            {getIntegratedInfoItems().map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.integratedSettingItem,
                  index < getIntegratedInfoItems().length - 1 && styles.integratedSettingItemBorder
                ]}
                onPress={item.onPress}
              >
                <View style={styles.settingItemLeft}>
                  <Ionicons name={item.icon} size={20} color="#333" />
                  <Text style={styles.settingItemText}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ログアウトセクション */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutItem}
            onPress={handleLogout}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
              <Text style={styles.logoutText}>ログアウト</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  
  // 設定セクションのスタイル
  settingsSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  infoSection: {
    marginTop: 15,
    paddingHorizontal: 20,
  },
  integratedSettingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  integratedInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  integratedSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  integratedSettingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '400',
  },

  // ログアウトセクションのスタイル
  logoutSection: {
    marginTop: 15,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logoutText: {
    fontSize: 16,
    color: '#ff3b30',
    marginLeft: 12,
    fontWeight: '400',
  },
});
