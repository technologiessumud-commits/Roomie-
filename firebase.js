// ─── FIREBASE CONFIG (MODULAR CDN) ───────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// ─── YOUR REAL FIREBASE CONFIG ────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDaDEbVpUUyLsmq5ilNp3CVLRs3ZX-ZWUM",
  authDomain: "roomie-f3103.firebaseapp.com",
  projectId: "roomie-f3103",
  storageBucket: "roomie-f3103.firebasestorage.app",
  messagingSenderId: "896474185176",
  appId: "1:896474185176:web:0e4543682f594daf0a86ad"
};


// ─── INITIALIZE FIREBASE ─────────────────────────────────────
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);


// ─── AUTH HELPERS ─────────────────────────────────────────────

export async function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logOut() {
  return signOut(auth);
}

export function currentUser() {
  return auth.currentUser;
}

// ✅ NON-BLOCKING AUTH LISTENER (IMPORTANT FOR PROFILE PAGE)
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}


// ─── PROFILE HELPERS ──────────────────────────────────────────

export async function saveProfile(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}


// ─── ROOM HELPERS ─────────────────────────────────────────────

export async function postRoom(data) {
  return addDoc(collection(db, "rooms"), {
    ...data,
    createdAt: serverTimestamp()
  });
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


// ─── ROOMMATE HELPERS ─────────────────────────────────────────

export async function postRoommate(data) {
  return addDoc(collection(db, "roommates"), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function getRoommates() {
  const snap = await getDocs(collection(db, "roommates"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ─── FAVOURITES (ADDED – YOUR PROFILE NEEDS THIS) ─────────────

export async function getFavourites(uid) {
  const q = query(collection(db, "favourites"), where("userId", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ─── ROUTE GUARD (UNCHANGED – STILL WORKS) ────────────────────

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
// ─── CHAT LISTENER ─────────────────────────────────────────

import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/** Listen to user's chats in realtime */
export function listenUserChats(uid, callback) {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", uid)
  );

  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Sort by latest message
    chats.sort((a, b) => {
      const aTime = a.lastMessageTime?.seconds || 0;
      const bTime = b.lastMessageTime?.seconds || 0;
      return bTime - aTime;
    });

    callback(chats);
  });
}
