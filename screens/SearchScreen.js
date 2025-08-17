import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';

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
  const [filteredCircles, setFilteredCircles] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // 1. Fetch all circles when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const fetchAllCircles = async () => {
        try {
          const circlesCollectionRef = collection(db, 'circles');
          const querySnapshot = await getDocs(circlesCollectionRef);
          const circles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllCircles(circles);
          setFilteredCircles(circles); // Initially, all circles are shown
        } catch (error) {
          console.error("Error fetching all circles: ", error);
          alert('サークル情報の取得に失敗しました。');
        } finally {
          setInitialLoading(false);
        }
      };
      fetchAllCircles();
    }, [])
  );

  // 2. Re-filter circles whenever a filter changes
  useEffect(() => {
    if (initialLoading) return; // Don't filter until initial data is loaded

    const filtered = allCircles.filter(circle => {
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

    setFilteredCircles(filtered);

  }, [searchText, selectedUniversities, selectedGenres, selectedFeatures, selectedFrequency, selectedMembers, selectedGenderRatio, selectedActivityDays, selectedCircleType, allCircles, initialLoading]);


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
      // 検索時に最新のサークルデータを取得
      const circlesCollectionRef = collection(db, 'circles');
      const querySnapshot = await getDocs(circlesCollectionRef);
      const latestCircles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 最新データでフィルタリングを再実行
      const latestFiltered = latestCircles.filter(circle => {
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
      
      navigation.navigate('SearchResults', { circles: latestFiltered });
    } catch (error) {
      console.error("Error fetching latest circles: ", error);
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
      case '大学': return <Ionicons name="school-outline" size={18} color="#007bff" style={{ marginRight: 6 }} />;
      case 'ジャンル': return <Ionicons name="grid-outline" size={18} color="#007bff" style={{ marginRight: 6 }} />;
      case '特色': return <Ionicons name="star-outline" size={18} color="#007bff" style={{ marginRight: 6 }} />;
      case '活動頻度': return <Ionicons name="time-outline" size={18} color="#007bff" style={{ marginRight: 6 }} />;
      case '活動曜日': return <Ionicons name="calendar-outline" size={18} color="#007bff" style={{ marginRight: 6 }} />;
      case '人数': return <Ionicons name="people-outline" size={18} color="#007bff" style={{ marginRight: 6 }} />;
      case '男女比': return <Ionicons name="male-female-outline" size={18} color="#007bff" style={{ marginRight: 6 }} />;
      default: return null;
    }
  };

  const FilterItem = ({ label, value, onPress }) => (
    <TouchableOpacity style={styles.filterItem} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {getFilterIcon(label)}
        <Text style={styles.filterLabel}>{label}</Text>
      </View>
      <View style={styles.filterValueContainer}>
        <Text style={[styles.filterValue, value && value.length > 0 && { color: '#007bff' }]} numberOfLines={1}>{formatFilterValue(value)}</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
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
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="サークル名、活動内容、キーワード"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <ScrollView style={styles.filterSection}>
          <Text style={styles.sectionTitle}>サークル情報</Text>
          
          {/* サークル種別選択 */}
          <View style={styles.circleTypeContainer}>
            <TouchableOpacity 
              style={styles.circleTypeButton} 
              onPress={() => updateFilter('circleType', selectedCircleType === '学内サークル' ? '' : '学内サークル')}
            >
              <View style={styles.radioButton}>
                {selectedCircleType === '学内サークル' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.circleTypeText}>学内サークル</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.circleTypeButton} 
              onPress={() => updateFilter('circleType', selectedCircleType === 'インカレサークル' ? '' : 'インカレサークル')}
            >
              <View style={styles.radioButton}>
                {selectedCircleType === 'インカレサークル' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.circleTypeText}>インカレサークル</Text>
            </TouchableOpacity>
          </View>

          <FilterItem label="大学" value={selectedUniversities} onPress={() => navigation.navigate('UniversitySelection', { currentSelection: selectedUniversities, onComplete: (value) => updateFilter('universities', value) })} />
          <FilterItem label="ジャンル" value={selectedGenres} onPress={() => navigation.navigate('GenreSelection', { currentSelection: selectedGenres, onComplete: (value) => updateFilter('genres', value) })} />
          <FilterItem label="特色" value={selectedFeatures} onPress={() => navigation.navigate('FeatureSelection', { currentSelection: selectedFeatures, onComplete: (value) => updateFilter('features', value) })} />
          <FilterItem label="活動頻度" value={selectedFrequency} onPress={() => navigation.navigate('FrequencySelection', { currentSelection: selectedFrequency, onComplete: (value) => updateFilter('frequency', value) })} />
          <FilterItem label="活動曜日" value={selectedActivityDays} onPress={() => navigation.navigate('ActivityDaySelection', { currentSelection: selectedActivityDays, onComplete: (value) => updateFilter('activityDays', value) })} />
          <FilterItem label="人数" value={selectedMembers} onPress={() => navigation.navigate('MembersSelection', { currentSelection: selectedMembers, onComplete: (value) => updateFilter('members', value) })} />
          <FilterItem label="男女比" value={selectedGenderRatio} onPress={() => navigation.navigate('GenderRatioSelection', { currentSelection: selectedGenderRatio, onComplete: (value) => updateFilter('genderRatio', value) })} />
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.filterCountText}>
            <Text style={styles.filterCountNumber}>{filteredCircles.length}</Text>件に絞り込み中
          </Text>
          <View style={styles.footerButtons}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
              <Text style={styles.clearButtonText}>リセット</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="search" size={20} color="#fff" style={{ marginRight: 5 }} />
                <Text style={styles.searchButtonText}>この条件で検索</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#eef2f5',
  },
  header: {
    width: '100%',
    height: 115, // ヘッダーの縦幅を調整
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
    backgroundColor: '#eef2f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 15,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filterSection: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  filterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterLabel: {
    fontSize: 16,
    color: '#333',
  },
  filterValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  filterValue: {
    fontSize: 16,
    color: '#666',
    marginRight: 5,
    flexShrink: 1,
  },
  footer: {
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    alignItems: 'center', // 中央寄せ
  },
  filterCountText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  filterCountNumber: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 15,
  },
  clearButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  clearButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
    minWidth: 120, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // サークル種別選択関連のスタイル
  circleTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  circleTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  circleTypeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007bff',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007bff',
  },
});

export default SearchScreen;