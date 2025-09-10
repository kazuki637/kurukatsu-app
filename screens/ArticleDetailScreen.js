import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import { db, storage, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

const { width: screenWidth } = Dimensions.get('window');

// 日付をフォーマットする関数
const formatDate = (dateValue) => {
  if (!dateValue) return '';
  
  try {
    let date;
    
    // FirestoreのTimestampの場合
    if (dateValue.toDate) {
      date = dateValue.toDate();
    }
    // 文字列の場合
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    }
    // Dateオブジェクトの場合
    else if (dateValue instanceof Date) {
      date = dateValue;
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

// 閲覧回数をフォーマットする関数
const formatViewCount = (count) => {
  if (count === 0) return '0';
  return count.toLocaleString();
};

const ArticleDetailScreen = ({ route, navigation }) => {
  const { articleId } = route.params || {};
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [headerImageUrl, setHeaderImageUrl] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({});
  const [blocks, setBlocks] = useState([]);
  const [user, setUser] = useState(null);
  const [viewCount, setViewCount] = useState(0);
  const [hasViewed, setHasViewed] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState({});
  const [allImagesReady, setAllImagesReady] = useState(false);

  // すべての画像の読み込み完了を待つ関数
  const waitForAllImagesToLoad = async (blocksData) => {
    const imageBlocks = blocksData.filter(block => block.type === 'image');
    
    if (imageBlocks.length === 0) {
      setAllImagesReady(true);
      return;
    }

    // 各画像の読み込み完了をPromiseで管理
    const imageLoadPromises = imageBlocks.map((block) => {
      return new Promise((resolve) => {
        Image.getSize(
          block.url,
          (width, height) => {
            setImageDimensions(prev => ({
              ...prev,
              [block.url]: { width, height },
            }));
            setImagesLoaded(prev => ({
              ...prev,
              [block.url]: true,
            }));
            resolve();
          },
          (error) => {
            console.error('画像の読み込みに失敗:', error);
            setImagesLoaded(prev => ({
              ...prev,
              [block.url]: true,
            }));
            resolve(); // エラーでも完了として扱う
          }
        );
      });
    });

    // すべての画像の読み込み完了を待つ
    await Promise.all(imageLoadPromises);
    setAllImagesReady(true);
  };

  // 画像のサイズを動的に計算する関数
  const getImageStyle = (imageUrl) => {
    const dimensions = imageDimensions[imageUrl];
    if (dimensions) {
      const { width, height } = dimensions;
      const aspectRatio = width / height;
      const maxWidth = screenWidth - 40; // 左右のパディングを考慮
      const calculatedHeight = maxWidth / aspectRatio;
      
      return {
        width: maxWidth,
        height: calculatedHeight,
        marginTop: 5,
        alignSelf: 'center',
      };
    }
    
    // デフォルトスタイル
    return {
      width: '100%',
      height: 250,
      marginTop: 5,
      alignSelf: 'center',
    };
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) {
        setError('記事IDが指定されていません');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Firestoreから記事データを取得
        const articleDoc = await getDoc(doc(db, 'articles', articleId));
        
        if (!articleDoc.exists()) {
          setError('記事が見つかりません');
          setLoading(false);
          return;
        }

        const articleData = { id: articleDoc.id, ...articleDoc.data() };
        setArticle(articleData);
        setViewCount(articleData.viewCount || 0); // 閲覧回数をstateに設定

        // 閲覧回数を一度だけ増加
        if (!hasViewed) {
          await updateDoc(doc(db, 'articles', articleId), {
            viewCount: increment(1)
          });
          
          // 閲覧回数を更新
          setViewCount((articleData.viewCount || 0) + 1);
          setHasViewed(true);
        }

        // ヘッダー画像を取得
        if (articleData.title) {
          try {
            const headerImageRef = ref(storage, `articles/${articleData.title}/header`);
            const headerUrl = await getDownloadURL(headerImageRef);
            setHeaderImageUrl(headerUrl);
          } catch (headerError) {

            // ヘッダー画像がなくてもエラーにはしない
          }
        }

        // blocks配列が存在する場合はそれを使用、なければ後方互換性のために段落と画像を別々に読み込み
        let blocksData = [];
        
        if (articleData.blocks && Array.isArray(articleData.blocks)) {
          blocksData = articleData.blocks;
        } else {
          
          // 段落データを読み込み
          let paragraphIndex = 1;
          while (articleData[`paragraph${paragraphIndex}`]) {
            blocksData.push({
              type: 'paragraph',
              text: articleData[`paragraph${paragraphIndex}`]
            });
            paragraphIndex++;
          }
          
          // 画像データを読み込み（imageFilesがある場合）
          if (articleData.imageFiles && Array.isArray(articleData.imageFiles)) {
            for (const imageFile of articleData.imageFiles) {
              try {
                const imagePath = `articles/${articleData.title}/images/${imageFile}`;
                const imageRef = ref(storage, imagePath);
                const imageUrl = await getDownloadURL(imageRef);
                blocksData.push({
                  type: 'image',
                  url: imageUrl,
                  fileName: imageFile
                });
              } catch (error) {
                console.error('Error loading image:', error);
              }
            }
          }
        }
        
        setBlocks(blocksData);

        // 画像の読み込み完了を待つ
        await waitForAllImagesToLoad(blocksData);

      } catch (err) {
        console.error('記事の取得に失敗:', err);
        setError('記事の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  if (loading || !allImagesReady) {
    return (
      <View style={styles.container}>
        <CommonHeader 
          title="記事詳細" 
          showBackButton={true} 
          onBack={() => navigation.goBack()}
        />
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <CommonHeader 
          title="記事詳細" 
          showBackButton={true} 
          onBack={() => navigation.goBack()}
        />
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#ff6b6b" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.container}>
        <CommonHeader 
          title="記事詳細" 
          showBackButton={true} 
          onBack={() => navigation.goBack()}
        />
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.errorContainer}>
            <Ionicons name="document-outline" size={48} color="#999" />
            <Text style={styles.errorText}>記事が見つかりません</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CommonHeader 
        title="記事詳細" 
        showBackButton={true} 
        onBack={() => navigation.goBack()}
      />
      <SafeAreaView style={styles.contentSafeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* 記事ヘッダー画像 */}
          {headerImageUrl && (
            <Image 
              source={{ uri: headerImageUrl }} 
              style={styles.articleImage}
              resizeMode="cover"
            />
          )}
          
          {/* 記事内容 */}
          <View style={styles.articleContent}>
            <Text style={styles.articleTitle}>{article.title}</Text>
            {article.subtitle && (
              <Text style={styles.articleSubtitle}>{article.subtitle}</Text>
            )}
            
            {/* 掲載日と閲覧回数を横並びで表示 */}
            <View style={styles.dateAndViewContainer}>
              {article.createdAt && (
                <Text style={styles.articleDate}>
                  {formatDate(article.createdAt)}
                </Text>
              )}
              
              {/* 閲覧回数 */}
              <Text style={styles.viewCount}>
                <Text style={styles.viewCountNumber}>{formatViewCount(viewCount)}</Text> Views
              </Text>
            </View>
            
            {/* ブロックコンテンツ */}
            {blocks.map((block, index) => (
              <View key={index} style={styles.paragraphContainer}>
                {block.type === 'paragraph' ? (
                  <Text style={styles.articleBody}>{block.text}</Text>
                ) : block.type === 'image' ? (
                  <Image 
                    source={{ uri: block.url }} 
                    style={getImageStyle(block.url)}
                    resizeMode="contain"
                  />
                ) : null}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  articleImage: {
    width: '100%',
    height: 250,
  },
  articleContent: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: -20,
    minHeight: '100%',
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  articleSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  articleDate: {
    fontSize: 14,
    color: '#999',
  },
  viewCount: {
    fontSize: 14,
    color: '#999',
  },
  viewCountNumber: {
    fontWeight: 'bold',
  },
  contentDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  paragraphContainer: {
    marginBottom: 15, // 段落間の間隔を調整
  },
  articleBody: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 0, // 画像がある場合は間隔を削除
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  dateAndViewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
});

export default ArticleDetailScreen;
