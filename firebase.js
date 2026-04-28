import { initializeApp } from "https://esm.run/firebase@10.8.0/app";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, query, where, deleteField } from "https://esm.run/firebase@10.8.0/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://esm.run/firebase@10.8.0/auth";

const firebaseConfig = {
  apiKey: "AIzaSyASMrByO6jt_veaCaEDqdi-NdyEa7QFxSU",
  authDomain: "twisted-wonderland-archives.firebaseapp.com",
  projectId: "twisted-wonderland-archives",
  storageBucket: "twisted-wonderland-archives.firebasestorage.app",
  messagingSenderId: "205198629571",
  appId: "1:205198629571:web:2d21975d33495e218ae076"
};

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/ducs7aqwc/image/upload";
const CLOUDINARY_UPLOAD_PRESET  = "Twisted_Wonderland_Archives";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function uploadImageToCloudinary(fileOrBlob) {
    const formData = new FormData();
    formData.append('file', fileOrBlob);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    try {
        const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await response.json();
        return data.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
    } catch (error) {
        alert("อัปโหลดรูปล้มเหลว");
        return null;
    }
}

export { 
    db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, 
    setDoc, getDoc, query, where, deleteField, uploadImageToCloudinary,
    auth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut
};