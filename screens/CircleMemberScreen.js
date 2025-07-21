import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { TabView } from 'react-native-tab-view';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function CircleMemberScreen({ route, navigation }) {
  const { circleId } = route.params;
  const [circleName, setCircleName] = useState('メンバー');
  const [tabIndex, setTabIndex] = useState(0);
  const [routes] = useState([
    { key: 'calendar', title: 'カレンダー' },
    { key: 'news', title: 'お知らせ' },
  ]);

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

  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'calendar':
        return <View style={styles.tabContent}><Text style={styles.text}>カレンダー（ダミー表示）</Text></View>;
      case 'news':
        return <View style={styles.tabContent}><Text style={styles.text}>お知らせ（ダミー表示）</Text></View>;
      default:
        return null;
    }
  };

  const renderTabBar = (props) => {
    const inputRange = props.navigationState.routes.map((x, i) => i);
    const tabWidth = width / props.navigationState.routes.length;
    return (
      <View style={styles.tabBar}>
        {props.navigationState.routes.map((route, i) => (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => setTabIndex(i)}
          >
            <Text style={[styles.tabLabel, props.navigationState.index === i && styles.activeTabLabel]}>{route.title}</Text>
          </TouchableOpacity>
        ))}
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              width: tabWidth,
              transform: [{
                translateX: props.position.interpolate({
                  inputRange,
                  outputRange: inputRange.map(i => i * tabWidth),
                })
              }],
            },
          ]}
        />
      </View>
    );
  };

  return (
    <>
      <CommonHeader title={circleName} />
      <SafeAreaView style={styles.container}>
        <TabView
          navigationState={{ index: tabIndex, routes }}
          renderScene={renderScene}
          onIndexChange={setTabIndex}
          renderTabBar={renderTabBar}
          swipeEnabled={true}
          initialLayout={{ width }}
        />
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
  activeTabItem: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabLabel: {
    fontSize: 16,
    color: '#666',
  },
  activeTabLabel: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: '#007bff',
  },
}); 