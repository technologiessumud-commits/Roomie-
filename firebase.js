import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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
