// ─── FIREBASE CONFIG ──────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, GoogleAuthProvider, OAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp
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

// ─── AUTH ─────────────────────────────────────────────────────
export async function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}
export async function logIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
export async function logOut() { return signOut(auth); }
export function onAuth(cb)     { return onAuthStateChanged(auth, cb); }

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    await signInWithRedirect(auth, provider); return null;
  }
  return signInWithPopup(auth, provider);
}
export async function signInWithApple() {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email'); provider.addScope('name');
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    await signInWithRedirect(auth, provider); return null;
  }
  return signInWithPopup(auth, provider);
}
export async function getGoogleRedirectResult() { return getRedirectResult(auth); }

export async function handleSocialRedirect() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      const profile = await getProfile(result.user.uid);
      if (!profile) {
        await saveProfile(result.user.uid, {
          uid: result.user.uid, email: result.user.email,
          name: result.user.displayName || '',
          photoURL: result.user.photoURL || '',
          createdAt: new Date().toISOString()
        });
        window.location.href = 'setup.html';
      } else { window.location.href = 'home.html'; }
    }
  } catch(e) { console.error('Social redirect:', e); }
}

// ─── PROFILE ──────────────────────────────────────────────────
export async function saveProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}
export async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// ─── ROOMS ────────────────────────────────────────────────────
export async function postRoom(data) {
  return addDoc(collection(db, 'rooms'), { ...data, createdAt: serverTimestamp() });
}
export async function getRooms() {
  const snap = await getDocs(collection(db, 'rooms'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getRoom(id) {
  const snap = await getDoc(doc(db, 'rooms', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function getUserRooms(uid) {
  const snap = await getDocs(query(collection(db, 'rooms'), where('ownerUid', '==', uid)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function updateRoom(id, data) { return updateDoc(doc(db, 'rooms', id), data); }
export async function deleteRoom(id)       { return deleteDoc(doc(db, 'rooms', id)); }

// ─── ROOMMATES ────────────────────────────────────────────────
export async function postRoommate(data) {
  return addDoc(collection(db, 'roommates'), { ...data, createdAt: serverTimestamp() });
}
export async function getRoommates() {
  const snap = await getDocs(collection(db, 'roommates'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function updateRoommate(id, data) { return updateDoc(doc(db, 'roommates', id), data); }
export async function deleteRoommate(id)       { return deleteDoc(doc(db, 'roommates', id)); }

// ─── FAVOURITES ───────────────────────────────────────────────
export async function getFavourites(uid) {
  const snap = await getDoc(doc(db, 'favourites', uid));
  return snap.exists() ? (snap.data().items || []) : [];
}
export async function toggleFavourite(uid, roomId) {
  const ref   = doc(db, 'favourites', uid);
  const snap  = await getDoc(ref);
  const items = snap.exists() ? (snap.data().items || []) : [];
  const idx   = items.indexOf(roomId);
  if (idx === -1) items.push(roomId); else items.splice(idx, 1);
  await setDoc(ref, { items }, { merge: true });
  return items.includes(roomId);
}

// ─── CHAT ─────────────────────────────────────────────────────
export function chatId(uid1, uid2) { return [uid1, uid2].sort().join('_'); }

export async function getOrCreateChat(myUid, theirUid, myProfile, theirProfile) {
  const id  = chatId(myUid, theirUid);
  const ref = doc(db, 'chats', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participants:      [myUid, theirUid],
      participantNames:  { [myUid]: myProfile.name,     [theirUid]: theirProfile.name     },
      participantPhotos: { [myUid]: myProfile.photoURL||'', [theirUid]: theirProfile.photoURL||'' },
      participantUnis:   { [myUid]: myProfile.university||'', [theirUid]: theirProfile.university||'' },
      lastMessage:       '',
      lastMessageTime:   serverTimestamp(),
      createdAt:         serverTimestamp()
    });
  }
  return id;
}

export async function sendMessage(chatDocId, senderUid, text) {
  await addDoc(collection(db, 'chats', chatDocId, 'messages'), {
    senderUid, text: text.trim(), timestamp: serverTimestamp(), read: false
  });
  await updateDoc(doc(db, 'chats', chatDocId), {
    lastMessage: text.trim().slice(0, 80),
    lastMessageTime: serverTimestamp()
  });
}

export function listenMessages(chatDocId, callback) {
  const q = query(collection(db, 'chats', chatDocId, 'messages'), orderBy('timestamp', 'asc'));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export function listenUserChats(uid, callback) {
  const q = query(collection(db, 'chats'), where('participants', 'array-contains', uid));
  return onSnapshot(q, snap => {
    const chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    chats.sort((a, b) => (b.lastMessageTime?.seconds||0) - (a.lastMessageTime?.seconds||0));
    callback(chats);
  });
}

// ─── ROUTE GUARD ──────────────────────────────────────────────
export async function requireAuth(redirectToSetup = true) {
  return new Promise((resolve, reject) => {
    // Firebase auth state fires quickly — if it doesn't in 8s something is wrong
    const timer = setTimeout(() => reject(new Error('auth-timeout')), 8000);

    const unsub = onAuthStateChanged(auth, async user => {
      unsub(); // unsubscribe immediately — we only need it once
      clearTimeout(timer);

      if (!user) {
        window.location.href = 'login.html';
        return;
      }
      if (redirectToSetup) {
        try {
          const p = await getProfile(user.uid);
          if (!p) { window.location.href = 'setup.html'; return; }
        } catch(e) {
          // If Firestore fails here, still let the user through
          // Pages will handle missing profile gracefully
          console.warn('requireAuth profile fetch failed:', e);
        }
      }
      resolve(user);
    }, err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
