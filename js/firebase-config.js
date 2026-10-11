/**
 * Pragati Connect (प्रगति कनेक्ट)
 * Firebase Modular SDK (v10+) Initialization & Adaptive Store
 */

// Replace these placeholders with your Firebase project credentials
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if Firebase credentials have been configured with a real API key
export const isRealFirebaseConfigured = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.apiKey !== "YOUR_API_KEY" && 
         !firebaseConfig.apiKey.includes("YOUR_");
};

let app = null;
let auth = null;
let db = null;
let isFirebaseLive = false;

// Attempt Firebase Modular SDK Initialization
try {
  if (isRealFirebaseConfigured()) {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseLive = true;
    console.log("🔥 Firebase initialized successfully with project:", firebaseConfig.projectId);
  } else {
    console.warn("⚠️ Firebase placeholder credentials detected. Operating in high-fidelity local interactive mode.");
  }
} catch (err) {
  console.warn("⚠️ Firebase live init failed or offline. Falling back to local interactive mode:", err);
  isFirebaseLive = false;
}

export { app, auth, db, isFirebaseLive };
