/**
 * Pragati Connect (प्रगति कनेक्ट)
 * Passwordless Email OTP Authentication & Session Manager
 * 
 * Features:
 * 1. Email OTP Generation & Verification (5-minute expiry, bank-style inputs)
 * 2. EmailJS SDK Integration with clean developer fallback
 * 3. Invisible Firebase Auth session binding (zero password exposure to users)
 * 4. Google Sign-In support
 * 5. Instant 1-Click Demo Persona logins for preview verification
 * 6. User role routing: Contractor, Company, Admin, or Onboarding
 */

import { auth, db, isFirebaseLive } from './firebase-config.js';
import { 
  getCurrentUser, 
  setCurrentUser, 
  getCollection, 
  getDocument, 
  addDocument, 
  updateDocument, 
  deleteDocument,
  showToast 
} from './common.js';

// --- EmailJS Configuration (Replace with your actual keys from emailjs.com) ---
export const EMAILJS_SERVICE_ID = "YOUR_EMAILJS_SERVICE_ID";
export const EMAILJS_TEMPLATE_ID = "YOUR_EMAILJS_TEMPLATE_ID"; 
export const EMAILJS_PUBLIC_KEY = "YOUR_EMAILJS_PUBLIC_KEY";

const OTPS_COLLECTION = "otps";
const LOCAL_OTPS_KEY = "pragati_otps";

/**
 * Generate a random 6-digit numeric OTP
 */
export function generateRandomOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send 6-Digit OTP to User's Email
 */
export async function sendEmailOTP(email) {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const otp = generateRandomOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  const otpData = {
    email: normalizedEmail,
    otp,
    expiresAt,
    attempts: 0,
    createdAt: new Date().toISOString()
  };

  // 1. Store in Firestore if available
  if (isFirebaseLive && db) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(db, OTPS_COLLECTION, normalizedEmail), otpData);
      console.log(`🔥 Saved OTP in Firestore for ${normalizedEmail}`);
    } catch (err) {
      console.warn("Firestore OTP write failed, falling back to local storage:", err);
    }
  }

  // 2. Always sync to Local Storage for offline/preview resilience
  const localOtps = JSON.parse(localStorage.getItem(LOCAL_OTPS_KEY) || '{}');
  localOtps[normalizedEmail] = otpData;
  localStorage.setItem(LOCAL_OTPS_KEY, JSON.stringify(localOtps));

  // 3. Send Email via EmailJS
  let emailSentViaSdk = false;
  try {
    if (window.emailjs && EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY") {
      window.emailjs.init(EMAILJS_PUBLIC_KEY);
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: normalizedEmail,
        otp_code: otp,
        email: normalizedEmail,
        user_email: normalizedEmail
      });
      emailSentViaSdk = true;
      console.log(`✉️ EmailJS sent OTP to ${normalizedEmail}`);
    }
  } catch (sdkErr) {
    console.warn("EmailJS SDK attempt encountered an error:", sdkErr);
  }

  // 4. Always provide an immediate developer notification if in development or EmailJS keys are unconfigured
  if (!emailSentViaSdk) {
    console.log(`%c[PRAGATI CONNECT OTP] For ${normalizedEmail}: %c${otp}`, 'color: #1a365d; font-weight: bold;', 'color: #e67e22; font-size: 16px; font-weight: bold;');
    showToast(`🔑 [Development Mode] Your OTP for ${normalizedEmail} is: ${otp}`, 'info', 12000);
  }

  return { 
    success: true, 
    otp, // Returned for dev helper inspection
    expiresAt,
    message: `A 6-digit verification code has been sent to ${normalizedEmail}.` 
  };
}

/**
 * Verify Entered 6-digit OTP
 */
