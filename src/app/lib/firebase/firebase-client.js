"use client"
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAbSPdccVRsKMTRCCcAWy4ihcFWCdsSipI",
  authDomain: "refresh-619.firebaseapp.com",
  projectId: "refresh-619",
  storageBucket: "refresh-619.firebasestorage.app",
  messagingSenderId: "595760974064",
  appId: "1:595760974064:web:083e9e9a9d80982dfdda35",
  measurementId: "G-CHTF6M8NS1"
};

// Initialize Firebase singleton
let app;
let db;
let auth;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
  auth = getAuth(app);
} else {
  app = getApp();
  db = getFirestore(app);
  auth = getAuth(app);
}

export { app, db, auth };
