// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDWxseWiWM3tl1oP7_ZLDFd9cTGdslooaM",
  authDomain: "data-collection-8c238.firebaseapp.com",
  projectId: "data-collection-8c238",
  storageBucket: "data-collection-8c238.firebasestorage.app",
  messagingSenderId: "789538844195",
  appId: "1:789538844195:web:ba86ec723dd08335bc8b96",
  measurementId: "G-CQ8XSCMH8Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
