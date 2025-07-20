import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, storage } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const { width } = Dimensions.get('window');

// CircleDetailScreenのプレビューコンポーネント
const CirclePreview = ({ circleData, isPreview = true }) => {
  return (
    <View style={styles.previewContainer}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>プレビュー</Text>
        <Text style={styles.previewSubtitle}>未入会者向け表示</Text>
      </View>
      
      <View style={styles.previewContent}>
        {circleData.imageUrl && <Image source={{ uri: circleData.imageUrl }} style={styles.previewAccountImage} />}
        <Text style={styles.previewCircleName}>{circleData.name || 'サークル名'}</Text>
        <Text style={styles.previewUniversityGenre}>
          {circleData.universityName || '大学名'} - {circleData.genre || 'ジャンル'}
        </Text>

        <Text style={styles.previewDescription}>
          {circleData.description || 'サークルの活動内容や魅力を具体的に記述してください'}
        </Text>

        {/* 追加情報セクション */}
        {circleData.frequency && (
          <View style={styles.previewInfoSection}>
            <Text style={styles.previewInfoTitle}>活動頻度</Text>
            <Text style={styles.previewInfoText}>{circleData.frequency}</Text>
          </View>
        )}
        
        {circleData.members && (
          <View style={styles.previewInfoSection}>
            <Text style={styles.previewInfoTitle}>人数</Text>
            <Text style={styles.previewInfoText}>{circleData.members}</Text>
          </View>
        )}
        
        {circleData.genderratio && (
          <View style={styles.previewInfoSection}>
            <Text style={styles.previewInfoTitle}>男女比</Text>
            <Text style={styles.previewInfoText}>{circleData.genderratio}</Text>
          </View>
        )}
        
        {circleData.features && circleData.features.length > 0 && (
          <View style={styles.previewInfoSection}>
            <Text style={styles.previewInfoTitle}>特色</Text>
            <Text style={styles.previewInfoText}>{circleData.features.join('、')}</Text>
          </View>
        )}

        {circleData.snsLink && (
          <View style={styles.previewInfoSection}>
            <Text style={styles.previewInfoTitle}>SNSリンク</Text>
            <Text style={styles.previewInfoText}>{circleData.snsLink}</Text>
          </View>
        )}
        
        {circleData.shinkanLineGroupLink && (
          <View style={styles.previewInfoSection}>
            <Text style={styles.previewInfoTitle}>新歓LINEグループ</Text>
            <Text style={styles.previewInfoText}>{circleData.shinkanLineGroupLink}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default function CircleProfileEditScreen({ route, navigation }) {
  const { circleId } = route.params;
  const [loading, setLoading] = useState(true);
  const [circle, setCircle] = useState(null);
  const [name, setName] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [features, setFeatures] = useState([]);
  const [frequency, setFrequency] = useState('');
  const [members, setMembers] = useState('');
  const [genderratio, setGenderratio] = useState('');
  const [snsLink, setSnsLink] = useState('');
  const [shinkanLineGroupLink, setShinkanLineGroupLink] = useState('');
  const [circleImage, setCircleImage] = useState(null);
  const [circleImageUrl, setCircleImageUrl] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  // プレビュー用のデータ
  const previewData = {
    name,
    universityName,
    description,
    genre,
    features,
    frequency,
    members,
    genderratio,
    snsLink,
    shinkanLineGroupLink,
    imageUrl: circleImage || circleImageUrl,
  };

  useEffect(() => {
    const fetchCircle = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'circles', circleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const d = docSnap.data();
          setCircle(d);
          setName(d.name || '');
          setUniversityName(d.universityName || '');
          setContactInfo(d.contactInfo || '');
          setDescription(d.description || '');
          setGenre(d.genre || '');
          setFeatures(d.features || []);
          setFrequency(d.frequency || '');
          setMembers(d.members || '');
          setGenderratio(d.genderratio || '');
          setSnsLink(d.snsLink || '');
          setShinkanLineGroupLink(d.shinkanLineGroupLink || '');
          setCircleImageUrl(d.imageUrl || '');
        }
      } catch (e) {
        Alert.alert('エラー', 'サークル情報の取得に失敗しました');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchCircle();
  }, [circleId]);

  const pickCircleImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('許可が必要です', 'サークルアイコン画像をアップロードするには、カメラロールへのアクセス許可が必要です。');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setCircleImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('エラー', 'サークル名を入力してください');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = circleImageUrl;
      if (circleImage) {
        const response = await fetch(circleImage);
        const blob = await response.blob();
        const storageRef = ref(storage, `circle_images/${circleId}`);
        await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      const docRef = doc(db, 'circles', circleId);
      await updateDoc(docRef, {
        name: name.trim(),
        description: description.trim(),
        genre,
        features,
        frequency,
        members,
        genderratio,
        snsLink: snsLink.trim(),
        shinkanLineGroupLink: shinkanLineGroupLink.trim(),
        imageUrl,
      });
      
      Alert.alert('保存完了', 'サークルプロフィールを保存しました');
      navigation.goBack();
    } catch (e) {
      console.error('Error saving circle profile:', e);
      Alert.alert('エラー', 'サークルプロフィールの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プロフィール編集</Text>
        <TouchableOpacity 
          style={styles.previewToggleButton} 
          onPress={() => setShowPreview(!showPreview)}
        >
          <Ionicons name={showPreview ? "eye-off" : "eye"} size={24} color="#007bff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        {showPreview && (
          <View style={styles.previewSection}>
            <CirclePreview circleData={previewData} />
          </View>
        )}
        
        <ScrollView 
          style={styles.editSection}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* サークルアイコン画像 */}
          <View style={styles.imageSection}>
            <Text style={styles.label}>サークルアイコン</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickCircleImage}>
              {circleImage || circleImageUrl ? (
                <Image source={{ uri: circleImage || circleImageUrl }} style={styles.circleImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={40} color="#ccc" />
                  <Text style={styles.imagePlaceholderText}>画像を選択</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* 基本情報 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>サークル名 *</Text>
            <TextInput 
              style={styles.input} 
              value={name} 
              onChangeText={setName}
              placeholder="サークル名を入力"
              maxLength={50}
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>大学名</Text>
            <TextInput 
              style={[styles.input, styles.disabledInput]} 
              value={universityName} 
              onChangeText={setUniversityName}
              placeholder="登録時に設定された大学名"
              maxLength={50}
              editable={false}
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>代表者連絡先</Text>
            <TextInput 
              style={[styles.input, styles.disabledInput]} 
              value={contactInfo} 
              onChangeText={setContactInfo}
              placeholder="登録時に設定された連絡先"
              maxLength={100}
              editable={false}
            />
          </View>

          {/* サークル紹介 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>サークル紹介</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              value={description} 
              onChangeText={setDescription}
              placeholder="サークルの活動内容や魅力を具体的に記述してください"
              multiline
              numberOfLines={6}
              maxLength={500}
            />
            <Text style={styles.characterCount}>{description.length}/500</Text>
          </View>

          {/* ジャンル */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>ジャンル</Text>
            <View style={styles.optionsContainer}>
              {['運動系（球技）', '運動系（球技以外）', 'アウトドア系', '文化系', '芸術・芸能', '音楽系', '学問系', 'ボランティア', 'イベント', 'オールラウンド', 'その他'].map(item => (
                <TouchableOpacity 
                  key={item} 
                  style={[styles.optionButton, genre === item && styles.optionButtonActive]} 
                  onPress={() => setGenre(item)}
                >
                  <Text style={[styles.optionButtonText, genre === item && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 特色 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>特色（複数選択可）</Text>
            <View style={styles.optionsContainer}>
              {['ワイワイ', '真剣', '初心者歓迎', '友達作り重視', 'イベント充実', '勉強サポート', '国際交流', 'アットホーム', 'スポーツ志向'].map(item => (
                <TouchableOpacity 
                  key={item} 
                  style={[styles.optionButton, features.includes(item) && styles.optionButtonActive]} 
                  onPress={() => setFeatures(prev => prev.includes(item) ? prev.filter(f => f !== item) : [...prev, item])}
                >
                  <Text style={[styles.optionButtonText, features.includes(item) && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 活動頻度 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>活動頻度</Text>
            <View style={styles.optionsContainer}>
              {['週１回', '週２回', '週３回', '月１回', '不定期'].map(item => (
                <TouchableOpacity 
                  key={item} 
                  style={[styles.optionButton, frequency === item && styles.optionButtonActive]} 
                  onPress={() => setFrequency(item)}
                >
                  <Text style={[styles.optionButtonText, frequency === item && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 人数 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>人数</Text>
            <View style={styles.optionsContainer}>
              {['1-10人', '11-30人', '31-50人', '51-100人', '100人以上'].map(item => (
                <TouchableOpacity 
                  key={item} 
                  style={[styles.optionButton, members === item && styles.optionButtonActive]} 
                  onPress={() => setMembers(item)}
                >
                  <Text style={[styles.optionButtonText, members === item && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 男女比 */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>男女比</Text>
            <View style={styles.optionsContainer}>
              {['男性多め', '女性多め', '半々'].map(item => (
                <TouchableOpacity 
                  key={item} 
                  style={[styles.optionButton, genderratio === item && styles.optionButtonActive]} 
                  onPress={() => setGenderratio(item)}
                >
                  <Text style={[styles.optionButtonText, genderratio === item && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* SNSリンク */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>SNSリンク</Text>
            <TextInput 
              style={styles.input} 
              value={snsLink} 
              onChangeText={setSnsLink}
              placeholder="Instagram, X, etc."
              maxLength={200}
            />
          </View>

          {/* 新歓LINEグループリンク */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>新歓LINEグループリンク</Text>
            <TextInput 
              style={styles.input} 
              value={shinkanLineGroupLink} 
              onChangeText={setShinkanLineGroupLink}
              placeholder="https://line.me/～"
              maxLength={200}
            />
          </View>

          {/* 保存ボタン */}
          <TouchableOpacity 
            style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]} 
            onPress={handleSave} 
            disabled={loading || !name.trim()}
          >
            <Text style={styles.saveButtonText}>
              {loading ? '保存中...' : '保存する'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  previewToggleButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  previewSection: {
    width: width * 0.4,
    backgroundColor: '#f8f8f8',
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  editSection: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  
  // プレビュー関連のスタイル
  previewContainer: {
    flex: 1,
    padding: 15,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  previewSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  previewContent: {
    alignItems: 'center',
  },
  previewAccountImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  previewCircleName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    color: '#333',
  },
  previewUniversityGenre: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 12,
    textAlign: 'center',
  },
  previewDescription: {
    fontSize: 13,
    textAlign: 'left',
    lineHeight: 18,
    marginBottom: 15,
    width: '100%',
    color: '#333',
  },
  previewInfoSection: {
    width: '100%',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  previewInfoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  previewInfoText: {
    fontSize: 12,
    color: '#666',
  },
  
  // 編集セクションのスタイル
  imageSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  imagePicker: {
    marginTop: 10,
  },
  circleImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  imagePlaceholderText: {
    marginTop: 5,
    fontSize: 12,
    color: '#999',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#666',
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  optionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  optionButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  optionButtonText: {
    color: '#333',
    fontSize: 13,
  },
  optionButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 