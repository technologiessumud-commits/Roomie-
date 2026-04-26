// ═══════════════════════════════════════════════════════════
//  ROOMIE  ·  firebase.js  ·  Complete source of truth
// ═══════════════════════════════════════════════════════════
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, deleteUser, GoogleAuthProvider, signInWithPopup,
  sendEmailVerification, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, getDocs,
  addDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, onSnapshot,
  serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── App config ───────────────────────────────────────────
export const CFG = {
  apiKey:            "AIzaSyDaDEbVpUUyLsmq5ilNp3CVLRs3ZX-ZWUM",
  authDomain:        "roomie-f3103.firebaseapp.com",
  projectId:         "roomie-f3103",
  storageBucket:     "roomie-f3103.firebasestorage.app",
  messagingSenderId: "896474185176",
  appId:             "1:896474185176:web:0e4543682f594daf0a86ad"
};
const _app = initializeApp(CFG);
export const auth = getAuth(_app);
export const db   = getFirestore(_app);

// ── Auth ─────────────────────────────────────────────────
export const onAuth  = cb  => onAuthStateChanged(auth, cb);
export const logOut  = ()  => signOut(auth);
export const logIn   = (e,p) => signInWithEmailAndPassword(auth,e,p);
export const signUp  = (e,p) => createUserWithEmailAndPassword(auth,e,p);
export const removeAuthUser = () => deleteUser(auth.currentUser);
export const resetPassword  = e  => sendPasswordResetEmail(auth,e);
export const sendVerifyEmail = (u, url) =>
  sendEmailVerification(u, { url: url || location.origin+'/home.html' });

export async function googleSignIn() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt:'select_account' });
  return signInWithPopup(auth, p);
}

// ── Profile ──────────────────────────────────────────────
export const saveProfile   = (uid,d) => setDoc(doc(db,'users',uid),d,{merge:true});
export const updateProfile = (uid,d) => updateDoc(doc(db,'users',uid),d);
export async function getProfile(uid) {
  const s = await getDoc(doc(db,'users',uid));
  return s.exists() ? s.data() : null;
}

// ── Rooms ────────────────────────────────────────────────
export const postRoom   = d  => addDoc(collection(db,'rooms'),{...d,createdAt:serverTimestamp()});
export const updateRoom = (id,d) => updateDoc(doc(db,'rooms',id),d);
export const deleteRoom = id => deleteDoc(doc(db,'rooms',id));
export async function getRooms() {
  const s = await getDocs(collection(db,'rooms'));
  return s.docs.map(d=>({id:d.id,...d.data()}));
}
export async function getRoom(id) {
  const s = await getDoc(doc(db,'rooms',id));
  return s.exists() ? {id:s.id,...s.data()} : null;
}
export async function getUserRooms(uid) {
  const s = await getDocs(query(collection(db,'rooms'),where('ownerUid','==',uid)));
  return s.docs.map(d=>({id:d.id,...d.data()}));
}

// ── Roommates ────────────────────────────────────────────
export const postRoommate   = d  => addDoc(collection(db,'roommates'),{...d,createdAt:serverTimestamp()});
export const updateRoommate = (id,d) => updateDoc(doc(db,'roommates',id),d);
export const deleteRoommate = id => deleteDoc(doc(db,'roommates',id));
export async function getRoommates() {
  const s = await getDocs(collection(db,'roommates'));
  return s.docs.map(d=>({id:d.id,...d.data()}));
}

// ── Favourites ───────────────────────────────────────────
export async function getFavourites(uid) {
  const s = await getDoc(doc(db,'favourites',uid));
  return s.exists() ? (s.data().items||[]) : [];
}
export async function toggleFavourite(uid, roomId) {
  const ref   = doc(db,'favourites',uid);
  const s     = await getDoc(ref);
  const items = s.exists() ? (s.data().items||[]) : [];
  const idx   = items.indexOf(roomId);
  if (idx===-1) items.push(roomId); else items.splice(idx,1);
  await setDoc(ref,{items},{merge:true});
  return items.includes(roomId);
}

