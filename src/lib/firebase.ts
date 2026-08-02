import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const apiKey = (import.meta as any).env.VITE_FIREBASE_API_KEY;

const firebaseConfig = {
  apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
};

export const app = apiKey ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null as any;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = async () => {
  if (!auth) {
    console.error("Firebase no está configurado.");
    alert("Error: Firebase no está configurado en las variables de entorno (.env).");
    return null;
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') return null;
    throw error;
  }
};

export const signOutUser = () => {
  if (!auth) return Promise.resolve();
  return signOut(auth);
};
