import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  serverTimestamp,
  getCountFromServer
} from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyBK1T5Nr1CjoPVWPsKnytrgjj05nU8fDs0",
  authDomain: "hstu---cou--exam-2026.firebaseapp.com",
  projectId: "hstu---cou--exam-2026",
  storageBucket: "hstu---cou--exam-2026.firebasestorage.app",
  messagingSenderId: "1058124789396",
  appId: "1:1058124789396:web:fc772af33deb7c18c9e681"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
  getCountFromServer
};
