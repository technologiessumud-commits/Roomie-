// ─── FIREBASE CONFIG ──────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  RecaptchaVerifier, signInWithPhoneNumber, updatePhoneNumber,
  PhoneAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const CFG = {
  apiKey:            "AIzaSyDaDEbVpUUyLsmq5ilNp3CVLRs3ZX-ZWUM",
  authDomain:        "roomie-f3103.firebaseapp.com",
  projectId:         "roomie-f3103",
  storageBucket:     "roomie-f3103.firebasestorage.app",
  messagingSenderId: "896474185176",
  appId:             "1:896474185176:web:0e4543682f594daf0a86ad"
};

const app  = initializeApp(CFG);
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

export async function googleSignIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

// ─── PHONE VERIFICATION ───────────────────────────────────────
export function setupRecaptcha(buttonId) {
  window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
    size: 'invisible',
    callback: () => {}
  });
  return window.recaptchaVerifier;
}

export async function sendOTP(phoneNumber) {
  const verifier = window.recaptchaVerifier;
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  window.confirmationResult = confirmation;
  return confirmation;
}

export async function verifyOTP(otp) {
  const result = await window.confirmationResult.confirm(otp);
  return result;
}

export async function markPhoneVerified(uid, phoneNumber) {
  await updateDoc(doc(db, 'users', uid), {
    phoneNumber,
    'verification.phoneVerified':   true,
    'verification.phoneVerifiedAt': new Date().toISOString()
  });
}

// ─── PROFILE ──────────────────────────────────────────────────
export async function saveProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}
export async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// ─── REFERRAL ─────────────────────────────────────────────────
export function generateReferralCode(name) {
  const base = (name || 'USER').replace(/\s+/g,'').toUpperCase().slice(0,6);
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return base + rand;
}

export async function applyReferral(uid, referralCode) {
  // Find who owns this code
  const q = query(collection(db,'users'), where('referralCode','==', referralCode));
  const snap = await getDocs(q);
  if (snap.empty) return false;
  const referrer = snap.docs[0];
  if (referrer.id === uid) return false; // can't refer yourself
  await updateDoc(doc(db,'users',uid), { referredBy: referrer.id });
  return true;
}

export async function creditReferral(referrerUid) {
  await updateDoc(doc(db,'users', referrerUid), {
    referralBalance: increment(100),
    referralEarnings: increment(100),
    referralCount:   increment(1)
  });
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
  const snap = await getDocs(query(collection(db,'rooms'), where('ownerUid','==',uid)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function updateRoom(id, data) { return updateDoc(doc(db,'rooms',id), data); }
export async function deleteRoom(id)       { return deleteDoc(doc(db,'rooms',id)); }

// ─── ROOMMATES ────────────────────────────────────────────────
export async function postRoommate(data) {
  return addDoc(collection(db,'roommates'), { ...data, createdAt: serverTimestamp() });
}
export async function getRoommates() {
  const snap = await getDocs(collection(db,'roommates'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function updateRoommate(id, data) { return updateDoc(doc(db,'roommates',id), data); }
export async function deleteRoommate(id)       { return deleteDoc(doc(db,'roommates',id)); }

// ─── FAVOURITES ───────────────────────────────────────────────
export async function getFavourites(uid) {
  const snap = await getDoc(doc(db,'favourites',uid));
  return snap.exists() ? (snap.data().items || []) : [];
}
export async function toggleFavourite(uid, roomId) {
  const ref   = doc(db,'favourites',uid);
  const snap  = await getDoc(ref);
  const items = snap.exists() ? (snap.data().items || []) : [];
  const idx   = items.indexOf(roomId);
  if (idx === -1) items.push(roomId); else items.splice(idx,1);
  await setDoc(ref, { items }, { merge: true });
  return items.includes(roomId);
}

// ─── CHAT ─────────────────────────────────────────────────────
export function chatId(uid1, uid2) { return [uid1,uid2].sort().join('_'); }

export async function getOrCreateChat(myUid, theirUid, myProfile, theirProfile) {
  const id  = chatId(myUid, theirUid);
  const ref = doc(db,'chats',id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participants:      [myUid, theirUid],
      participantNames:  {[myUid]:myProfile.name,     [theirUid]:theirProfile.name},
      participantPhotos: {[myUid]:myProfile.photoURL||'', [theirUid]:theirProfile.photoURL||''},
      participantUnis:   {[myUid]:myProfile.university||'', [theirUid]:theirProfile.university||''},
      lastMessage:'', lastMessageTime:serverTimestamp(), createdAt:serverTimestamp()
    });
  }
  return id;
}

export async function sendMessage(chatDocId, senderUid, text) {
  await addDoc(collection(db,'chats',chatDocId,'messages'), {
    senderUid, text:text.trim(), timestamp:serverTimestamp(), read:false
  });
  await updateDoc(doc(db,'chats',chatDocId), {
    lastMessage:text.trim().slice(0,80), lastMessageTime:serverTimestamp()
  });
}

export function listenMessages(chatDocId, callback) {
  const q = query(collection(db,'chats',chatDocId,'messages'), orderBy('timestamp','asc'));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({id:d.id,...d.data()}))));
}

export function listenUserChats(uid, callback) {
  const q = query(collection(db,'chats'), where('participants','array-contains',uid));
  return onSnapshot(q, snap => {
    const chats = snap.docs.map(d => ({id:d.id,...d.data()}));
    chats.sort((a,b) => (b.lastMessageTime?.seconds||0)-(a.lastMessageTime?.seconds||0));
    callback(chats);
  });
}

// ─── ROUTE GUARD ──────────────────────────────────────────────
export async function requireAuth(redirectToSetup = true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('auth-timeout')), 8000);
    const unsub = onAuthStateChanged(auth, async user => {
      unsub(); clearTimeout(timer);
      if (!user) { window.location.href = 'login.html'; return; }
      if (redirectToSetup) {
        try {
          const p = await getProfile(user.uid);
          if (!p) { window.location.href = 'setup.html'; return; }
        } catch(e) { console.warn('profile check failed:', e); }
      }
      resolve(user);
    }, err => { clearTimeout(timer); reject(err); });
  });
}

