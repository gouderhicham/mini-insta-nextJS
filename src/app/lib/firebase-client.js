"use client"
import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";




const firebaseConfig = {
  apiKey: "AIzaSyAbSPdccVRsKMTRCCcAWy4ihcFWCdsSipI",
  authDomain: "refresh-619.firebaseapp.com",
  projectId: "refresh-619",
  storageBucket: "refresh-619.firebasestorage.app",
  messagingSenderId: "595760974064",
  appId: "1:595760974064:web:083e9e9a9d80982dfdda35",
  measurementId: "G-CHTF6M8NS1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
