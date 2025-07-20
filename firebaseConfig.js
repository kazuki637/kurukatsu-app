import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCAL-nBWF_Yo14HwgKbpcc_H95KjNmND5s",
  authDomain: "kurukatsu-app.firebaseapp.com",
  projectId: "kurukatsu-app",
  storageBucket: "kurukatsu-app.firebasestorage.app",
  messagingSenderId: "702781399082",
  appId: "1:702781399082:ios:4beb9dc94037cd0ead2353"
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
