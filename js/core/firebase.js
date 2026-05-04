import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, set, remove, update, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPbvuN7IA6e78-fym8nF6m5gW1fUPf7lw",
  authDomain: "hata-avi.firebaseapp.com",
  databaseURL: "https://hata-avi-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hata-avi",
  storageBucket: "hata-avi.firebasestorage.app",
  messagingSenderId: "725079545594",
  appId: "1:725079545594:web:040eb5d99bf55567a81b43"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { app, db, auth, ref, get as fbGet, set as fbSet, remove as fbRemove, update as fbUpdate, onValue, push as fbPush };

