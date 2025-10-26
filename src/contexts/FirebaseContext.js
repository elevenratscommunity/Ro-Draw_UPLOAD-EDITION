import React, { createContext, useContext } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

// --- Firebase Config ---
const firebaseConfig = { apiKey: "AIzaSyAgBEHjWSbT2NeN1BCdzdnPrdEVNMrzLjo", authDomain: "ro-draw-8585e.firebaseapp.com", projectId: "ro-draw-8585e", storageBucket: "ro-draw-8585e.appspot.com", messagingSenderId: "524808125870", appId: "1:524808125870:web:7db5848797f3bc5f351c3f" };

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// --- Firebase Services ---
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage ? firebase.storage() : null;
const provider = new firebase.auth.GoogleAuthProvider();

// --- Context ---
const FirebaseContext = createContext(null);

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider = ({ children }) => {
  const value = {
    auth,
    db,
    storage,
    provider,
    firebase
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};