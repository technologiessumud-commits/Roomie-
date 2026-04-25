// ─── FIREBASE CONFIG ─────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, addDoc, collection, query, where, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
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

// ─── PROFILE HELPERS ──────────────────────────────────────────
export async function saveProfile(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}
export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists()? snap.data() : null;
}

// ─── ROOM HELPERS ─────────────────────────────────────────────
export async function postRoom(data) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  return addDoc(collection(db, "rooms"), {
  ...data,
    ownerUid: user.uid, // CRITICAL: This was missing
    createdAt: serverTimestamp()
  });
}
export async function getRooms() {
  const snap = await getDocs(collection(db, "rooms"));
  return snap.docs.map(d => ({ id: d.id,...d.data() }));
}
export async function getRoom(id) {
  const snap = await getDoc(doc(db, "rooms", id));
  return snap.exists()? { id: snap.id,...snap.data() } : null;
}
export async function getUserRooms(uid) {
  const q = query(collection(db, "rooms"), where("ownerUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id,...d.data() }));
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
  return snap.docs.map(d => ({ id: d.id,...d.data() }));
}
