import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const env = import.meta.env

// Firebase web config is public by design — access is enforced by Firestore
// security rules (see firestore.rules), not by hiding these values.
// Any VITE_FB_* env var overrides the default, so a fork can point at its own project.
const firebaseConfig = {
  apiKey: env.VITE_FB_API_KEY ?? 'AIzaSyD4btsdiCqghOuEyGNBm1wsn0DVfArJb04',
  authDomain: env.VITE_FB_AUTH_DOMAIN ?? 'xavchik.firebaseapp.com',
  projectId: env.VITE_FB_PROJECT_ID ?? 'xavchik',
  storageBucket: env.VITE_FB_STORAGE_BUCKET ?? 'xavchik.firebasestorage.app',
  messagingSenderId: env.VITE_FB_MESSAGING_SENDER_ID ?? '62829787869',
  appId: env.VITE_FB_APP_ID ?? '1:62829787869:web:8cfa675d18ea6002487934',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Offline cache: the order list stays readable in a lift / bad office wifi.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
