// ─── FIREBASE CONFIG ──────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, collection, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDaDEbVpUUyLsmq5ilNp3CVLRs3ZX-ZWUM",
  authDomain:        "roomie-f3103.firebaseapp.com",
  projectId:         "roomie-f3103",
  storageBucket:     "roomie-f3103.firebasestorage.app",
  messagingSenderId: "896474185176",
  appId:             "1:896474185176:web:0e4543682f594daf0a86ad"
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// ─── AUTH: EMAIL ──────────────────────────────────────────────
export async function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}
export async function logIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
export async function logOut() {
  return signOut(auth);
}
export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

// ─── AUTH: GOOGLE ─────────────────────────────────────────────
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  // Use redirect on mobile, popup on desktop
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    await signInWithRedirect(auth, provider);
    return null; // result handled by getGoogleRedirectResult
  } else {
    return signInWithPopup(auth, provider);
  }
}
export async function getGoogleRedirectResult() {
  return getRedirectResult(auth);
}

// ─── AUTH: APPLE (requires Apple Developer account $99/yr) ────
export async function signInWithApple() {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    await signInWithRedirect(auth, provider);
    return null;
  } else {
    return signInWithPopup(auth, provider);
  }
}

// ─── PROFILE ──────────────────────────────────────────────────
export async function saveProfile(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}
export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// ─── ROOMS ────────────────────────────────────────────────────
export async function postRoom(data) {
  return addDoc(collection(db, "rooms"), { ...data, createdAt: serverTimestamp() });
}
export async function getRooms() {
  const snap = await getDocs(collection(db, "rooms"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getRoom(id) {
  const snap = await getDoc(doc(db, "rooms", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function getUserRooms(uid) {
  const q = query(collection(db, "rooms"), where("ownerUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function updateRoom(id, data) {
  return updateDoc(doc(db, "rooms", id), data);
}
export async function deleteRoom(id) {
  return deleteDoc(doc(db, "rooms", id));
}

// ─── ROOMMATES ────────────────────────────────────────────────
export async function postRoommate(data) {
  return addDoc(collection(db, "roommates"), { ...data, createdAt: serverTimestamp() });
}
export async function getRoommates() {
  const snap = await getDocs(collection(db, "roommates"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function updateRoommate(id, data) {
  return updateDoc(doc(db, "roommates", id), data);
}
export async function deleteRoommate(id) {
  return deleteDoc(doc(db, "roommates", id));
}

// ─── FAVOURITES ───────────────────────────────────────────────
export async function getFavourites(uid) {
  const snap = await getDoc(doc(db, "favourites", uid));
  return snap.exists() ? (snap.data().items || []) : [];
}
export async function toggleFavourite(uid, roomId) {
  const ref   = doc(db, "favourites", uid);
  const snap  = await getDoc(ref);
  const items = snap.exists() ? (snap.data().items || []) : [];
  const idx   = items.indexOf(roomId);
  if (idx === -1) {
    items.push(roomId);
  } else {
    items.splice(idx, 1);
  }
  await setDoc(ref, { items }, { merge: true });
  return items.includes(roomId); // returns new state: true=saved, false=removed
}

// ─── ROUTE GUARD ──────────────────────────────────────────────
export async function requireAuth(redirectToSetup = true) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = "login.html"; return; }
      if (redirectToSetup) {
        const profile = await getProfile(user.uid);
        if (!profile) { window.location.href = "setup.html"; return; }
      }
      resolve(user);
    });
  });
}

// ─── SOCIAL AUTH HELPER ───────────────────────────────────────
// Call this on every protected page load to catch Google/Apple redirect results
export async function handleSocialRedirect() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const profile = await getProfile(result.user.uid);
      if (!profile) {
        // Pre-fill name/email from Google profile
        await saveProfile(result.user.uid, {
          uid:       result.user.uid,
          email:     result.user.email,
          name:      result.user.displayName || '',
          photoURL:  result.user.photoURL    || '',
          createdAt: new Date().toISOString()
        });
        window.location.href = 'setup.html';
      } else {
        window.location.href = 'home.html';
      }
    }
  } catch (err) {
    console.error('Social redirect error:', err);
  }
}
  
