import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, Switch, Platform, ScrollView, StatusBar } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { auth, db, storage } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import CommonHeader from '../components/CommonHeader';
import { SafeAreaView } from 'react-native-safe-area-context';

const GRADES = ['大学1年', '大学2年', '大学3年', '大学4年', '大学院1年', '大学院2年', 'その他'];
const GENDERS = ['男性', '女性', 'その他', '回答しない'];

export default function ProfileEditScreen(props) {
  const navigation = useNavigation();
  const forceToHome = props.forceToHome || false;
  const user = auth.currentUser;
  const [name, setName] = useState(''); // 氏名（非公開）
  const [nickname, setNickname] = useState(''); // ニックネーム（公開）
  const [university, setUniversity] = useState('');
  const [isUniversityPublic, setIsUniversityPublic] = useState(true);
  const [grade, setGrade] = useState('');
  const [isGradePublic, setIsGradePublic] = useState(true);
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    getDoc(userDocRef).then((docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setName(d.name || '');
        setNickname(d.nickname || '');
        setUniversity(d.university || '');
        setIsUniversityPublic(d.isUniversityPublic !== false);
        setGrade(d.grade || '');
        setIsGradePublic(d.isGradePublic !== false);
        setGender(d.gender || '');
        setBirthday(d.birthday ? new Date(d.birthday) : new Date(2000, 0, 1));
        setProfileImageUrl(d.profileImageUrl || '');
      } else {
        // Firestoreにデータがなければ空欄のまま（setDocしない）
        setName('');
        setNickname('');
        setUniversity('');
        setIsUniversityPublic(true);
        setGrade('');
        setIsGradePublic(true);
        setGender('');
        setBirthday(new Date(2000, 0, 1));
        setProfileImageUrl('');
      }
    });
  }, [user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('許可が必要です', 'プロフィール画像をアップロードするには、カメラロールへのアクセス許可が必要です。');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      try {
        // 即時アップロード＆Firestore更新
        const response = await fetch(uri);
        const blob = await response.blob();
        const storageRef = ref(storage, `profile_images/${user.uid}`);
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        setProfileImageUrl(downloadUrl);
        // Firestoreも即時更新
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { profileImageUrl: downloadUrl });
        // 成功時のAlertは不要
      } catch (e) {
        Alert.alert('エラー', 'プロフィール画像のアップロードに失敗しました');
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !nickname.trim() || !university.trim() || !grade || !gender || !birthday) {
      Alert.alert('エラー', '全ての必須項目を入力してください。');
      return;
    }
    setLoading(true);
    try {
      // 画像アップロード処理はpickImageで即時実施済み
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        name,
        nickname,
        university,
        isUniversityPublic,
        grade,
        isGradePublic,
        gender,
        birthday: birthday.toISOString().split('T')[0],
        profileImageUrl: profileImageUrl,
      }, { merge: true });
      Alert.alert('保存完了', 'プロフィールを保存しました。');
      if (forceToHome) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          })
        );
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('エラー', 'プロフィールの保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CommonHeader title="プロフィール編集" showBackButton onBack={() => navigation.goBack()} rightButtonLabel="保存" onRightButtonPress={handleSave} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <View style={{ height: 16 }} />
          <View style={styles.formGroup}>
            <Text style={styles.label}>プロフィール画像（任意）</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
              <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                {(profileImage && profileImage.trim() !== '' && !imageError) || (profileImageUrl && profileImageUrl.trim() !== '' && !imageError) ? (
                  <Image
                    source={{ uri: (profileImage && profileImage.trim() !== '') ? profileImage : profileImageUrl }}
                    style={styles.profileImage}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <View style={[styles.profileImage, {backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}]}>
                    <Ionicons name="person-outline" size={60} color="#aaa" />
                  </View>
                )}
              </TouchableOpacity>
              {((profileImage && profileImage.trim() !== '') || (profileImageUrl && profileImageUrl.trim() !== '')) && !imageError && (
                <TouchableOpacity
                  onPress={() => {
                    setProfileImage(null);
                    setProfileImageUrl('');
                    setImageError(false);
                  }}
                  style={{ marginLeft: 12, padding: 8, backgroundColor: '#fee', borderRadius: 24 }}
                >
                  <Ionicons name="trash-outline" size={24} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>氏名（非公開）</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="氏名" />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>ニックネーム（公開）</Text>
            <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="ニックネーム" />
          </View>
          <View style={styles.formGroupRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>大学名</Text>
              <TextInput style={styles.input} value={university} onChangeText={setUniversity} placeholder="大学名" />
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>公開</Text>
              <Switch value={isUniversityPublic} onValueChange={setIsUniversityPublic} />
            </View>
          </View>
          <View style={styles.formGroupRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>学年</Text>
              <View style={styles.selectRow}>
                {GRADES.map(g => (
                  <TouchableOpacity key={g} style={[styles.selectButton, grade === g && styles.selectedButton]} onPress={() => setGrade(g)}>
                    <Text style={[styles.selectButtonText, grade === g && styles.selectedButtonText]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>公開</Text>
              <Switch value={isGradePublic} onValueChange={setIsGradePublic} />
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>性別</Text>
            <View style={styles.selectRow}>
              {GENDERS.map(g => (
                <TouchableOpacity key={g} style={[styles.selectButton, gender === g && styles.selectedButton]} onPress={() => setGender(g)}>
                  <Text style={[styles.selectButtonText, gender === g && styles.selectedButtonText]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>生年月日</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
              <Text style={styles.datePickerText}>{birthday ? birthday.toLocaleDateString('ja-JP') : '生年月日を選択'}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={birthday}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  locale="ja-JP"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setBirthday(selectedDate);
                  }}
                  maximumDate={new Date()}
                />
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
            <Text style={styles.saveButtonText}>{loading ? '保存中...' : '保存する'}</Text>
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  bodyContent: { padding: 20, paddingBottom: 40 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  formGroup: { marginBottom: 18 },
  formGroupRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  label: { fontSize: 16, color: '#333', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fafafa' },
  switchContainer: { alignItems: 'center', marginLeft: 12 },
  switchLabel: { fontSize: 14, color: '#333', marginBottom: 2 },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  selectButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#ccc', marginRight: 8, marginBottom: 6, backgroundColor: '#fff' },
  selectedButton: { backgroundColor: '#007bff', borderColor: '#007bff' },
  selectButtonText: { color: '#333', fontSize: 15 },
  selectedButtonText: { color: '#fff', fontWeight: 'bold' },
  datePickerButton: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, backgroundColor: '#fafafa', marginTop: 4 },
  datePickerText: { fontSize: 16, color: '#333' },
  datePickerContainer: { alignItems: 'center', marginTop: 8 },
  imagePicker: { alignItems: 'center', marginTop: 8 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  saveButton: { backgroundColor: '#007bff', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
