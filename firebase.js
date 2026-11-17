/* ==========================================================================
   Glamorous Nails — Firebase bootstrap
   Single place that initializes the Firebase app and exports the SDK
   handles (auth, db, storage) everything else needs. Uses the modular v12 SDK
   loaded straight from the gstatic CDN, so no build step is required —
   any script that needs Firebase just does:
     import { auth, db, storage } from './firebase.js';
   and must itself be loaded as <script type="module">.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyACbh_bGM0ggINjzSXJ6ClY_fsp3hNfRZk",
  authDomain: "glamorous-nails.firebaseapp.com",
  projectId: "glamorous-nails",
  storageBucket: "glamorous-nails.firebasestorage.app",
  messagingSenderId: "295545496415",
  appId: "1:295545496415:web:f8626d4648a29448faccea",
  measurementId: "G-4XM05ZNQ3L"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/* Analytics only works in a real browser with cookies/3rd-party scripts
   allowed — isSupported() avoids console errors in restrictive contexts. */
isSupported().then((ok) => { if (ok) getAnalytics(app); }).catch(() => {});