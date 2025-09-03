import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, Switch, Platform, ScrollView, StatusBar } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { auth, db, storage } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import { useNavigation, useRoute, CommonActions, useFocusEffect } from '@react-navigation/native';
import CommonHeader from '../components/CommonHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import universitiesData from '../universities.json';
import { compressProfileImage } from '../utils/imageCompression';
import { deleteExistingProfileImages } from '../utils/imageCrop';


const GRADES = ['大学1年', '大学2年', '大学3年', '大学4年', '大学院1年', '大学院2年', 'その他'];
const GENDERS = ['男性', '女性', 'その他', '回答しない'];

export default function ProfileEditScreen(props) {
  const navigation = useNavigation();
  const route = useRoute();
  const forceToHome = props.forceToHome || false;
  const user = auth.currentUser;
  const [name, setName] = useState(''); // 氏名（非公開）
  const [university, setUniversity] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // 学生証関連の状態
  const [studentIdImage, setStudentIdImage] = useState(null);
  const [studentIdUrl, setStudentIdUrl] = useState('');
  const [isIdConfirmed, setIsIdConfirmed] = useState(false);
  
  // オートコンプリート用の状態
  const [universitySuggestions, setUniversitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // 未保存変更検知用の状態
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  // 大学名の候補をフィルタリングする関数
  const filterUniversities = (input) => {
    if (!input.trim()) {
      setUniversitySuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    const filtered = universitiesData.filter(uni => 
      uni.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 10); // 最大10件まで表示
    
    setUniversitySuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  // 大学名が変更された時の処理
  const handleUniversityChange = (text) => {
    setUniversity(text);
    
    // 入力が空の場合は候補を非表示
    if (!text.trim()) {
      setUniversitySuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // 入力に応じて候補をフィルタリング
    filterUniversities(text);
  };

  // 候補を選択した時の処理
  const selectUniversity = (selectedUniversity) => {
    setUniversity(selectedUniversity);
    setUniversitySuggestions([]);
    setShowSuggestions(false);
    checkForChanges();
  };

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const d = docSnap.data();
          setName(d.name || '');
          setUniversity(d.university || '');
          setGrade(d.grade || '');
          setGender(d.gender || '');
          setBirthday(d.birthday ? new Date(d.birthday) : new Date(2000, 0, 1));
          setProfileImageUrl(d.profileImageUrl || '');

          // 学生証URLの有効性チェック
          if (d.studentIdUrl) {
            try {
              const storageRef = ref(storage, d.studentIdUrl);
              await getMetadata(storageRef); // ファイルが存在するかチェック
              setStudentIdUrl(d.studentIdUrl);
            } catch (error) {
              if (error.code === 'storage/object-not-found') {
                console.log('無効な学生証URLを検出。Firestoreから削除します。');
                setStudentIdUrl(''); // 画面表示をリセット
                await updateDoc(userDocRef, { studentIdUrl: '' }); // FirestoreからURLを削除
              } else {
                console.error('学生証画像のメタデータ取得エラー:', error);
                setStudentIdUrl(''); // エラー時は非表示にする
              }
            }
          } else {
            setStudentIdUrl('');
          }

          // 元のデータを保存
          setOriginalData({
            name: d.name || '',
            university: d.university || '',
            grade: d.grade || '',
            gender: d.gender || '',
            birthday: d.birthday ? new Date(d.birthday) : new Date(2000, 0, 1),
            profileImageUrl: d.profileImageUrl || '',
            studentIdUrl: d.studentIdUrl || '',
          });
        } else {
          // Firestoreにデータがなければ空欄のまま
          setName('');
          setUniversity('');
          setGrade('');
          setGender('');
          setBirthday(new Date(2000, 0, 1));
          setProfileImageUrl('');
          setStudentIdUrl('');

          // 元のデータを保存
          setOriginalData({
            name: '',
            university: '',
            grade: '',
            gender: '',
            birthday: new Date(2000, 0, 1),
            profileImageUrl: '',
            studentIdUrl: '',
          });
        }
      } catch (error) {
        console.error('ユーザーデータの取得エラー:', error);
      }
    };

    fetchUserData();
  }, [user]);

  // カメラ画面から戻ってきた際の処理
  useEffect(() => {
    if (route.params?.studentIdImage && route.params?.fromCamera) {
      setStudentIdImage(route.params.studentIdImage);
      checkForChanges();
      // パラメータをクリア
      navigation.setParams({ studentIdImage: undefined, fromCamera: undefined });
    }
  }, [route.params?.studentIdImage, route.params?.fromCamera]);

  // 変更を検知する関数
  const checkForChanges = () => {
    if (!originalData) return false;
    
    const hasChanges = 
      name !== originalData.name ||
      university !== originalData.university ||
      grade !== originalData.grade ||
      gender !== originalData.gender ||
      birthday.getTime() !== originalData.birthday.getTime() ||
      profileImage !== null ||
      (profileImage === '' && originalData.profileImageUrl) ||
      studentIdImage !== null;
    
    console.log('プロフィール編集画面: 変更検知', {
      nameChanged: name !== originalData.name,
      universityChanged: university !== originalData.university,
      gradeChanged: grade !== originalData.grade,
      genderChanged: gender !== originalData.gender,
      birthdayChanged: birthday.getTime() !== originalData.birthday.getTime(),
      imageChanged: profileImage !== null,
      imageDeleted: profileImage === '' && originalData.profileImageUrl,
      studentIdChanged: studentIdImage !== null,
      hasChanges
    });
    
    setHasUnsavedChanges(hasChanges);
    return hasChanges;
  };

  // 画面遷移時のアラート表示
  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        if (!hasUnsavedChanges || isSaving) {
          return;
        }

        // デフォルトの遷移を防ぐ
        e.preventDefault();

        Alert.alert(
          '未保存の変更があります',
          '変更を保存せずに画面を離れますか？',
          [
            {
              text: 'キャンセル',
              style: 'cancel',
              onPress: () => {},
            },
            {
              text: '保存せずに離れる',
              style: 'destructive',
              onPress: () => {
                // リスナーを一時的に削除してから遷移を実行
                unsubscribe();
                navigation.dispatch(e.data.action);
              },
            },
          ]
        );
      });

      return unsubscribe;
    }, [navigation, hasUnsavedChanges, isSaving])
  );

  // 画像選択処理
  const pickImage = async () => {
    try {
      // 権限チェック
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限が必要', '写真ライブラリへのアクセス権限が必要です');
        return;
      }

      // 画像選択ピッカーを即座に表示
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // 編集は無効にして、ガイド枠で行う
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // 選択された画像でガイド枠画面に遷移
        navigation.navigate('ImageCrop', {
          imageType: 'profile',
          selectedImageUri: result.assets[0].uri,
          onCropComplete: (croppedUri) => {
            setProfileImage(croppedUri);
            setHasUnsavedChanges(true);

          }
        });
      }
    } catch (error) {
      console.error('画像選択エラー:', error);
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  // 学生証撮影
  const handleStudentIdCapture = async () => {
    // カスタムカメラ画面に遷移
    navigation.navigate('StudentIdCamera', {
      onPictureTaken: (uri) => {
        setStudentIdImage(uri);
        checkForChanges();
      }
    });
  };

  // 学生証アップロード
  const handleStudentIdUpload = async () => {
    if (!studentIdImage) return;
    
    try {
      setLoading(true);
      const response = await fetch(studentIdImage);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `student_ids/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      setStudentIdUrl(downloadURL);
      setStudentIdImage(null);
      setIsIdConfirmed(false); // アップロード完了時にリセット
      
      // Firestoreに保存
      await updateDoc(doc(db, 'users', user.uid), {
        studentIdUrl: downloadURL
      });
      
      Alert.alert('成功', '学生証がアップロードされました。');
    } catch (error) {
      console.error('学生証アップロードエラー:', error);
      Alert.alert('エラー', '学生証のアップロードに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // 学生証削除
  const handleDeleteStudentId = async () => {
    Alert.alert(
      '確認',
      '学生証を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              if (studentIdUrl) {
                const storageRef = ref(storage, studentIdUrl);
                await deleteObject(storageRef);
              }
              setStudentIdUrl('');
              setStudentIdImage(null);
              checkForChanges();
              
              await updateDoc(doc(db, 'users', user.uid), {
                studentIdUrl: ''
              });
              
              Alert.alert('成功', '学生証が削除されました。');
            } catch (error) {
              console.error('学生証削除エラー:', error);
              Alert.alert('エラー', '学生証の削除に失敗しました。');
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !university.trim() || !grade || !gender || !birthday) {
      Alert.alert('エラー', '全ての必須項目を入力してください。');
      return;
    }
    setIsSaving(true);
    setLoading(true);
    try {
      let imageUrl = profileImageUrl;
      
      // プロフィール画像のアップロード処理
      if (profileImage) {
        try {
          // 既存のプロフィール画像を削除
          await deleteExistingProfileImages(user.uid);
          
          // 画像を圧縮
          const compressedUri = await compressProfileImage(profileImage);
          
          // 圧縮された画像をアップロード
          const response = await fetch(compressedUri);
          const blob = await response.blob();
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const fileName = `${timestamp}_${randomString}.jpg`;
          const storageRef = ref(storage, `profile_images/${user.uid}/${fileName}`);
          await uploadBytes(storageRef, blob);
          imageUrl = await getDownloadURL(storageRef);
          
          // アップロード完了後に状態を更新してプレビューを即時反映
          setProfileImageUrl(imageUrl);
          setProfileImage(null); // ローカル画像をクリア
          

        } catch (error) {
          console.error('プロフィール編集画面: 画像アップロードエラー:', error);
          Alert.alert('エラー', 'プロフィール画像のアップロードに失敗しました');
          setLoading(false);
          setIsSaving(false);
          return;
        }
      } else if (profileImage === '' && originalData && originalData.profileImageUrl) {
        // 画像が明示的に削除された場合のみ、既存の画像も削除して空文字列を設定
        try {
          await deleteExistingProfileImages(user.uid);
        } catch (error) {
          console.error('プロフィール編集画面: 画像削除エラー:', error);
          // 削除に失敗しても処理を続行
        }
        imageUrl = '';
        setProfileImageUrl(''); // 状態も更新
      }
      // profileImageがnullの場合は既存の画像をそのまま保持
      
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        name,
        university,
        isUniversityPublic: true,
        grade,
        isGradePublic: true,
        gender,
        birthday: birthday.getFullYear() + '-' + 
                 String(birthday.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(birthday.getDate()).padStart(2, '0'),
        profileImageUrl: imageUrl,
      }, { merge: true });
      setHasUnsavedChanges(false);
      setIsSaving(false);
      
      // 新規登録からの場合や強制ホーム遷移の場合のみアラートを表示
      if (route.params?.fromSignup || forceToHome) {
        Alert.alert('保存完了', 'プロフィールを保存しました。');
        // 少し遅延を入れてから画面遷移（アラートの表示を待つ）
        setTimeout(() => {
          if (route.params?.fromSignup) {
            // 新規登録からの場合はメイン画面に遷移
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              })
            );
          } else if (forceToHome) {
            // 強制ホーム遷移の場合
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              })
            );
          }
        }, 100);
      } else {
        // 通常の編集の場合は即座に戻る
        // プロフィール更新完了をイベントで通知
        if (global.onProfileUpdated) {
          global.onProfileUpdated();
        }
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('エラー', 'プロフィールの保存に失敗しました。');
    } finally {
      setLoading(false);
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <CommonHeader 
        title="プロフィール編集" 
        rightButtonLabel="保存" 
        onRightButtonPress={handleSave}
        rightButtonDisabled={isSaving || loading}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <ScrollView 
          contentContainerStyle={styles.bodyContent} 
          keyboardShouldPersistTaps="handled"
        >
            <View style={{ height: 16 }} />
            <View style={styles.formGroup}>
              <Text style={styles.label}>プロフィール画像<Text style={styles.optional}>(任意)</Text></Text>
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
                {((profileImage && profileImage.trim() !== '') || (profileImageUrl && profileImageUrl.trim() !== '')) && !imageError && profileImage !== '' && (
                  <TouchableOpacity
                    onPress={() => {
                      setProfileImage('');
                      setProfileImageUrl('');
                      setImageError(false);
                      // 状態変更を即座に検知
                      if (!originalData) return;
                      
                      const hasChanges = 
                        name !== originalData.name ||
                        university !== originalData.university ||
                        grade !== originalData.grade ||
                        gender !== originalData.gender ||
                        birthday.getTime() !== originalData.birthday.getTime() ||
                        true; // 画像が削除された場合は常に変更あり
                      
                      setHasUnsavedChanges(hasChanges);
                    }}
                    style={{ marginLeft: 12, padding: 8, backgroundColor: '#fee', borderRadius: 24 }}
                  >
                    <Ionicons name="trash-outline" size={24} color="#e74c3c" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>氏名<Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} value={name} onChangeText={(text) => {
                setName(text);
                checkForChanges();
              }} placeholder="氏名" />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>大学名<Text style={styles.required}>*</Text></Text>
              <View style={styles.universityInputContainer}>
                <TextInput 
                  style={styles.input} 
                  value={university} 
                  onChangeText={(text) => {
                    handleUniversityChange(text);
                    checkForChanges();
                  }}
                  placeholder="大学名" 
                />
              </View>
            </View>
            
            {/* 大学名候補を大学名入力欄と学年選択の間に表示 */}
            {showSuggestions && (
              <View style={styles.suggestionsContainer}>
                <ScrollView 
                  style={styles.suggestionsScrollView}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                >
                  {universitySuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.suggestionItem,
                        index === universitySuggestions.length - 1 && { borderBottomWidth: 0 }
                      ]}
                      onPress={() => selectUniversity(item)}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={styles.formGroup}>
              <Text style={styles.label}>学年<Text style={styles.required}>*</Text></Text>
              <View style={styles.selectRow}>
                {GRADES.map(g => (
                  <TouchableOpacity key={g} style={[styles.selectButton, grade === g && styles.selectedButton]} onPress={() => {
                    const newGrade = g;
                    setGrade(newGrade);
                    // 状態変更を即座に検知
                    if (!originalData) return;
                    
                    const hasChanges = 
                      name !== originalData.name ||
                      university !== originalData.university ||
                      newGrade !== originalData.grade ||
                      gender !== originalData.gender ||
                      birthday.getTime() !== originalData.birthday.getTime() ||
                      profileImage !== null ||
                      (profileImage === '' && originalData.profileImageUrl);
                    
                    setHasUnsavedChanges(hasChanges);
                  }}>
                    <Text style={[styles.selectButtonText, grade === g && styles.selectedButtonText]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>性別<Text style={styles.required}>*</Text></Text>
              <View style={styles.selectRow}>
                {GENDERS.map(g => (
                  <TouchableOpacity key={g} style={[styles.selectButton, gender === g && styles.selectedButton]} onPress={() => {
                    const newGender = g;
                    setGender(newGender);
                    // 状態変更を即座に検知
                    if (!originalData) return;
                    
                    const hasChanges = 
                      name !== originalData.name ||
                      university !== originalData.university ||
                      grade !== originalData.grade ||
                      newGender !== originalData.gender ||
                      birthday.getTime() !== originalData.birthday.getTime() ||
                      profileImage !== null ||
                      (profileImage === '' && originalData.profileImageUrl);
                    
                    setHasUnsavedChanges(hasChanges);
                  }}>
                    <Text style={[styles.selectButtonText, gender === g && styles.selectedButtonText]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>生年月日<Text style={styles.required}>*</Text></Text>
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
                      if (selectedDate) {
                        const newBirthday = selectedDate;
                        setBirthday(newBirthday);
                        // 状態変更を即座に検知
                        if (!originalData) return;
                        
                        const hasChanges = 
                          name !== originalData.name ||
                          university !== originalData.university ||
                          grade !== originalData.grade ||
                          gender !== originalData.gender ||
                          newBirthday.getTime() !== originalData.birthday.getTime() ||
                          profileImage !== null ||
                          (profileImage === '' && originalData.profileImageUrl) ||
                          studentIdImage !== null;
                        
                        setHasUnsavedChanges(hasChanges);
                      }
                    }}
                    maximumDate={new Date()}
                  />
                </View>
              )}
            </View>
            
            {/* 学生証認証 */}
            <View style={styles.formGroup}>
                             <Text style={styles.label}>学生証認証<Text style={styles.optional}>(スキップ可)</Text></Text>
              <View style={styles.studentIdContainer}>
                {studentIdUrl ? (
                  <View style={styles.verifiedContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#28a745" />
                    <Text style={styles.verifiedText}>認証済み</Text>
                  </View>
                ) : studentIdImage ? (
                  <View style={styles.studentIdPreviewContainer}>
                    <Image source={{ uri: studentIdImage }} style={styles.studentIdImage} />
                    
                    <View style={styles.confirmationBox}>
                      <Text style={styles.confirmationTitle}>アップロード前の最終確認</Text>
                      <View style={styles.confirmationList}>
                        <Text style={styles.confirmationListItem}>・氏名、大学名、生年月日が鮮明に写っている</Text>
                        <Text style={styles.confirmationListItem}>・画像に加工や修正、隠蔽がされていない</Text>
                        <Text style={styles.confirmationListItem}>・入力したプロフィール情報と記載内容が一致している</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.finalConfirmationRow}
                        onPress={() => setIsIdConfirmed(!isIdConfirmed)}
                      >
                        <Ionicons
                          name={isIdConfirmed ? 'checkbox' : 'square-outline'}
                          size={24}
                          color={isIdConfirmed ? '#007bff' : '#ccc'}
                        />
                        <Text style={styles.finalConfirmationText}>上記全ての項目を確認し、同意します</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.studentIdPreviewButtons}>
                      <TouchableOpacity
                        onPress={() => {
                          setStudentIdImage(null);
                          setIsIdConfirmed(false); // キャンセル時にリセット
                        }}
                        style={styles.cancelStudentIdButton}
                      >
                        <Text style={styles.cancelStudentIdButtonText}>キャンセル</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleStudentIdUpload}
                        style={[styles.uploadStudentIdButton, (!isIdConfirmed || loading) && styles.disabledButton]}
                        disabled={!isIdConfirmed || loading}
                      >
                        <Text style={styles.uploadStudentIdButtonText}>
                          {loading ? 'アップロード中...' : 'アップロード'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleStudentIdCapture}
                    style={styles.captureStudentIdButton}
                  >
                    <Ionicons name="camera" size={24} color="#007bff" />
                    <Text style={styles.captureStudentIdButtonText}>学生証を認証</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
                      <TouchableOpacity 
                        style={styles.saveButton} 
                        onPress={handleSave} 
                        disabled={isSaving || loading}
                      >
                        <Text style={styles.saveButtonText}>
                          保存する
                        </Text>
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
  // オートコンプリート関連のスタイル
  universityInputContainer: { 
    position: 'relative',
    zIndex: 1,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    maxHeight: 200,
    marginBottom: 18,
    overflow: 'hidden',
  },
  suggestionsScrollView: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
  },
  // 学生証関連のスタイル
  studentIdContainer: { marginTop: 4 },
  studentIdImageContainer: { position: 'relative' },
      studentIdImage: { width: '100%', aspectRatio: 1.6, borderRadius: 8, contentFit: 'cover' },
  deleteStudentIdButton: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    borderRadius: 20, 
    padding: 8 
  },
  studentIdPreviewContainer: { marginTop: 4 },
  studentIdPreviewButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 8 
  },
  uploadStudentIdButton: { 
    flex: 1, 
    backgroundColor: '#007bff', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginLeft: 8 
  },
  uploadStudentIdButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelStudentIdButton: { 
    flex: 1, 
    backgroundColor: '#6c757d', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginRight: 8 
  },
  cancelStudentIdButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  confirmationBox: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  confirmationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  confirmationList: {
    marginBottom: 16,
  },
  confirmationListItem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  finalConfirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  finalConfirmationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#a0c8f0', // 無効時の色
  },
  captureStudentIdButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: '#007bff', 
    borderStyle: 'dashed', 
    borderRadius: 8, 
    padding: 20, 
    backgroundColor: '#f8f9fa' 
  },
  captureStudentIdButtonText: { 
    color: '#007bff', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: 8 
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#28a745',
    borderRadius: 8,
    padding: 20,
    backgroundColor: '#f0fff4'
  },
  verifiedText: {
    color: '#28a745',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  },
  required: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  optional: {
    color: '#666',
    fontSize: 14,
  },
});
