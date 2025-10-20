import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PostModeToggle = ({ 
  isAnonymous, 
  onToggle, 
  disabled = false,
  style 
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            !isAnonymous && styles.activeToggle,
            disabled && styles.disabledToggle
          ]}
          onPress={() => !disabled && onToggle(false)}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Ionicons 
            name="person" 
            size={16} 
            color={!isAnonymous ? '#FFFFFF' : '#6B7280'} 
          />
          <Text style={[
            styles.toggleText,
            !isAnonymous && styles.activeToggleText,
            disabled && styles.disabledText
          ]}>
            公開
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            isAnonymous && styles.activeToggle,
            disabled && styles.disabledToggle
          ]}
          onPress={() => !disabled && onToggle(true)}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Ionicons 
            name="person-outline" 
            size={16} 
            color={isAnonymous ? '#FFFFFF' : '#6B7280'} 
          />
          <Text style={[
            styles.toggleText,
            isAnonymous && styles.activeToggleText,
            disabled && styles.disabledText
          ]}>
            匿名
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.warningContainer, { opacity: isAnonymous ? 1 : 0 }]}>
        <Ionicons name="warning-outline" size={14} color="#F59E0B" />
        <Text style={styles.warningText}>
          匿名投稿では、あなたのプロフィール情報は表示されません
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 0,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: '#1380ec',
  },
  disabledToggle: {
    opacity: 0.5,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 4,
    flex: 1,
  },
});

export default PostModeToggle;
