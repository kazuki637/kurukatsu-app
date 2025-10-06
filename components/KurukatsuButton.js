import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * KurukatsuButton - Duolingo風3Dボタンコンポーネント
 * 
 * @param {string} title - ボタンのテキスト
 * @param {function} onPress - ボタンが押された時の処理
 * @param {object} style - 追加のコンテナスタイル
 * @param {object} buttonStyle - メインボタンの追加スタイル
 * @param {object} textStyle - テキストの追加スタイル
 * @param {string} backgroundColor - メインボタンの背景色
 * @param {string} shadowColor - 影レイヤーの色
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
  shadowColor = '#0f5bb5',
  disabled = false,
  loading = false,
  size = 'medium',
  variant = 'primary',
  hapticFeedback = true,
  ...props
}) => {
  const [pressed, setPressed] = useState(false);

  // サイズ設定
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          shadowPaddingVertical: 14,
          fontSize: 16,
          borderRadius: 12,
        };
      case 'large':
        return {
          paddingVertical: 16,
          shadowPaddingVertical: 22,
          fontSize: 20,
          borderRadius: 20,
        };
      default: // medium
        return {
          paddingVertical: 12,
          shadowPaddingVertical: 18,
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
          shadowColor: '#B0B7C3',
          textColor: '#2563eb',
          borderWidth: 2,
          borderColor: '#B0B7C3',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          shadowColor: '#E5E7EB',
          textColor: '#2563eb',
          borderWidth: 2,
          borderColor: backgroundColor,
        };
      default: // primary
        return {
          backgroundColor: backgroundColor,
          shadowColor: shadowColor,
          textColor: '#FFFFFF',
          borderWidth: 0,
          borderColor: 'transparent',
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();

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

  return (
    <View style={[styles.buttonContainer, style]}>
      {/* 影レイヤー */}
      <View 
        style={[
          styles.shadowLayer,
          {
            opacity: (pressed || loading || disabled) ? 0 : 1, // disabled時は影を非表示
            backgroundColor: variantStyles.shadowColor,
            borderRadius: sizeStyles.borderRadius,
            paddingVertical: sizeStyles.shadowPaddingVertical,
            bottom: variant === 'secondary' ? -2 : -3, // 白い背景の場合は1px小さく
          }
        ]} 
      />
      
      {/* メインボタン */}
      <TouchableOpacity 
        style={[
          styles.mainButton,
          {
            backgroundColor: loading ? '#D1D5DB' : (disabled ? '#D1D5DB' : variantStyles.backgroundColor),
            borderRadius: sizeStyles.borderRadius,
            paddingVertical: sizeStyles.paddingVertical,
            borderWidth: variantStyles.borderWidth,
            borderColor: disabled ? '#D1D5DB' : variantStyles.borderColor,
            transform: [{ translateY: (pressed || loading) ? (variant === 'secondary' ? 2 : 3) : 0 }], // secondaryは2px、他は3px移動
          },
          buttonStyle,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={1}
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
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 4,
  },
  shadowLayer: {
    position: 'absolute',
    bottom: -3,
    left: 0,
    right: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
    minHeight: 48,
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default KurukatsuButton;