// ─── CURRENCY BY COUNTRY ──────────────────────────────────────
export const COUNTRY_CURRENCY = {
  'nigeria':                { code:'NGN', symbol:'₦',   name:'Nigerian Naira' },
  'ghana':                  { code:'GHS', symbol:'₵',   name:'Ghanaian Cedi' },
  'kenya':                  { code:'KES', symbol:'KSh', name:'Kenyan Shilling' },
  'south africa':           { code:'ZAR', symbol:'R',   name:'South African Rand' },
  'united states':          { code:'USD', symbol:'$',   name:'US Dollar' },
  'united kingdom':         { code:'GBP', symbol:'£',   name:'British Pound' },
  'canada':                 { code:'CAD', symbol:'C$',  name:'Canadian Dollar' },
  'australia':              { code:'AUD', symbol:'A$',  name:'Australian Dollar' },
  'india':                  { code:'INR', symbol:'₹',   name:'Indian Rupee' },
  'germany':                { code:'EUR', symbol:'€',   name:'Euro' },
  'france':                 { code:'EUR', symbol:'€',   name:'Euro' },
  'cameroon':               { code:'XAF', symbol:'CFA', name:'Central African Franc' },
  'tanzania':               { code:'TZS', symbol:'TSh', name:'Tanzanian Shilling' },
  'uganda':                 { code:'UGX', symbol:'USh', name:'Ugandan Shilling' },
  'zambia':                 { code:'ZMW', symbol:'ZK',  name:'Zambian Kwacha' },
  'zimbabwe':               { code:'USD', symbol:'$',   name:'US Dollar' },
  'egypt':                  { code:'EGP', symbol:'E£',  name:'Egyptian Pound' },
  'ethiopia':               { code:'ETB', symbol:'Br',  name:'Ethiopian Birr' },
  'rwanda':                 { code:'RWF', symbol:'RF',  name:'Rwandan Franc' },
  'senegal':                { code:'XOF', symbol:'CFA', name:'West African Franc' },
  'cote d\'ivoire':         { code:'XOF', symbol:'CFA', name:'West African Franc' },
  'malaysia':               { code:'MYR', symbol:'RM',  name:'Malaysian Ringgit' },
  'brazil':                 { code:'BRL', symbol:'R$',  name:'Brazilian Real' },
  'united arab emirates':   { code:'AED', symbol:'AED', name:'UAE Dirham' },
};

export function getCurrencyForCountry(country) {
  const key = (country||'').toLowerCase().trim();
  return COUNTRY_CURRENCY[key] || { code:'USD', symbol:'$', name:'US Dollar' };
}

export function formatPrice(amount, currencySymbol) {
  return `${currencySymbol}${Number(amount||0).toLocaleString()}`;
                                                      }
