import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CommonHeader from '../components/CommonHeader';

export default function SubscriptionScreen({ route, navigation }) {
  const { circleId, circleName } = route.params;


  const plans = [
    {
      id: 'monthly',
      title: '月額プラン',
      price: '¥980',
      duration: '月額',
      description: '月額でプレミアム機能を利用',
      features: [
        'スケジュール機能',
        '連絡機能',
        'おすすめ掲載'
      ],
      gradient: ['#2196F3', '#1976D2']
    }
  ];

  const handleSubscribe = () => {
    Alert.alert(
      'サブスクリプション',
      '月額プランを開始しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '開始する', 
          onPress: () => {
            Alert.alert('開始完了', 'サブスクリプションを開始しました！');
            navigation.goBack();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <CommonHeader 
        title="プレミアム" 
        showBackButton 
        onBack={() => navigation.goBack()} 
      />
      <SafeAreaView style={styles.content}>
        <ScrollView style={styles.scrollView}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>プレミアム機能</Text>
            <Text style={styles.headerSubtitle}>
              サークル活動をより充実させるプレミアム機能をご利用ください
            </Text>
          </View>

          {/* プラン表示 */}
          <View style={styles.plansContainer}>
            {plans.map((plan) => (
              <View
                key={plan.id}
                style={styles.planCard}
              >
                <LinearGradient
                  colors={plan.gradient}
                  style={styles.planGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.planHeader}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>{plan.price}</Text>
                      <Text style={styles.duration}>/{plan.duration}</Text>
                    </View>
                  </View>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                  
                  <View style={styles.featuresContainer}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </View>
            ))}
          </View>

          {/* 注意事項 */}
          <View style={styles.noticeContainer}>
            <Text style={styles.noticeTitle}>注意事項</Text>
            <Text style={styles.noticeText}>
              • 無料体験期間中はいつでもキャンセル可能です{'\n'}
              • 月額・年額プランは自動更新されます{'\n'}
              • 購読のキャンセルは設定画面から行えます
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
      
      {/* 画面下部の固定ボタン */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.agreementButton}
          onPress={handleSubscribe}
        >
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.agreementGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.agreementButtonText}>
              利用規約等、注意事項に同意して{'\n'}クルカツプレミアムに申し込む
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.subscriptionText}>
          1カ月の無料体験後、980円/月
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  plansContainer: {
    marginBottom: 30,
  },
  planCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  selectedPlanCard: {
    elevation: 8,
    shadowOpacity: 0.2,
  },
  planGradient: {
    padding: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  duration: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  planDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 16,
  },
  featuresContainer: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
  subscribeContainer: {
    marginBottom: 30,
  },
  subscribeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  subscribeGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  bottomContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  agreementButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 8,
  },
  agreementGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  agreementButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
  },
  subscriptionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  noticeContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
}); 