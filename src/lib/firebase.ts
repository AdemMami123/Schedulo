import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBq5aYvDB8DmSNZCUoAP8hhayBRJ4G1d4g",
  authDomain: "smart-scheduling-app-a94b1.firebaseapp.com",
  projectId: "smart-scheduling-app-a94b1",
  storageBucket: "smart-scheduling-app-a94b1.firebasestorage.app",
  messagingSenderId: "292962557323",
  appId: "1:292962557323:web:075fdebc3d1ee781b3638e",
  measurementId: "G-QP3B69KVHV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Note: Calendar scopes will be added later after proper Google Cloud setup
// googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
// googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

// Initialize Analytics (only in browser)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
