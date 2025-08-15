import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import { db, storage, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

const { width: screenWidth } = Dimensions.get('window');

const ArticleDetailScreen = ({ route, navigation }) => {
  const { articleId } = route.params || {};
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [headerImageUrl, setHeaderImageUrl] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({});
  const [blocks, setBlocks] = useState([]);
  const [user, setUser] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // いいねボタンの処理
  const handleLike = async () => {
    if (!user) {
      // ログインしていない場合は何もしない
      return;
    }

    try {
      const articleRef = doc(db, 'articles', articleId);
      const userRef = doc(db, 'users', user.uid);

      if (isLiked) {
        // いいねを削除
        await updateDoc(articleRef, { likes: increment(-1) });
        // ユーザーのいいねした記事IDから削除
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const likedArticleIds = userData.likedArticleIds || [];
          const updatedLikedArticleIds = likedArticleIds.filter(id => id !== articleId);
          await updateDoc(userRef, { likedArticleIds: updatedLikedArticleIds });
        }
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        // いいねを追加
        await updateDoc(articleRef, { likes: increment(1) });
        // ユーザーのいいねした記事IDに追加
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const likedArticleIds = userData.likedArticleIds || [];
          if (!likedArticleIds.includes(articleId)) {
            const updatedLikedArticleIds = [...likedArticleIds, articleId];
            await updateDoc(userRef, { likedArticleIds: updatedLikedArticleIds });
          }
        }
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('いいねの処理に失敗しました:', error);
    }
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
        setLikeCount(articleData.likes || 0);

        // ヘッダー画像を取得
        if (articleData.title) {
          try {
            const headerImageRef = ref(storage, `articles/${articleData.title}/header`);
            const headerUrl = await getDownloadURL(headerImageRef);
            setHeaderImageUrl(headerUrl);
          } catch (headerError) {
            console.log('ヘッダー画像が見つかりません:', headerError);
            // ヘッダー画像がなくてもエラーにはしない
          }
        }

        // いいねの状態を監視
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const likedArticles = userData.likedArticleIds || [];
            setIsLiked(likedArticles.includes(articleId));
          }
        }

        // blocks配列が存在する場合はそれを使用、なければ後方互換性のために段落と画像を別々に読み込み
        let blocksData = [];
        
        if (articleData.blocks && Array.isArray(articleData.blocks)) {
          console.log('blocks配列を使用:', articleData.blocks);
          blocksData = articleData.blocks;
        } else {
          console.log('後方互換性モード: 段落と画像を別々に読み込み');
          
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

      } catch (err) {
        console.error('記事の取得に失敗:', err);
        setError('記事の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId, user]);

  if (loading) {
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
            {article.date && (
              <Text style={styles.articleDate}>{article.date}</Text>
            )}
            
            {/* いいねボタン */}
            <View style={styles.likeContainer}>
              <TouchableOpacity 
                style={styles.likeButton} 
                onPress={handleLike}
                disabled={!user}
              >
                <Ionicons 
                  name={isLiked ? 'heart' : 'heart-outline'} 
                  size={24} 
                  color={isLiked ? '#ff6b9d' : '#666'} 
                />
                <Text style={[styles.likeText, isLiked && styles.likeTextActive]}>
                  {likeCount}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.contentDivider} />
            
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
                    onLoad={(event) => {
                      const { width, height } = event.nativeEvent.source;
                      setImageDimensions(prev => ({
                        ...prev,
                        [block.url]: { width, height },
                      }));
                    }}
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
    marginBottom: 20,
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
  // いいねボタンのスタイル
  likeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  likeText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
    fontWeight: '600',
  },
  likeTextActive: {
    color: '#ff6b9d',
  },
});

export default ArticleDetailScreen;
