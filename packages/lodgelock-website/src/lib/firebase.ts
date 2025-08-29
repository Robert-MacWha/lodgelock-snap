import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { browser } from '$app/environment';

const firebaseConfig = {
    apiKey: "AIzaSyCKITt_Dy5zb9ngJ1tSudN04KICSPGMwbM",
    authDomain: "tlock-974e6.firebaseapp.com",
    databaseURL: "https://tlock-974e6-default-rtdb.firebaseio.com",
    projectId: "tlock-974e6",
    storageBucket: "tlock-974e6.firebasestorage.app",
    messagingSenderId: "446655754880",
    appId: "1:446655754880:web:b947b2e7ac0d2c20c96c65",
    measurementId: "G-4DZY65DPRP"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = browser ? getAnalytics(app) : null;