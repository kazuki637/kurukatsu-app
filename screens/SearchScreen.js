import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import KurukatsuButton from '../components/KurukatsuButton';

const SearchScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedUniversities, setSelectedUniversities] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [selectedFrequency, setSelectedFrequency] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedGenderRatio, setSelectedGenderRatio] = useState([]);
  const [selectedActivityDays, setSelectedActivityDays] = useState([]);
  const [selectedCircleType, setSelectedCircleType] = useState(''); // サークル種別を追加
  
  const [allCircles, setAllCircles] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // 遷移状態管理
  const [isNavigating, setIsNavigating] = useState(false);
  

  // グローバルキャッシュの初期化とキャッシュ無効化関数の登録
  useEffect(() => {
    if (!global.circlesCache) {
      global.circlesCache = {
        data: null,
        timestamp: null,
        maxAge: 5 * 60 * 1000 // 5分
      };
    }

    // キャッシュ無効化関数をグローバルに登録
    global.invalidateCirclesCache = () => {
      global.circlesCache.data = null;
      global.circlesCache.timestamp = null;
    };

    return () => {
      delete global.invalidateCirclesCache;
    };
  }, []);

  // 初回ロード時のみデータ取得（キャッシュ機能付き）
  useEffect(() => {
    const fetchAllCircles = async () => {
      try {
        // キャッシュチェック
        const now = Date.now();
        if (global.circlesCache.data && 
            global.circlesCache.timestamp && 
            (now - global.circlesCache.timestamp) < global.circlesCache.maxAge) {
          setAllCircles(global.circlesCache.data);
          setInitialLoading(false);
          return;
        }
        const circlesCollectionRef = collection(db, 'circles');
        const querySnapshot = await getDocs(circlesCollectionRef);
        const circles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // キャッシュに保存
        global.circlesCache.data = circles;
        global.circlesCache.timestamp = now;
        
        setAllCircles(circles);
      } catch (error) {
        console.error("Error fetching all circles: ", error);
        alert('サークル情報の取得に失敗しました。');
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchAllCircles();
  }, []);

  // フィルタリングをuseMemoで最適化
  const filteredCircles = useMemo(() => {
    if (initialLoading || allCircles.length === 0) return [];

    return allCircles.filter(circle => {
      const searchTextLower = searchText.toLowerCase();
      const matchesSearchText = searchText 
        ? (circle.name?.toLowerCase().includes(searchTextLower) || 
           circle.description?.toLowerCase().includes(searchTextLower) ||
           circle.activityLocation?.toLowerCase().includes(searchTextLower) ||
           circle.universityName?.toLowerCase().includes(searchTextLower)) 
        : true;

      const matchesUniversity = selectedUniversities.length > 0 
        ? selectedUniversities.includes(circle.universityName) 
        : true;

      const matchesGenre = selectedGenres.length > 0 
        ? selectedGenres.includes(circle.genre) 
        : true;

      const matchesFeatures = selectedFeatures.length > 0 
        ? selectedFeatures.some(feature => circle.features?.includes(feature)) 
        : true;
          
      const matchesFrequency = selectedFrequency.length > 0 
        ? selectedFrequency.includes(circle.frequency) 
        : true;

      const matchesMembers = selectedMembers.length > 0 
        ? selectedMembers.includes(circle.members) 
        : true;

      const matchesGenderRatio = selectedGenderRatio.length > 0 
        ? selectedGenderRatio.includes(circle.genderratio) 
        : true;

      const matchesActivityDays = selectedActivityDays.length > 0 
        ? selectedActivityDays.some(day => circle.activityDays?.includes(day)) 
        : true;

      const matchesCircleType = selectedCircleType 
        ? circle.circleType === selectedCircleType 
        : true;

      return matchesSearchText && matchesUniversity && matchesGenre && matchesFeatures && matchesFrequency && matchesMembers && matchesGenderRatio && matchesActivityDays && matchesCircleType;
    });
  }, [searchText, selectedUniversities, selectedGenres, selectedFeatures, selectedFrequency, selectedMembers, selectedGenderRatio, selectedActivityDays, selectedCircleType, allCircles, initialLoading]);

  // フォーカス時にキャッシュをチェックして必要に応じて更新
  useFocusEffect(
    useCallback(() => {
      // キャッシュが無効化されている場合は最新データを取得
      if (!global.circlesCache.data) {
        const fetchAllCircles = async () => {
          try {
            const circlesCollectionRef = collection(db, 'circles');
            const querySnapshot = await getDocs(circlesCollectionRef);
            const circles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // キャッシュを更新
            global.circlesCache.data = circles;
            global.circlesCache.timestamp = Date.now();
            
            setAllCircles(circles);
          } catch (error) {
            console.error("Error fetching circles on focus: ", error);
          }
        };
        
        fetchAllCircles();
      }
    }, [])
  );

  // 画面にフォーカスが戻った時に遷移状態をリセット
  useFocusEffect(
    useCallback(() => {
      setIsNavigating(false);
    }, [])
  );

  const updateFilter = (filterType, value) => {
    switch (filterType) {
      case 'universities': setSelectedUniversities(value); break;
      case 'genres': setSelectedGenres(value); break;
      case 'features': setSelectedFeatures(value); break;
      case 'frequency': setSelectedFrequency(value); break;
      case 'members': setSelectedMembers(value); break;
      case 'genderRatio': setSelectedGenderRatio(value); break;
      case 'activityDays': setSelectedActivityDays(value); break;
      case 'circleType': setSelectedCircleType(value); break;
      default: break;
    }
  };

  // 安全なナビゲーション関数（連続タップ防止）
  const navigateToFilter = useCallback((screenName, params) => {
    if (isNavigating) {
      console.log('既に遷移中のため、新しい遷移を無視します:', screenName);
      return;
    }
    
    setIsNavigating(true);
    console.log('フィルター画面への遷移開始:', screenName);
    
    // 遷移完了を検知するためのタイマー
    setTimeout(() => {
      setIsNavigating(false);
      console.log('遷移状態をリセットしました');
    }, 500); // 遷移完了まで500ms待機
    
    navigation.navigate(screenName, params);
  }, [isNavigating, navigation]);

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedUniversities([]);
    setSelectedGenres([]);
    setSelectedFeatures([]);
    setSelectedFrequency([]);
    setSelectedMembers([]);
    setSelectedGenderRatio([]);
    setSelectedActivityDays([]);
    setSelectedCircleType(''); // サークル種別もリセット
  };

  const handleSearch = async () => {
    try {
      // キャッシュが有効な場合はそれを使用、そうでなければ最新データを取得
      const now = Date.now();
      let circlesToUse = allCircles;
      
      if (!global.circlesCache.data || 
          !global.circlesCache.timestamp || 
          (now - global.circlesCache.timestamp) >= global.circlesCache.maxAge) {
        const circlesCollectionRef = collection(db, 'circles');
        const querySnapshot = await getDocs(circlesCollectionRef);
        circlesToUse = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // キャッシュを更新
        global.circlesCache.data = circlesToUse;
        global.circlesCache.timestamp = now;
      }
      
      // 現在のフィルタリング結果を使用（既に最適化済み）
      navigation.navigate('SearchResults', { circles: filteredCircles });
    } catch (error) {
      console.error("Error in handleSearch: ", error);
      // エラーが発生した場合は、現在のフィルタリング結果を使用
      navigation.navigate('SearchResults', { circles: filteredCircles });
    }
  };

  const formatFilterValue = (value) => {
    if (!value || value.length === 0) return '指定なし';
    if (value.length <= 2) return value.join('、');
    return `${value[0]}、他${value.length - 1}件`;
  };

  const getFilterIcon = (label) => {
    switch (label) {
      case '大学': return <Ionicons name="school-outline" size={18} color="#1380ec" style={{ marginRight: 8 }} />;
      case 'ジャンル': return <Ionicons name="grid-outline" size={18} color="#1380ec" style={{ marginRight: 8 }} />;
      case '特色': return <Ionicons name="star-outline" size={18} color="#1380ec" style={{ marginRight: 8 }} />;
      case '活動頻度': return <Ionicons name="time-outline" size={18} color="#1380ec" style={{ marginRight: 8 }} />;
      case '活動曜日': return <Ionicons name="calendar-outline" size={18} color="#1380ec" style={{ marginRight: 8 }} />;
      case '人数': return <Ionicons name="people-outline" size={18} color="#1380ec" style={{ marginRight: 8 }} />;
      case '男女比': return <Ionicons name="male-female-outline" size={18} color="#1380ec" style={{ marginRight: 8 }} />;
      default: return null;
    }
  };

  const FilterItem = ({ label, value, onPress, disabled = false }) => (
    <TouchableOpacity 
      style={styles.filterItem} 
      onPress={disabled ? undefined : onPress} 
      activeOpacity={1}
      disabled={disabled}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {getFilterIcon(label)}
        <Text style={styles.filterLabel}>{label}</Text>
      </View>
      <View style={styles.filterValueContainer}>
        <Text style={[styles.filterValue, value && value.length > 0 && { color: '#1380ec', fontWeight: '500' }]} numberOfLines={1}>
          {formatFilterValue(value)}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.fullScreenContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>検索</Text>
      </View>
      <SafeAreaView style={styles.contentSafeArea}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="サークル名、活動内容、キーワード"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <ScrollView style={styles.filterSection} showsVerticalScrollIndicator={false}>
          {/* サークル種別選択 */}
          <View style={styles.circleTypeContainer}>
            <TouchableOpacity 
              style={styles.circleTypeButton} 
              onPress={() => updateFilter('circleType', selectedCircleType === '学内サークル' ? '' : '学内サークル')}
              activeOpacity={1}
            >
              <View style={styles.radioButton}>
                {selectedCircleType === '学内サークル' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.circleTypeText}>学内サークル</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.circleTypeButton} 
              onPress={() => updateFilter('circleType', selectedCircleType === 'インカレサークル' ? '' : 'インカレサークル')}
              activeOpacity={1}
            >
              <View style={styles.radioButton}>
                {selectedCircleType === 'インカレサークル' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.circleTypeText}>インカレサークル</Text>
            </TouchableOpacity>
          </View>

          <FilterItem 
            label="大学" 
            value={selectedUniversities} 
            disabled={isNavigating}
            onPress={() => navigateToFilter('UniversitySelection', { 
              currentSelection: selectedUniversities, 
              onComplete: (value) => updateFilter('universities', value) 
            })} 
          />
          <FilterItem 
            label="ジャンル" 
            value={selectedGenres} 
            disabled={isNavigating}
            onPress={() => navigateToFilter('GenreSelection', { 
              currentSelection: selectedGenres, 
              onComplete: (value) => updateFilter('genres', value) 
            })} 
          />
          <FilterItem 
            label="特色" 
            value={selectedFeatures} 
            disabled={isNavigating}
            onPress={() => navigateToFilter('FeatureSelection', { 
              currentSelection: selectedFeatures, 
              onComplete: (value) => updateFilter('features', value) 
            })} 
          />
          <FilterItem 
            label="活動頻度" 
            value={selectedFrequency} 
            disabled={isNavigating}
            onPress={() => navigateToFilter('FrequencySelection', { 
              currentSelection: selectedFrequency, 
              onComplete: (value) => updateFilter('frequency', value) 
            })} 
          />
          <FilterItem 
            label="活動曜日" 
            value={selectedActivityDays} 
            disabled={isNavigating}
            onPress={() => navigateToFilter('ActivityDaySelection', { 
              currentSelection: selectedActivityDays, 
              onComplete: (value) => updateFilter('activityDays', value) 
            })} 
          />
          <FilterItem 
            label="人数" 
            value={selectedMembers} 
            disabled={isNavigating}
            onPress={() => navigateToFilter('MembersSelection', { 
              currentSelection: selectedMembers, 
              onComplete: (value) => updateFilter('members', value) 
            })} 
          />
          <FilterItem 
            label="男女比" 
            value={selectedGenderRatio} 
            disabled={isNavigating}
            onPress={() => navigateToFilter('GenderRatioSelection', { 
              currentSelection: selectedGenderRatio, 
              onComplete: (value) => updateFilter('genderRatio', value) 
            })} 
          />
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.filterCountText}>
            <Text style={styles.filterCountNumber}>{filteredCircles.length}</Text>件に絞り込み中
          </Text>
          <View style={styles.footerButtons}>
            <KurukatsuButton
              title="リセット"
              onPress={handleClearFilters}
              variant="secondary"
              size="medium"
              style={styles.clearButtonContainer}
            />
            <KurukatsuButton
              title="この条件で検索"
              onPress={handleSearch}
              variant="primary"
              size="medium"
              style={styles.searchButtonContainer}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    width: '100%',
    height: 100, // ヘッダーの縦幅を調整
    paddingTop: StatusBar.currentHeight, // ステータスバーの高さ分を確保
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
    bottom: 10, // ヘッダー下部からの距離を調整
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
    color: '#6b7280',
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1f2937',
  },
  filterSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1f2937',
    marginLeft: 4,
  },
  filterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  filterValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  filterValue: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
    flexShrink: 1,
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  filterCountText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  filterCountNumber: {
    color: '#1380ec',
    fontWeight: 'bold',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  clearButtonContainer: {
    flex: 1,
  },
  searchButtonContainer: {
    flex: 2,
  },
  // サークル種別選択関連のスタイル
  circleTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  circleTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  circleTypeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1380ec',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1380ec',
  },
});

export default SearchScreen;
