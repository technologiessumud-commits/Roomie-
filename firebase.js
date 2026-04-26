// ─── FIREBASE CONFIG ─────────────────────────────────────────
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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ FIXED: Real config (this was the main issue)
const firebaseConfig = {
  apiKey: "AIzaSyDaDEbVpUUyLsmq5ilNp3CVLRs3ZX-ZWUM",
  authDomain: "roomie-f3103.firebaseapp.com",
  projectId: "roomie-f3103",
  storageBucket: "roomie-f3103.firebasestorage.app",
  messagingSenderId: "896474185176",
  appId: "1:896474185176:web:0e4543682f594daf0a86ad"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

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
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ✅ NEW: SAFE user loader (fixes profile page issue)
export function waitForUser() {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      resolve(user);
    });
  });
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
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  return addDoc(collection(db, "rooms"), {
    ...data,
    ownerUid: user.uid, // already correct
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
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  return addDoc(collection(db, "roommates"), {
    ...data,
    ownerUid: user.uid,
    createdAt: serverTimestamp()
  });
}

export async function getRoommates() {
  const snap = await getDocs(collection(db, "roommates"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
