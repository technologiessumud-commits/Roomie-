// ─────────────────────────────────────────────
// FIREBASE INIT
// ─────────────────────────────────────────────

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
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

export const signUp = (email, pass) =>
  createUserWithEmailAndPassword(auth, email, pass);

export const logIn = (email, pass) =>
  signInWithEmailAndPassword(auth, email, pass);

export const logOut = () => signOut(auth);

export const requireAuth = () =>
  new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) window.location.href = "login.html";
      else resolve(user);
    });
  });

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────

export const saveProfile = (uid, data) =>
  setDoc(doc(db, "users", uid), data, { merge: true });

export const getProfile = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

// ─────────────────────────────────────────────
// ROOMS
// ─────────────────────────────────────────────

export const postRoom = (data) =>
  addDoc(collection(db, "rooms"), {
    ...data,
    createdAt: serverTimestamp()
  });

export const getRooms = async () => {
  const snap = await getDocs(collection(db, "rooms"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getUserRooms = async (uid) => {
  const q = query(collection(db, "rooms"), where("ownerUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ─────────────────────────────────────────────
// ROOMMATES
// ─────────────────────────────────────────────

export const postRoommate = (data) =>
  addDoc(collection(db, "roommates"), {
    ...data,
    createdAt: serverTimestamp()
  });

export const getRoommates = async () => {
  const snap = await getDocs(collection(db, "roommates"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ─────────────────────────────────────────────
// CHAT LISTENER
// ─────────────────────────────────────────────

export function listenUserChats(uid, callback) {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", uid),
    orderBy("lastMessageTime", "desc")
  );

  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    callback(chats);
  });
}

// ─────────────────────────────────────────────
// ONLINE / PRESENCE
// ─────────────────────────────────────────────

export const setUserOnline = (uid) =>
  setDoc(doc(db, "presence", uid), {
    online: true,
    lastSeen: serverTimestamp()
  }, { merge: true });

export const setUserOffline = (uid) =>
  setDoc(doc(db, "presence", uid), {
    online: false,
    lastSeen: serverTimestamp()
  }, { merge: true });

export const listenUserPresence = (uid, cb) =>
  onSnapshot(doc(db, "presence", uid), (snap) => cb(snap.data()));

// ─────────────────────────────────────────────
// TYPING
// ─────────────────────────────────────────────

export const setTyping = async (chatId, uid, isTyping) =>
  setDoc(doc(db, "chats", chatId, "typing", uid), {
    typing: isTyping
  });

export const listenTyping = (chatId, cb) =>
  onSnapshot(collection(db, "chats", chatId, "typing"), (snap) => {
    cb(snap.docs.filter(d => d.data().typing).map(d => d.id));
  });

// ─────────────────────────────────────────────
// SEND MESSAGE
// ─────────────────────────────────────────────

export const sendMessage = async (chatId, senderUid, receiverUid, text) => {
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderUid,
    text,
    timestamp: serverTimestamp(),
    read: false
  });

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: text,
    lastMessageTime: serverTimestamp(),
    [`unread.${receiverUid}`]: increment(1)
  });
};

// ─────────────────────────────────────────────
// MARK AS READ
// ─────────────────────────────────────────────

export const markMessagesSeen = async (chatId, myUid) => {
  const snap = await getDocs(collection(db, "chats", chatId, "messages"));

  snap.forEach(async (d) => {
    const data = d.data();
    if (data.senderUid !== myUid && !data.read) {
      await updateDoc(d.ref, { read: true });
    }
  });

  await updateDoc(doc(db, "chats", chatId), {
    [`unread.${myUid}`]: 0
  });
};

// ─────────────────────────────────────────────
// OFFLINE QUEUE
// ─────────────────────────────────────────────

function savePending(msg) {
  let list = JSON.parse(localStorage.getItem("pendingMsgs") || "[]");
  list.push(msg);
  localStorage.setItem("pendingMsgs", JSON.stringify(list));
}

export const safeSend = async (chatId, senderUid, receiverUid, text) => {
  if (!navigator.onLine) {
    savePending({ chatId, senderUid, receiverUid, text });
    return;
  }

  await sendMessage(chatId, senderUid, receiverUid, text);
};

window.addEventListener("online", async () => {
  let list = JSON.parse(localStorage.getItem("pendingMsgs") || "[]");

  for (let msg of list) {
    await sendMessage(msg.chatId, msg.senderUid, msg.receiverUid, msg.text);
  }

  localStorage.removeItem("pendingMsgs");
});
