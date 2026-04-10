// ─── FIREBASE CONFIG ─────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, addDoc, collection, query, where, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDaDEbVpUUyLsmq5ilNp3CVLRs3ZX-ZWUM",
  authDomain:        "roomie-f3103.firebaseapp.com",
  projectId:         "roomie-f3103",
  storageBucket:     "roomie-f3103.firebasestorage.app",
  messagingSenderId: "896474185176",
  appId:             "1:896474185176:web:0e4543682f594daf0a86ad"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// ─── AUTH HELPERS ─────────────────────────────────────────────

/** Signup with email/password */
export async function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

/** Login with email/password */
export async function logIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Logout */
export async function logOut() {
  return signOut(auth);
}

/** Returns current user or null */
export function currentUser() {
  return auth.currentUser;
}

/** Auth state change listener */
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ─── PROFILE HELPERS ──────────────────────────────────────────

/** Save or update user profile */
export async function saveProfile(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

/** Get user profile by uid */
export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// ─── ROOM HELPERS ─────────────────────────────────────────────

/** Post a new room */
export async function postRoom(data) {
  return addDoc(collection(db, "rooms"), {
    ...data,
    createdAt: serverTimestamp()
  });
}

/** Get all rooms */
export async function getRooms() {
  const snap = await getDocs(collection(db, "rooms"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get a single room by id */
export async function getRoom(id) {
  const snap = await getDoc(doc(db, "rooms", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Get rooms posted by a specific user */
export async function getUserRooms(uid) {
  const q = query(collection(db, "rooms"), where("ownerUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── ROOMMATE HELPERS ─────────────────────────────────────────

/** Post a roommate listing */
export async function postRoommate(data) {
  return addDoc(collection(db, "roommates"), {
    ...data,
    createdAt: serverTimestamp()
  });
}

/** Get all roommate listings */
export async function getRoommates() {
  const snap = await getDocs(collection(db, "roommates"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── ROUTE GUARD ──────────────────────────────────────────────

/**
 * Use on protected pages.
 * Redirects to login if not authenticated,
 * or to setup if profile not yet created.
 */
export async function requireAuth(redirectToSetup = true) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      if (redirectToSetup) {
        const profile = await getProfile(user.uid);
        if (!profile) {
          window.location.href = "setup.html";
          return;
        }
      }
      resolve(user);
    });
  });
      }
