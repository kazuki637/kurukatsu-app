import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const CustomTabBar = ({ state, descriptors, navigation }) => {
  // 各タブのアニメーション値を管理
  const animationValues = useRef(
    state.routes.map(() => new Animated.Value(1))
  ).current;

  const handleTabPress = (route, index, isFocused) => {
    // ハプティックフィードバック
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // アニメーション実行
    const animValue = animationValues[index];
    
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // ナビゲーション処理
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const getIconName = (routeName, focused) => {
    switch (routeName) {
      case 'ホーム':
        return focused ? 'home' : 'home-outline';
      case '検索':
        return focused ? 'search' : 'search-outline';
      case 'マイページ':
        return focused ? 'person' : 'person-outline';
      case 'サークル運営':
        return focused ? 'people' : 'people-outline';
      default:
        return 'help-outline';
    }
  };

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        const isFocused = state.index === index;
        const animValue = animationValues[index];

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={1}
            onPress={() => handleTabPress(route, index, isFocused)}
            style={styles.tabItem}
          >
            <Animated.View
              style={[
                styles.tabContent,
                {
                  transform: [{ scale: animValue }],
                },
              ]}
            >
              <Ionicons
                name={getIconName(route.name, isFocused)}
                size={28}
                color={isFocused ? '#007bff' : 'gray'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? '#007bff' : 'gray' },
                ]}
              >
                {label}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default CustomTabBar;
