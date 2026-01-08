// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, orderBy, where,
  Timestamp, doc, getDoc, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDBbiAZVGkN5em-ZUwISkjP4qCI9QK0Usc",
  authDomain: "seguridadcomunitaria-22p.firebaseapp.com",
  projectId: "seguridadcomunitaria-22p",
  storageBucket: "seguridadcomunitaria-22p.firebasestorage.app",
  messagingSenderId: "762347660708",
  appId: "1:762347660708:web:8efb03cbed8dd1bd974d31",
  measurementId: "G-Z3548XRKQX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { 
  db, auth, collection, addDoc, getDocs, query, orderBy, where,
  Timestamp, doc, getDoc, updateDoc, increment,
  signInWithEmailAndPassword, onAuthStateChanged, signOut 
};