export async function verifyEmailOTP(email, enteredOtp) {
  if (!email || !enteredOtp) {
    return { success: false, error: 'Email and 6-digit OTP are required.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const cleanOtp = enteredOtp.trim();

  // 1. Fetch OTP record from Firestore or LocalStorage
  let record = null;
  if (isFirebaseLive && db) {
    try {
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const snap = await getDoc(doc(db, OTPS_COLLECTION, normalizedEmail));
      if (snap.exists()) {
        record = snap.data();
      }
    } catch (err) {
      console.warn("Could not read Firestore OTP, falling back to local:", err);
    }
  }

  if (!record) {
    const localOtps = JSON.parse(localStorage.getItem(LOCAL_OTPS_KEY) || '{}');
    record = localOtps[normalizedEmail];
  }

  if (!record) {
    return { success: false, error: 'No active OTP found. Please click "Resend OTP".' };
  }

  // 2. Check Expiry
  if (Date.now() > record.expiresAt) {
    return { success: false, error: 'This OTP has expired. Please request a new code.' };
  }

  // 3. Check Code Match
  if (record.otp !== cleanOtp) {
    record.attempts = (record.attempts || 0) + 1;
    return { success: false, error: 'Incorrect 6-digit OTP. Please check and try again.' };
  }

  // 4. OTP is Valid! Delete used OTP
  if (isFirebaseLive && db) {
    try {
      const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await deleteDoc(doc(db, OTPS_COLLECTION, normalizedEmail));
    } catch (e) {
      // ignore
    }
  }
  const localOtps = JSON.parse(localStorage.getItem(LOCAL_OTPS_KEY) || '{}');
  delete localOtps[normalizedEmail];
  localStorage.setItem(LOCAL_OTPS_KEY, JSON.stringify(localOtps));

  // 5. Authenticate via Firebase Auth silently under the hood
  let authUid = `user-${Date.now().toString(36)}`;
  const deterministicPassword = `Pragati#OTP_${normalizedEmail}_Key99!`;

  if (isFirebaseLive && auth) {
    try {
      const { 
        signInWithEmailAndPassword, 
        createUserWithEmailAndPassword 
      } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

      try {
        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, deterministicPassword);
        authUid = userCredential.user.uid;
      } catch (signInErr) {
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/wrong-password') {
          const newCred = await createUserWithEmailAndPassword(auth, normalizedEmail, deterministicPassword);
          authUid = newCred.user.uid;
        } else {
          console.warn("Firebase Auth error during OTP signin:", signInErr);
        }
      }
    } catch (fbErr) {
      console.warn("Firebase Auth modules not reachable, using offline session:", fbErr);
    }
  }

  // 6. Inspect `users` collection to check if existing or new
  const allUsers = await getCollection('users');
  let userDoc = allUsers.find(u => (u.email || '').toLowerCase() === normalizedEmail);

  if (userDoc) {
    // Existing user
    const isAdmin = normalizedEmail === 'admin@pragaticonnect.in' || userDoc.role === 'admin' || userDoc.userType === 'admin';
    const profileComplete = userDoc.profileComplete === true || isAdmin;

    const sessionUser = {
      ...userDoc,
      uid: userDoc.uid || authUid,
      email: normalizedEmail,
      profileComplete
    };

    setCurrentUser(sessionUser);

    return {
      success: true,
      isNewUser: false,
      user: sessionUser,
      profileComplete,
      userType: userDoc.userType
    };
  } else {
    // New User!
    const isAdmin = normalizedEmail === 'admin@pragaticonnect.in';
    const newUser = {
      uid: authUid,
      email: normalizedEmail,
      displayName: normalizedEmail.split('@')[0],
      userType: isAdmin ? 'admin' : null,
      role: isAdmin ? 'admin' : null,
      profileComplete: isAdmin ? true : false,
      createdAt: new Date().toISOString()
    };

    await addDocument('users', newUser);
    setCurrentUser(newUser);

    return {
      success: true,
      isNewUser: true,
      user: newUser,
      profileComplete: isAdmin,
      userType: newUser.userType
    };
  }
}

/**
 * Google Sign-In Flow
 */
export async function signInWithGoogle() {
  if (isFirebaseLive && auth) {
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      const normalizedEmail = (googleUser.email || '').toLowerCase();

      const allUsers = await getCollection('users');
      let userDoc = allUsers.find(u => (u.email || '').toLowerCase() === normalizedEmail);

      if (userDoc) {
        const isAdmin = normalizedEmail === 'admin@pragaticonnect.in' || userDoc.role === 'admin';
        const sessionUser = {
          ...userDoc,
          uid: googleUser.uid,
          email: normalizedEmail,
          displayName: userDoc.displayName || googleUser.displayName,
          profileComplete: userDoc.profileComplete === true || isAdmin
        };
        setCurrentUser(sessionUser);
        return { success: true, isNewUser: false, user: sessionUser, profileComplete: sessionUser.profileComplete };
      } else {
        const isAdmin = normalizedEmail === 'admin@pragaticonnect.in';
        const newUser = {
          uid: googleUser.uid,
          email: normalizedEmail,
          displayName: googleUser.displayName || normalizedEmail.split('@')[0],
          photoURL: googleUser.photoURL || null,
          userType: isAdmin ? 'admin' : null,
          role: isAdmin ? 'admin' : null,
          profileComplete: isAdmin ? true : false,
          createdAt: new Date().toISOString()
        };
        await addDocument('users', newUser);
        setCurrentUser(newUser);
        return { success: true, isNewUser: true, user: newUser, profileComplete: isAdmin };
      }
    } catch (err) {
      console.warn("Google sign-in popup error:", err);
      // If popup blocked or cancelled in iframe, provide friendly explanation
      return { success: false, error: err.message || 'Google Sign-In was cancelled or blocked in this environment.' };
    }
  }

  return { success: false, error: 'Google authentication is currently running in offline fallback mode.' };
}