// ── OTP store (Firestore-based, no SMS needed) ───────────
export async function storeOTP(uid, code, type='email') {
  await setDoc(doc(db,'otps',uid), {
    code, type,
    expiresAt: Date.now() + 10*60*1000, // 10 min
    createdAt: serverTimestamp()
  });
}
export async function verifyOTP(uid, code) {
  const s = await getDoc(doc(db,'otps',uid));
  if (!s.exists()) return false;
  const d = s.data();
  if (Date.now() > d.expiresAt) return false;
  if (d.code !== code) return false;
  await deleteDoc(doc(db,'otps',uid));
  return true;
}

// ── Chat ─────────────────────────────────────────────────
export const chatId = (a,b) => [a,b].sort().join('_');
export async function getOrCreateChat(myUid,theirUid,me,them) {
  const id  = chatId(myUid,theirUid);
  const ref = doc(db,'chats',id);
  const s   = await getDoc(ref);
  if (!s.exists()) {
    await setDoc(ref,{
      participants:      [myUid,theirUid],
      participantNames:  {[myUid]:me.name||'',     [theirUid]:them.name||''},
      participantPhotos: {[myUid]:me.photoURL||'',  [theirUid]:them.photoURL||''},
      participantUnis:   {[myUid]:me.university||'',[theirUid]:them.university||''},
      lastMessage:'', lastMessageTime:serverTimestamp(), createdAt:serverTimestamp()
    });
  }
  return id;
}
export async function sendMessage(chatDocId,senderUid,text) {
  await addDoc(collection(db,'chats',chatDocId,'messages'),{
    senderUid, text:text.trim(), timestamp:serverTimestamp(), read:false
  });
  await updateDoc(doc(db,'chats',chatDocId),{
    lastMessage:text.trim().slice(0,80), lastMessageTime:serverTimestamp()
  });
}
export function listenMessages(chatDocId,cb) {
  return onSnapshot(
    query(collection(db,'chats',chatDocId,'messages'),orderBy('timestamp','asc')),
    s => cb(s.docs.map(d=>({id:d.id,...d.data()})))
  );
}
export function listenUserChats(uid,cb) {
  return onSnapshot(
    query(collection(db,'chats'),where('participants','array-contains',uid)),
    s => {
      const chats = s.docs.map(d=>({id:d.id,...d.data()}));
      chats.sort((a,b)=>(b.lastMessageTime?.seconds||0)-(a.lastMessageTime?.seconds||0));
      cb(chats);
    }
  );
}

// ── Referrals ────────────────────────────────────────────
export function makeReferralCode(name) {
  const b = (name||'USER').replace(/\s+/g,'').toUpperCase().slice(0,6);
  return b + Math.random().toString(36).slice(2,5).toUpperCase();
}
export async function resolveReferralCode(code,myUid) {
  if (!code) return null;
  const s = await getDocs(query(collection(db,'users'),where('referralCode','==',code)));
  if (s.empty) return null;
  return s.docs[0].id===myUid ? null : s.docs[0].id;
}
export const creditReferrer = uid => updateDoc(doc(db,'users',uid),{
  referralCount:    increment(1),
  referralEarnings: increment(100),
  referralBalance:  increment(100)
});

