import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function CircleMemberScreen({ route, navigation }) {
  const { circleId } = route.params;
  const [circleName, setCircleName] = useState('メンバー');
  const [tabIndex, setTabIndex] = useState(0);
  const tabs = [
    { key: 'calendar', title: 'カレンダー' },
    { key: 'news', title: 'お知らせ' },
  ];

  useEffect(() => {
    const fetchCircle = async () => {
      if (circleId) {
        const docRef = doc(db, 'circles', circleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCircleName(docSnap.data().name || 'メンバー');
        }
      }
    };
    fetchCircle();
  }, [circleId]);

  // タブ切り替え用
  const renderTabContent = () => {
    switch (tabIndex) {
      case 0:
        return <View style={styles.tabContent}><Text style={styles.text}>カレンダー（ダミー表示）</Text></View>;
      case 1:
        return <View style={styles.tabContent}><Text style={styles.text}>お知らせ（ダミー表示）</Text></View>;
      default:
        return null;
    }
  };

  return (
    <>
      <CommonHeader title={circleName} />
      <SafeAreaView style={styles.container}>
        {/* タブバー */}
        <View style={styles.tabBar}>
          {tabs.map((tab, i) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, tabIndex === i && styles.tabItemActive]}
              onPress={() => setTabIndex(i)}
            >
              <Text style={[styles.tabText, tabIndex === i && styles.tabTextActive]}>{tab.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* タブ内容 */}
        {renderTabContent()}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  tabTextActive: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
}); 