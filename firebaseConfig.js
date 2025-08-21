import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyADK2EtPA3XYK68MfDrfdn5eYams9ibJt0",
  authDomain: "kurukatsu-app.firebaseapp.com",
  projectId: "kurukatsu-app",
  storageBucket: "kurukatsu-app.firebasestorage.app",
  messagingSenderId: "702781399082",
  appId: "1:702781399082:web:a4e848d6046690adad2353",
  measurementId: "G-KB0YTDPEBV"
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const db = getFirestore(app);
const storage = getStorage(app);
// Functionsを初期化し、リージョンを指定
const functions = getFunctions(app, 'us-central1');

export { auth, db, storage, functions };