// ── Currency map ─────────────────────────────────────────
export const CURRENCIES = {
  'nigeria':              {code:'NGN',symbol:'₦',  name:'Nigerian Naira',    flag:'🇳🇬'},
  'ghana':                {code:'GHS',symbol:'₵',  name:'Ghanaian Cedi',     flag:'🇬🇭'},
  'kenya':                {code:'KES',symbol:'KSh',name:'Kenyan Shilling',   flag:'🇰🇪'},
  'south africa':         {code:'ZAR',symbol:'R',  name:'South African Rand',flag:'🇿🇦'},
  'united states':        {code:'USD',symbol:'$',  name:'US Dollar',         flag:'🇺🇸'},
  'united kingdom':       {code:'GBP',symbol:'£',  name:'British Pound',     flag:'🇬🇧'},
  'canada':               {code:'CAD',symbol:'C$', name:'Canadian Dollar',   flag:'🇨🇦'},
  'australia':            {code:'AUD',symbol:'A$', name:'Australian Dollar', flag:'🇦🇺'},
  'india':                {code:'INR',symbol:'₹',  name:'Indian Rupee',      flag:'🇮🇳'},
  'germany':              {code:'EUR',symbol:'€',  name:'Euro',              flag:'🇩🇪'},
  'france':               {code:'EUR',symbol:'€',  name:'Euro',              flag:'🇫🇷'},
  'cameroon':             {code:'XAF',symbol:'CFA',name:'CFA Franc',         flag:'🇨🇲'},
  'tanzania':             {code:'TZS',symbol:'TSh',name:'Tanzanian Shilling',flag:'🇹🇿'},
  'uganda':               {code:'UGX',symbol:'USh',name:'Ugandan Shilling',  flag:'🇺🇬'},
  'zambia':               {code:'ZMW',symbol:'ZK', name:'Zambian Kwacha',    flag:'🇿🇲'},
  'egypt':                {code:'EGP',symbol:'E£', name:'Egyptian Pound',    flag:'🇪🇬'},
  'ethiopia':             {code:'ETB',symbol:'Br', name:'Ethiopian Birr',    flag:'🇪🇹'},
  'rwanda':               {code:'RWF',symbol:'RF', name:'Rwandan Franc',     flag:'🇷🇼'},
  'malaysia':             {code:'MYR',symbol:'RM', name:'Malaysian Ringgit', flag:'🇲🇾'},
  'brazil':               {code:'BRL',symbol:'R$', name:'Brazilian Real',    flag:'🇧🇷'},
  'united arab emirates': {code:'AED',symbol:'AED',name:'UAE Dirham',        flag:'🇦🇪'},
  'japan':                {code:'JPY',symbol:'¥',  name:'Japanese Yen',      flag:'🇯🇵'},
  'singapore':            {code:'SGD',symbol:'S$', name:'Singapore Dollar',  flag:'🇸🇬'},
  'senegal':              {code:'XOF',symbol:'CFA',name:'West African CFA',  flag:'🇸🇳'},
  'zimbabwe':             {code:'USD',symbol:'$',  name:'US Dollar',         flag:'🇿🇼'},
};
export function getCurrency(country) {
  return CURRENCIES[(country||'').toLowerCase().trim()] ||
    {code:'USD',symbol:'$',name:'US Dollar',flag:'🌍'};
}
// NGN conversion rates (approximate, for plan pricing display)
const RATES = {NGN:1,GHS:0.006,KES:0.11,ZAR:0.015,USD:0.00062,GBP:0.00049,
  CAD:0.00085,AUD:0.00096,INR:0.052,EUR:0.00057,XAF:0.37,TZS:1.6,UGX:2.3,
  ZMW:0.017,EGP:0.031,ETB:0.037,RWF:0.84,MYR:0.0029,BRL:0.0031,AED:0.0023,
  JPY:0.094,SGD:0.00083,XOF:0.37};
export function convertNGN(amtNGN, toCurrCode) {
  return Math.ceil(amtNGN * (RATES[toCurrCode]||1));
}

// ── Plans ────────────────────────────────────────────────
export const PLANS = {
  free:     {id:'free',    label:'Free',    priceNGN:0,    maxListings:5,    maxMedia:6,  video:false},
  standard: {id:'standard',label:'Standard',priceNGN:999,  maxListings:20,   maxMedia:10, video:true},
  premium:  {id:'premium', label:'Premium', priceNGN:2999, maxListings:99999,maxMedia:20, video:true},
};

// ── Helpers ──────────────────────────────────────────────
export function distKm(la1,lo1,la2,lo2) {
  const R=6371, dL=(la2-la1)*Math.PI/180, dO=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dO/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
export function esc(s) {
  const d=document.createElement('div'); d.textContent=s; return d.innerHTML;
}
export function toast(msg, type='') {
  let t=document.getElementById('_toast');
  if (!t) {
    t=document.createElement('div'); t.id='_toast'; t.className='toast';
    document.body.appendChild(t);
  }
  t.textContent=msg; t.className=`toast ${type} show`;
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('show'),3500);
}
export function fmt(amount, symbol) {
  return `${symbol}${Number(amount||0).toLocaleString()}`;
                          }
                                                             