/**
 * Demo Persona Fast Logins (For instant evaluation)
 */
export async function loginAsPersona(type) {
  const allUsers = await getCollection('users');
  let user = null;

  if (type === 'contractor') {
    user = allUsers.find(u => u.uid === 'contractor-101' || (u.userType === 'contractor' && u.profileComplete));
    if (!user) {
      user = {
        uid: "contractor-101",
        email: "rajesh@apexbhopal.com",
        userType: "contractor",
        displayName: "Rajesh Sharma",
        firmName: "Apex Earthmovers & Infra Pvt Ltd",
        phone: "+91 98260 12345",
        city: "Bhopal",
        state: "Madhya Pradesh",
        profileComplete: true,
        verified: true,
        rating: 4.8,
        reviewCount: 15
      };
    }
  } else if (type === 'company') {
    user = allUsers.find(u => u.uid === 'company-201' || (u.userType === 'company' && u.profileComplete));
    if (!user) {
      user = {
        uid: "company-201",
        email: "procurement@ltcivil.com",
        userType: "company",
        displayName: "Arvind Narayan",
        companyName: "L&T Heavy Civil Infrastructure",
        phone: "+91 22 6752 5656",
        city: "Mumbai",
        state: "Maharashtra",
        profileComplete: true,
        verified: true,
        rating: 4.9,
        reviewCount: 8
      };
    }
  } else if (type === 'admin') {
    user = allUsers.find(u => u.email === 'admin@pragaticonnect.in' || u.role === 'admin');
    if (!user) {
      user = {
        uid: "admin-001",
        email: "admin@pragaticonnect.in",
        userType: "admin",
        role: "admin",
        displayName: "Pragati Administrator",
        profileComplete: true
      };
    }
  }

  setCurrentUser(user);
  return { success: true, user };
}

/**
 * Complete Onboarding for a User
 */
export async function completeUserOnboarding(uid, userType, profileData) {
  if (!uid || !userType) {
    throw new Error('User ID and user type are required.');
  }

  const currentUser = getCurrentUser() || {};
  const updatedUserFields = {
    userType,
    profileComplete: true,
    displayName: profileData.ownerName || profileData.contactPerson || profileData.firmName || profileData.companyName || currentUser.displayName,
    city: profileData.city,
    state: profileData.state,
    phone: profileData.phone,
    updatedAt: new Date().toISOString()
  };

  // 1. Update users collection
  await updateDocument('users', uid, updatedUserFields);

  // 2. Save in specific profile collection (contractors or companies)
  const targetCollection = userType === 'contractor' ? 'contractors' : 'companies';
  const fullProfile = {
    uid,
    id: uid,
    email: currentUser.email || profileData.email || '',
    userType,
    profileComplete: true,
    verified: false,
    rating: 5.0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
    ...profileData
  };

  await addDocument(targetCollection, fullProfile);

  // 3. Update session
  const finalSessionUser = {
    ...currentUser,
    ...updatedUserFields,
    ...fullProfile
  };
  setCurrentUser(finalSessionUser);

  return { success: true, user: finalSessionUser };
}

/**
 * Backwards-compatible contractor registration helper
 */
export async function registerContractor(contractorData) {
  try {
    const currentUser = getCurrentUser();
    const uid = currentUser?.uid || `contractor-${Date.now().toString(36)}`;
    const res = await completeUserOnboarding(uid, 'contractor', contractorData);
    return { success: true, user: res.user || res };
  } catch (err) {
    console.error('registerContractor error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Backwards-compatible company registration helper
 */
export async function registerCompany(companyData) {
  try {
    const currentUser = getCurrentUser();
    const uid = currentUser?.uid || `company-${Date.now().toString(36)}`;
    const res = await completeUserOnboarding(uid, 'company', companyData);
    return { success: true, user: res.user || res };
  } catch (err) {
    console.error('registerCompany error:', err);
    return { success: false, error: err.message };
  }
}

