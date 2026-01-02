import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAK0Lm0m2qTjFIhsFOlTbai_fn51sQJAio",
  authDomain: "agry-7028f.firebaseapp.com",
  databaseURL: "https://agry-7028f-default-rtdb.firebaseio.com",
  projectId: "agry-7028f",
  storageBucket: "agry-7028f.appspot.com",
  messagingSenderId: "546078016192",
  appId: "1:546078016192:web:fcc3e16101df31b5e8a325"
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;
