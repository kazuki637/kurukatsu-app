import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * KurukatsuButton - モダンなシャドウ付きボタンコンポーネント
 * 
 * @param {string} title - ボタンのテキスト
 * @param {function} onPress - ボタンが押された時の処理
 * @param {object} style - 追加のコンテナスタイル
 * @param {object} buttonStyle - メインボタンの追加スタイル
 * @param {object} textStyle - テキストの追加スタイル
 * @param {string} backgroundColor - メインボタンの背景色
 * @param {boolean} disabled - ボタンの無効化
 * @param {string} size - ボタンサイズ ('small', 'medium', 'large')
 * @param {string} variant - ボタンの種類 ('primary', 'secondary', 'outline')
 * @param {boolean} hapticFeedback - ハプティックフィードバックの有無
 * @param {boolean} loading - ローディング状態（押し込まれた状態を維持）
 */
const KurukatsuButton = ({
  title,
  onPress,
  style = {},
  buttonStyle = {},
  textStyle = {},
  backgroundColor = '#1380ec',
  disabled = false,
  loading = false,
  size = 'medium',
  variant = 'primary',
  hapticFeedback = true,
  ...props
}) => {
  const [pressed, setPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 押し込みアニメーション
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: (pressed || loading) ? 0.96 : 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [pressed, loading]);

  // サイズ設定
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 10,
          fontSize: 16,
          borderRadius: 12,
        };
      case 'large':
        return {
          paddingVertical: 18,
          fontSize: 20,
          borderRadius: 20,
        };
      default: // medium
        return {
          paddingVertical: 14,
          fontSize: 18,
          borderRadius: 16,
        };
    }
  };

  // バリアント設定
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: '#ffffff',
          textColor: '#2563eb',
          borderWidth: 2,
          borderColor: '#B0B7C3',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          textColor: '#2563eb',
          borderWidth: 2,
          borderColor: backgroundColor,
        };
      default: // primary
        return {
          backgroundColor: backgroundColor,
          textColor: '#FFFFFF',
          borderWidth: 0,
          borderColor: 'transparent',
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();
  
  // 枠線がある場合はpaddingを調整して視覚的な高さを統一
  const adjustedPaddingVertical = sizeStyles.paddingVertical - (variantStyles.borderWidth || 0);

  const handlePressIn = () => {
    if (disabled || loading) return;
    setPressed(true);
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (loading) return; // ローディング中は押し込み状態を維持
    setPressed(false);
  };

  const handlePress = () => {
    if (disabled || loading) return;
    onPress && onPress();
  };

  // シャドウスタイルを取得
  const getShadowStyle = () => {
    if (disabled || variant === 'outline') {
      return {}; // disabledまたはoutlineの場合はシャドウなし
    }
    
    return Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: pressed || loading ? 1 : 3,
        },
        shadowOpacity: pressed || loading ? 0.1 : 0.15,
        shadowRadius: pressed || loading ? 2 : 4,
      },
      android: {
        elevation: pressed || loading ? 2 : 4,
      },
    });
  };

  return (
    <Animated.View 
      style={[
        styles.buttonContainer,
        {
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <TouchableOpacity 
        style={[
          styles.mainButton,
          {
            backgroundColor: loading ? '#D1D5DB' : (disabled ? '#D1D5DB' : variantStyles.backgroundColor),
            borderRadius: sizeStyles.borderRadius,
            paddingVertical: adjustedPaddingVertical,
            borderWidth: variantStyles.borderWidth,
            borderColor: disabled ? '#D1D5DB' : variantStyles.borderColor,
          },
          getShadowStyle(),
          buttonStyle,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={1.0}
        disabled={disabled || loading}
        {...props}
      >
        {title && (
          <Text 
            style={[
              styles.buttonText,
              {
                color: loading ? '#9CA3AF' : (disabled ? '#9CA3AF' : variantStyles.textColor),
                fontSize: sizeStyles.fontSize,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        )}
        {props.children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: '100%',
  },
  mainButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default KurukatsuButton;