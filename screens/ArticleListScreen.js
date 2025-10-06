import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, FlatList } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { Ionicons } from '@expo/vector-icons';
import { getArticles } from '../services/notionService';

// 日付をフォーマットする関数（HomeScreenと同じ）
const formatDate = (dateValue) => {
  if (!dateValue) return '';
  
  try {
    let date;
    
    // Dateオブジェクトの場合
    if (dateValue instanceof Date) {
      date = dateValue;
    }
    // 文字列の場合
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    }
    // 数値（タイムスタンプ）の場合
    else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    }
    else {
      return dateValue; // フォーマットできない場合はそのまま返す
    }
    
    // 日付が有効かチェック
    if (isNaN(date.getTime())) {
      return dateValue;
    }
    
    // 日本語の曜日配列
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    
    return `${year}年${month}月${day}日（${weekday}）`;
    
  } catch (error) {
    console.error('日付のフォーマットに失敗:', error);
    return dateValue; // エラーの場合は元の値を返す
  }
};

const ArticleListScreen = ({ navigation }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 記事データを取得
  const fetchArticlesData = async () => {
    try {
      setLoading(true);
      
      // Notion APIから記事データを取得
      const articlesData = await getArticles();
      
      setArticles(articlesData);
    } catch (error) {
      console.error("Error fetching articles from Notion: ", error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticlesData();
  }, []);

  // 記事カードをレンダリング
  const renderArticleCard = ({ item: article }) => (
    <TouchableOpacity 
      style={styles.articleCard}
      onPress={() => navigation.navigate('ArticleWebView', { 
        url: article.url, 
        title: article.title 
      })}
    >
      {article.thumbnailUrl ? (
        <Image 
          source={{ uri: article.thumbnailUrl }} 
          style={styles.articleCardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.articleCardImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="document-text-outline" size={30} color="#ccc" />
        </View>
      )}
      <View style={styles.articleCardContent}>
        <Text style={styles.articleCardTitle} numberOfLines={2}>{article.title}</Text>
        <View style={styles.articleCardFooter}>
          {article.author && (
            <Text style={styles.articleCardSubtitle} numberOfLines={1}>{article.author}</Text>
          )}
          {article.createdAt && (
            <Text style={styles.articleCardDate}>{formatDate(article.createdAt)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader 
        title="記事一覧"
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      <SafeAreaView style={styles.contentSafeArea}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        ) : articles.length > 0 ? (
          <FlatList
            data={articles}
            renderItem={renderArticleCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>記事がありません</Text>
            <Text style={styles.emptySubText}>新しい記事をお待ちください</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 15,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  articleCard: {
    width: '48%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  articleCardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#f0f0f0',
  },
  articleCardContent: {
    flex: 1,
    padding: 12,
    position: 'relative',
  },
  articleCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    lineHeight: 16,
    paddingBottom: 25,
  },
  articleCardSubtitle: {
    fontSize: 10,
    color: '#666',
  },
  articleCardDate: {
    fontSize: 10,
    color: '#999',
  },
  articleCardFooter: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default ArticleListScreen;
