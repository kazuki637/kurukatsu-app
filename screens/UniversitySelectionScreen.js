import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';

const DUMMY_UNIVERSITIES = [
  '東京大学', '京都大学', '大阪大学', '早稲田大学', '慶應義塾大学', '一橋大学', '東京工業大学',
  '北海道大学', '東北大学', '名古屋大学', '九州大学', '神戸大学', '筑波大学', '広島大学',
  '横浜国立大学', '千葉大学', '岡山大学', '金沢大学', '熊本大学', '長崎大学', '新潟大学',
  '信州大学', '静岡大学', '滋賀大学', '和歌山大学', '愛媛大学', '香川大学', '高知大学',
  '徳島大学', '佐賀大学', '大分大学', '宮崎大学', '鹿児島大学', '琉球大学', '国際基督教大学',
  '上智大学', '同志社大学', '立命館大学', '関西大学', '関西学院大学', '明治大学', '青山学院大学',
  '立教大学', '中央大学', '法政大学', '東洋大学', '駒澤大学', '専修大学',
  '近畿大学', '龍谷大学', '甲南大学', '京都産業大学', '中京大学', '南山大学', '福岡大学',
  '西南学院大学', '学習院大学', '成蹊大学', '成城大学', '武蔵大学', '獨協大学', '國學院大學',
  '武蔵野大学', '東京農業大学', '東京理科大学', '芝浦工業大学', '日本女子大学', '東京女子大学',
  '津田塾大学', '聖心女子大学', '白百合女子大学', 'フェリス女学院大学', '共立女子大学',
  '大妻女子大学', '実践女子大学', '昭和女子大学', '東京家政大学', '文化学園大学',
  '日本体育大学', '順天堂大学', '帝京大学', '国士舘大学', '拓殖大学',
  '神奈川大学', '玉川大学', '創価大学', '明星大学', '桜美林大学', '文教大学', '麗澤大学',
  '城西大学', '東京経済大学', '武蔵野美術大学', '多摩美術大学', '日本歯科大学',
  '東京医科大学', '日本医科大学', '東京慈恵会医科大学', '昭和大学', '東邦大学',
  '杏林大学', '聖マリアンナ医科大学',
  '北里大学', '埼玉医科大学', '獨協医科大学', '自治医科大学', '産業医科大学',
  '藤田医科大学', '愛知医科大学', '大阪医科薬科大学', '関西医科大学', '兵庫医科大学',
  '川崎医科大学', '久留米大学',
  '旭川医科大学', '札幌医科大学', '弘前大学', '秋田大学', '山形大学',
  '福島県立医科大学', '群馬大学', '千葉大学', '東京医科歯科大学',
  '横浜市立大学', '新潟大学', '富山大学', '金沢大学', '福井大学',
  '山梨大学', '信州大学', '岐阜大学', '浜松医科大学', '名古屋市立大学',
  '三重大学', '滋賀医科大学', '京都府立医科大学', '大阪市立大学', '奈良県立医科大学',
  '和歌山県立医科大学', '鳥取大学', '島根大学', '岡山大学', '広島大学',
  '山口大学', '徳島大学', '香川大学', '愛媛大学', '高知大学',
  '九州大学', '佐賀大学', '長崎大学', '熊本大学', '大分大学',
  '宮崎大学', '鹿児島大学', '琉球大学',
];

const UniversitySelectionScreen = ({ route, navigation }) => {
  const { currentSelection, onComplete } = route.params || {};
  const [searchText, setSearchText] = useState('');
  const [allUniversities, setAllUniversities] = useState([]);
  const [filteredUniversities, setFilteredUniversities] = useState([]);
  const [selectedUniversities, setSelectedUniversities] = useState(currentSelection || []);
  const [loadingUniversities, setLoadingUniversities] = useState(true);

  useEffect(() => {
    const fetchUniversities = async () => {
      setLoadingUniversities(true);
      const uniqueUniversities = Array.from(new Set(DUMMY_UNIVERSITIES));
      await new Promise(resolve => setTimeout(resolve, 500));
      setAllUniversities(uniqueUniversities);
      setFilteredUniversities(uniqueUniversities);
      setLoadingUniversities(false);
    };

    fetchUniversities();
  }, []);

  useEffect(() => {
    if (searchText) {
      const filtered = allUniversities.filter(uni =>
        uni.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredUniversities(filtered);
    } else {
      setFilteredUniversities(allUniversities);
    }
  }, [searchText, allUniversities]);

  const handleToggleUniversity = (universityName) => {
    setSelectedUniversities(prev =>
      prev.includes(universityName)
        ? prev.filter(uni => uni !== universityName)
        : [...prev, universityName]
    );
  };

  // 戻る時にonCompleteを呼ぶ
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (onComplete) onComplete(selectedUniversities);
    });
    return unsubscribe;
  }, [navigation, selectedUniversities, onComplete]);

  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader title="大学選択" showBackButton onBack={() => navigation.goBack()} />
      <SafeAreaView style={styles.contentSafeArea}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="大学名を入力"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {loadingUniversities ? (
          <ActivityIndicator size="large" color="#007bff" style={styles.loadingIndicator} />
        ) : (
          <FlatList
            data={filteredUniversities}
            keyExtractor={(item, index) => item + index}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleToggleUniversity(item)}
              >
                <Text style={styles.listItemText}>{item}</Text>
                {selectedUniversities.includes(item) && (
                  <Ionicons name="checkmark" size={24} color="#007bff" />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <Text style={styles.emptyListText}>該当する大学がありません。</Text>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#eef2f5',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#eef2f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
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
  loadingIndicator: {
    marginTop: 20,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60, // 固定の高さ
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listItemText: {
    fontSize: 16,
    color: '#333',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});

export default UniversitySelectionScreen;