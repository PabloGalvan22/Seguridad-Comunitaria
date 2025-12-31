// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// TUS CREDENCIALES
const firebaseConfig = {
  apiKey: "AIzaSyDBbiAZVGkN5em-ZUwISkjP4qCI9QK0Usc",
  authDomain: "seguridadcomunitaria-22p.firebaseapp.com",
  projectId: "seguridadcomunitaria-22p",
  storageBucket: "seguridadcomunitaria-22p.firebasestorage.app",
  messagingSenderId: "762347660708",
  appId: "1:762347660708:web:8efb03cbed8dd1bd974d31",
  measurementId: "G-Z3548XRKQX"
};

// Inicializamos la App, la Base de Datos y la Autenticación
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exportamos las herramientas para usarlas en los otros archivos
export { db, auth, collection, addDoc, getDocs, query, orderBy, Timestamp, signInWithEmailAndPassword, onAuthStateChanged, signOut };

// Nota: Importamos también las funciones de firestore/auth aquí abajo para re-exportarlas y facilitar el uso
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";