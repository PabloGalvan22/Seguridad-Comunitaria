// firebase.js - Configuración y funciones esenciales de Firebase
// Versión mejorada para soportar Markdown

// Importación de módulos Firebase v9 (modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp, 
  doc, 
  getDoc, 
  updateDoc, 
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDBbiAZVGkN5em-ZUwISkjP4qCI9QK0Usc",
  authDomain: "seguridadcomunitaria-22p.firebaseapp.com",
  projectId: "seguridadcomunitaria-22p",
  storageBucket: "seguridadcomunitaria-22p.firebasestorage.app",
  messagingSenderId: "762347660708",
  appId: "1:762347660708:web:8efb03cbed8dd1bd974d31",
  measurementId: "G-Z3548XRKQX"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Formatea un timestamp de Firestore a fecha legible
 */
const formatDate = (timestamp) => {
  if (!timestamp) return 'Fecha no disponible';
  
  try {
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Fecha no disponible';
  }
};

/**
 * Formatea fecha con hora
 */
const formatDateTime = (timestamp) => {
  if (!timestamp) return 'Fecha no disponible';
  
  try {
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Fecha no disponible';
  }
};

/**
 * Valida un email
 */
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Valida una contraseña (mínimo 6 caracteres)
 */
const validatePassword = (password) => {
  return password.length >= 6;
};

// ============================================
// FUNCIONES PARA POSTS (BLOG)
// ============================================

/**
 * Obtiene todos los posts ordenados por fecha
 */
const getPosts = async (order = 'desc') => {
  try {
    const q = query(collection(db, "posts"), orderBy("fecha", order));
    const querySnapshot = await getDocs(q);
    return querySnapshot;
  } catch (error) {
    console.error("Error obteniendo posts:", error);
    throw new Error("No se pudieron cargar las historias. Intenta de nuevo.");
  }
};

/**
 * Obtiene un post por su ID
 */
const getPostById = async (postId) => {
  try {
    const docRef = doc(db, "posts", postId);
    const docSnap = await getDoc(docRef);
    return docSnap;
  } catch (error) {
    console.error("Error obteniendo post:", error);
    throw new Error("No se pudo cargar la historia. Intenta de nuevo.");
  }
};

/**
 * Crea un nuevo post con soporte para Markdown
 */
const createPost = async (postData) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Debes iniciar sesión para publicar");
    }
    
    // Renderizar Markdown si se proporciona contenido
    let contenido_html = postData.contenido;
    if (postData.formato === 'markdown') {
      try {
        // Importar marked dinámicamente
        const { marked } = await import('https://cdn.jsdelivr.net/npm/marked/marked.min.js');
        contenido_html = marked.parse(postData.contenido);
      } catch (error) {
        console.warn("No se pudo renderizar Markdown, usando texto plano:", error);
      }
    }
    
    const docRef = await addDoc(collection(db, "posts"), {
      titulo: postData.titulo,
      contenido: postData.contenido,
      contenido_html: contenido_html,
      likes: 0,
      dislikes: 0,
      visitas: 0,
      fecha: Timestamp.now(),
      publicadoPor: user.email,
      userId: user.uid,
      formato: postData.formato || 'texto'
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error creando post:", error);
    throw error;
  }
};

/**
 * Actualiza el voto de un post
 */
const updatePostVote = async (postId, voteType) => {
  try {
    const docRef = doc(db, "posts", postId);
    await updateDoc(docRef, {
      [voteType]: increment(1)
    });
    return true;
  } catch (error) {
    console.error("Error actualizando voto:", error);
    throw error;
  }
};

/**
 * Incrementa las visitas de un post
 */
const incrementPostViews = async (postId) => {
  try {
    const docRef = doc(db, "posts", postId);
    await updateDoc(docRef, {
      visitas: increment(1)
    });
    return true;
  } catch (error) {
    console.error("Error incrementando visitas:", error);
    return false;
  }
};

// ============================================
// FUNCIONES DE AUTENTICACIÓN MEJORADAS
// ============================================

/**
 * Inicia sesión con email y contraseña
 */
const loginWithEmailPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { 
      success: true, 
      user: userCredential.user,
      message: "Inicio de sesión exitoso"
    };
  } catch (error) {
    let errorMessage = "Error de autenticación";
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = "El correo electrónico no es válido";
        break;
      case 'auth/user-disabled':
        errorMessage = "Esta cuenta ha sido deshabilitada";
        break;
      case 'auth/user-not-found':
        errorMessage = "No existe una cuenta con este correo";
        break;
      case 'auth/wrong-password':
        errorMessage = "Contraseña incorrecta";
        break;
      case 'auth/too-many-requests':
        errorMessage = "Demasiados intentos fallidos. Intenta más tarde";
        break;
      default:
        errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};

/**
 * Cierra la sesión actual
 */
const logout = async () => {
  try {
    await signOut(auth);
    return { 
      success: true, 
      message: "Sesión cerrada exitosamente" 
    };
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    return { 
      success: false, 
      error: "Error al cerrar sesión" 
    };
  }
};

/**
 * Verifica si hay un usuario autenticado
 */
const getCurrentUser = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// ============================================
// FUNCIONES DE VALIDACIÓN DE VOTOS
// ============================================

/**
 * Verifica si un usuario ya votó en un post
 */
const hasUserVoted = (postId) => {
  const storageKey = `voto_${postId}`;
  return !!localStorage.getItem(storageKey);
};

/**
 * Guarda el voto de un usuario en localStorage
 */
const saveUserVote = (postId, voteType) => {
  const storageKey = `voto_${postId}`;
  localStorage.setItem(storageKey, voteType);
};

/**
 * Obtiene el tipo de voto que dio un usuario
 */
const getUserVote = (postId) => {
  const storageKey = `voto_${postId}`;
  return localStorage.getItem(storageKey);
};

// ============================================
// FUNCIONES DE ESTADÍSTICAS
// ============================================

/**
 * Obtiene estadísticas de un post
 */
const getPostStats = async (postId) => {
  try {
    const docSnap = await getPostById(postId);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const totalVotes = (data.likes || 0) + (data.dislikes || 0);
      const engagement = data.visitas > 0 ? (totalVotes / data.visitas) * 100 : 0;
      
      return {
        likes: data.likes || 0,
        dislikes: data.dislikes || 0,
        views: data.visitas || 0,
        totalVotes: totalVotes,
        engagement: engagement.toFixed(1) + '%',
        date: formatDate(data.fecha)
      };
    }
    return null;
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return null;
  }
};

/**
 * Obtiene el total de posts
 */
const getTotalPosts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "posts"));
    return querySnapshot.size;
  } catch (error) {
    console.error("Error contando posts:", error);
    return 0;
  }
};

// ============================================
// FUNCIONES PARA EL ADMIN PANEL
// ============================================

/**
 * Verifica si el usuario actual es administrador
 */
const isUserAdmin = async () => {
  const user = await getCurrentUser();
  if (!user) return false;
  
  // Por ahora, cualquier usuario autenticado es considerado admin
  return !!user;
};

// ============================================
// EXPORTACIONES
// ============================================

// Exportar servicios de Firebase
export { 
  // Servicios principales
  db, 
  auth,
  
  // Funciones de Firestore básicas
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
  
  // Funciones de Authentication básicas
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
};

// Exportar funciones personalizadas
export {
  // Funciones de utilidad
  formatDate,
  formatDateTime,
  validateEmail,
  validatePassword,
  
  // Funciones para posts
  getPosts,
  getPostById,
  createPost,
  updatePostVote,
  incrementPostViews,
  
  // Funciones de autenticación mejoradas
  loginWithEmailPassword,
  logout,
  getCurrentUser,
  isUserAdmin,
  
  // Funciones de validación de votos
  hasUserVoted,
  saveUserVote,
  getUserVote,
  
  // Funciones de estadísticas
  getPostStats,
  getTotalPosts
};

// ============================================
// INICIALIZACIÓN Y CONFIGURACIÓN GLOBAL
// ============================================

// Añadir listener para cambios de autenticación
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('Usuario autenticado:', user.email);
  } else {
    console.log('Usuario no autenticado');
  }
});