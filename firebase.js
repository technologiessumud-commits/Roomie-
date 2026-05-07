// ─── FIREBASE CONFIG (MODULAR CDN) ───────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser
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
  serverTimestamp,
  onSnapshot,
  updateDoc,
  deleteDoc
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


// ─── ADMIN EMAILS ─────────────────────────────────────────────

const ADMIN_EMAILS = [
  'opemuhammed35@gmail.com',
  'sumudinnovation4@gmail.com'
];

export function isAdmin(email) {
  return ADMIN_EMAILS.includes((email || '').toLowerCase().trim());
}


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

// ✅ NON-BLOCKING AUTH LISTENER
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


// ─── REFERRAL SYSTEM ──────────────────────────────────────────

// Generate unique referral code
export function generateReferralCode(name = '') {
  const clean = name.replace(/\s/g, '').toUpperCase().slice(0, 4);
  const rand  = Math.floor(1000 + Math.random() * 9000);
  return `${clean}${rand}`;
}

// Apply referral — called during setup after a new user signs up
export async function applyReferralCode(code, newUserUid) {

  const usersSnap = await getDocs(collection(db, "users"));

  let ownerDoc = null;

  usersSnap.forEach(docu => {
    const data = docu.data();
    if (data.referralCode === code) {
      ownerDoc = { uid: docu.id, ...data };
    }
  });

  if (!ownerDoc) throw new Error("Invalid referral code");
  if (ownerDoc.uid === newUserUid) throw new Error("Cannot refer yourself");

  const newCount    = (ownerDoc.referralCount    || 0) + 1;
  const newEarnings = (ownerDoc.referralEarnings || 0) + 200;

  // Reward owner: increment count & earnings
  await updateDoc(doc(db, "users", ownerDoc.uid), {
    referralCount:    newCount,
    referralEarnings: newEarnings
  });

  // Log referral event in a subcollection for admin tracking
  await addDoc(collection(db, "referrals"), {
    referrerUid:  ownerDoc.uid,
    referrerCode: code,
    referredUid:  newUserUid,
    createdAt:    serverTimestamp()
  });

  // Save referredBy on new user
  await updateDoc(doc(db, "users", newUserUid), {
    referredBy: code
  });

  return { newCount };
}

// ─── WHATSAPP UNLOCK ──────────────────────────────────────────
// Unlock threshold — change this number to adjust
export const REFERRAL_WHATSAPP_THRESHOLD = 20;

export function isWhatsAppUnlocked(referralCount = 0) {
  return referralCount >= REFERRAL_WHATSAPP_THRESHOLD;
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
  const q = query(
    collection(db, "rooms"),
    where("ownerUid", "==", uid)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ─── DELETE ROOM ──────────────────────────────────────────────

export async function deleteRoom(roomId) {
  await deleteDoc(doc(db, "rooms", roomId));
}


// ─── MARK ROOM AS OCCUPIED ────────────────────────────────────
// Uses "status" field to match profile.html display logic

export async function markRoomOccupied(roomId, occupied = true) {
  await updateDoc(doc(db, "rooms", roomId), {
    status: occupied ? 'occupied' : 'available'
  });
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


// ─── FAVOURITES ───────────────────────────────────────────────

export async function getFavourites(uid) {
  const q = query(
    collection(db, "favourites"),
    where("userId", "==", uid)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ─── DELETE ACCOUNT ───────────────────────────────────────────

export async function deleteAccount(uid) {
  await deleteDoc(doc(db, "users", uid));
  if (auth.currentUser) {
    await deleteUser(auth.currentUser);
  }
}


// ─── ROUTE GUARD ──────────────────────────────────────────────

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


// ─── CHAT LISTENER ────────────────────────────────────────────

export function listenUserChats(uid, callback) {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", uid)
  );
  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    chats.sort((a, b) => {
      const aTime = a.lastMessageTime?.seconds || 0;
      const bTime = b.lastMessageTime?.seconds || 0;
      return bTime - aTime;
    });
    callback(chats);
  });
}


// ─── ADMIN: GET ALL USERS ─────────────────────────────────────

export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ─── ADMIN: GET ALL ROOMS ─────────────────────────────────────

export async function getAllRooms() {
  const snap = await getDocs(collection(db, "rooms"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ─── ADMIN: GET ALL REFERRALS ─────────────────────────────────

export async function getAllReferrals() {
  const snap = await getDocs(collection(db, "referrals"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ─── ADMIN: DELETE USER ───────────────────────────────────────

export async function adminDeleteUser(uid) {
  // Deletes Firestore doc only (can't delete Auth from client SDK)
  await deleteDoc(doc(db, "users", uid));
}


// ─── ADMIN: BAN USER ──────────────────────────────────────────

export async function adminBanUser(uid, banned = true) {
  await updateDoc(doc(db, "users", uid), { banned });
}

