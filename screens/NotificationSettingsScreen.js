import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export default function NotificationSettingsScreen() {
  const [notificationSettings, setNotificationSettings] = useState({
    // 全体設定（デフォルト）
    global: {
      circleContact: true,      // サークルからの連絡
      deadlineReminders: true,  // 出欠確認リマインド（前日）
      newMemberJoin: true,      // 新規メンバーの入会
      roleChanges: true,        // サークルにおける役割の変更
      forcedRemoval: true,      // サークルからの強制退会
    },
    // サークル別設定
    circles: {}
  });
  const [circles, setCircles] = useState([]); // 所属サークル一覧
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({}); // 展開状態の管理

  // 通知設定の読み込み
  useEffect(() => {
    loadNotificationSettings();
    loadUserCircles();
  }, []);

  // ユーザーが所属するサークル一覧を取得
  const loadUserCircles = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const joinedCircleIds = userData.joinedCircleIds || [];
        
        const circlesList = [];
        for (const circleId of joinedCircleIds) {
          const circleDoc = await getDoc(doc(db, 'circles', circleId));
          if (circleDoc.exists()) {
            circlesList.push({
              id: circleId,
              name: circleDoc.data().name || 'サークル',
              ...circleDoc.data()
            });
          }
        }
        setCircles(circlesList);
      }
    } catch (error) {
      console.error('サークル一覧の取得でエラーが発生しました:', error);
    }
  };

  // 通知設定を読み込む
  const loadNotificationSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('notificationSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        // 新しい構造に対応するための変換
        if (parsedSettings.global) {
          setNotificationSettings(parsedSettings);
        } else {
          // 古い形式から新しい形式に変換
          setNotificationSettings({
            global: parsedSettings,
            circles: {}
          });
        }
      }
    } catch (error) {
      console.error('通知設定の読み込みでエラーが発生しました:', error);
    } finally {
      setLoading(false);
    }
  };

  // 通知設定を保存する
  const saveNotificationSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      setNotificationSettings(newSettings);
      console.log('通知設定を保存しました:', newSettings);
    } catch (error) {
      console.error('通知設定の保存でエラーが発生しました:', error);
      Alert.alert('エラー', '通知設定の保存に失敗しました');
    }
  };

  // 全体設定の切り替え
  const toggleGlobalSetting = (key) => {
    const newSettings = {
      ...notificationSettings,
      global: {
        ...notificationSettings.global,
        [key]: !notificationSettings.global[key]
      }
    };
    saveNotificationSettings(newSettings);
  };

  // サークル別設定の切り替え
  const toggleCircleSetting = (circleId, key) => {
    const currentCircleSettings = notificationSettings.circles[circleId] || {};
    const newCircleSettings = {
      ...currentCircleSettings,
      [key]: !currentCircleSettings[key]
    };

    const newSettings = {
      ...notificationSettings,
      circles: {
        ...notificationSettings.circles,
        [circleId]: newCircleSettings
      }
    };
    saveNotificationSettings(newSettings);
  };

  // 設定値の取得（継承システム）
  const getSettingValue = (circleId, key) => {
    if (circleId === 'global') {
      return notificationSettings.global[key];
    }
    
    // 全体設定がオフの場合は、個別設定に関係なくオフ
    if (!notificationSettings.global[key]) {
      return false;
    }
    
    const circleSettings = notificationSettings.circles[circleId];
    if (circleSettings && circleSettings.hasOwnProperty(key)) {
      return circleSettings[key];
    }
    
    // 個別設定がない場合は全体設定を継承
    return notificationSettings.global[key];
  };

  // 設定が継承されているかチェック
  const isInherited = (circleId, key) => {
    if (circleId === 'global') return false;
    
    // 全体設定がオフの場合は継承状態とみなす
    if (!notificationSettings.global[key]) {
      return true;
    }
    
    const circleSettings = notificationSettings.circles[circleId];
    return !circleSettings || !circleSettings.hasOwnProperty(key);
  };

  // 設定が無効化されているかチェック（全体設定がオフの場合）
  const isDisabled = (circleId, key) => {
    if (circleId === 'global') return false;
    return !notificationSettings.global[key];
  };

  // 設定の切り替え処理
  const handleSettingToggle = (circleId, key) => {
    if (circleId === 'global') {
      toggleGlobalSetting(key);
    } else {
      // 全体設定がオフの場合は切り替え不可
      if (!notificationSettings.global[key]) {
        Alert.alert(
          '設定変更不可',
          '全体設定で無効になっている通知は、個別設定で有効にできません。\nまず全体設定で有効にしてください。',
          [{ text: 'OK' }]
        );
        return;
      }
      toggleCircleSetting(circleId, key);
    }
  };

  // 設定の表示テキスト
  const getSettingLabel = (key) => {
    const labelMap = {
      circleContact: 'サークルからの連絡',
      deadlineReminders: '出欠確認リマインド（前日）',
      newMemberJoin: '新規メンバーの入会',
      roleChanges: 'サークルにおける役割の変更',
      forcedRemoval: 'サークルからの強制退会'
    };
    return labelMap[key] || key;
  };

  // 設定のアイコン
  const getSettingIcon = (key) => {
    const iconMap = {
      circleContact: 'chatbubble-outline',
      deadlineReminders: 'time-outline',
      newMemberJoin: 'person-add-outline',
      roleChanges: 'shield-outline',
      forcedRemoval: 'exit-outline'
    };
    return iconMap[key] || 'settings-outline';
  };

  // 設定のアイコン色
  const getSettingIconColor = (key) => {
    const colorMap = {
      circleContact: '#007bff',
      deadlineReminders: '#ff9500',
      newMemberJoin: '#34c759',
      roleChanges: '#af52de',
      forcedRemoval: '#ff3b30'
    };
    return colorMap[key] || '#666';
  };

  // 展開状態の切り替え
  const toggleExpanded = (key) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 展開状態の確認
  const isExpanded = (key) => {
    return expandedItems[key] || false;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CommonHeader title="通知設定" />
      
      <ScrollView style={styles.container}>
        {/* 設定セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知設定</Text>
          
          {['circleContact', 'deadlineReminders', 'newMemberJoin', 'roleChanges', 'forcedRemoval'].map(key => (
            <View key={key}>
              {/* 全体設定項目 */}
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons 
                    name={getSettingIcon(key)} 
                    size={24} 
                    color={getSettingIconColor(key)} 
                  />
                  <Text style={styles.settingLabel}>
                    {getSettingLabel(key)}
                  </Text>
                </View>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => toggleExpanded(key)}
                  >
                    <Ionicons 
                      name={isExpanded(key) ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                  <Switch
                    value={getSettingValue('global', key)}
                    onValueChange={() => handleSettingToggle('global', key)}
                    trackColor={{ false: '#e0e0e0', true: '#007bff' }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>

              {/* 個別サークル設定（展開時のみ表示） */}
              {isExpanded(key) && circles.map(circle => (
                <View key={`${key}-${circle.id}`} style={styles.circleSettingItem}>
                  <View style={styles.circleSettingInfo}>
                    <Text style={styles.circleSettingLabel}>
                      {circle.name}
                    </Text>
                  </View>
                  <Switch
                    value={getSettingValue(circle.id, key)}
                    onValueChange={() => handleSettingToggle(circle.id, key)}
                    trackColor={{ 
                      false: isDisabled(circle.id, key) ? '#f0f0f0' : '#e0e0e0', 
                      true: isDisabled(circle.id, key) ? '#ccc' : '#007bff' 
                    }}
                    thumbColor="#ffffff"
                    disabled={isDisabled(circle.id, key)}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  expandButton: {
    marginRight: 10,
  },
  circleSettingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 46, // アイコンの幅 + マージン分のインデント
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
  },
  circleSettingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  circleSettingLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
});