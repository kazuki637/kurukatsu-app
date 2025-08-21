import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CommonHeader({ title, showBackButton = false, onBack, rightButtonLabel, onRightButtonPress, rightButton, rightButtonDisabled = false, showActionButton = false, onActionButtonPress }) {
  return (
    <View style={styles.header}>
      {showBackButton && (
        <TouchableOpacity onPress={onBack} style={styles.headerLeftButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      {rightButton ? (
        <View style={styles.headerRightButton}>
          {rightButton}
        </View>
      ) : rightButtonLabel && (
        <TouchableOpacity 
          onPress={onRightButtonPress} 
          style={styles.headerRightButton}
          disabled={rightButtonDisabled}
        >
          <Text style={styles.rightButtonText}>
            {rightButtonLabel}
          </Text>
        </TouchableOpacity>
      )}
      
      {/* アクションボタン（・・・） */}
      {showActionButton && (
        <TouchableOpacity 
          onPress={onActionButtonPress} 
          style={styles.actionButton}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    height: 115,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerLeftButton: {
    position: 'absolute',
    bottom: 10,
    left: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerRightButton: {
    position: 'absolute',
    bottom: 10,
    right: 15,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  rightButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
  },
  actionButton: {
    position: 'absolute',
    bottom: 0,
    right: 15,
    padding: 12,
    zIndex: 10,
  },
}); 