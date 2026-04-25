import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBjVaNDIoUvm0La7OwGqLxmMFQcrNb_Oh4",
  authDomain: "skillzone-esports.firebaseapp.com",
  projectId: "skillzone-esports",
  storageBucket: "skillzone-esports.firebasestorage.app",
  messagingSenderId: "496866292552",
  appId: "1:496866292552:web:21054909e1ce530243f97d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
