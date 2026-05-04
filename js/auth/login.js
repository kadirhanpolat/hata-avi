import { db, ref, fbGet, fbSet, auth, onValue } from "../core/firebase.js";
import { roomId, orgId, roomUrl } from "../core/paths.js";
import { sha256 } from "../utils/crypto.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Default admin credentials
const DEFAULT_USER = 'admin';
const DEFAULT_PASS_HASH = 'e81a88ee61034df23c8738bf1452d1f8f0c8023d57d16d063dcd4a8c9005c3d6'; // '.admin.'

async function getAdminHash() {
  return await sha256('.admin.');
}

export async function ensureDefaults() {
  try {
    const orgSnap = await fbGet(ref(db, 'config/orgs/main'));
    if (!orgSnap.val()) {
      await fbSet(ref(db, 'config/orgs/main'), {
        id: 'main',
        name: 'Ana Organizasyon',
        status: 'active',
        createdAt: Date.now(),
        createdBy: 'system'
      });
    }
  } catch (e) {
    console.log("Database rules active, ensureDefaults skipped.");
  }
}

export function normalizeOrgIds(matched) {
  if (!matched.orgIds) return (matched.role === 'admin' ? ['*'] : ['main']);
  if (Array.isArray(matched.orgIds)) return matched.orgIds;
  return Object.keys(matched.orgIds);
}

export async function findModeratorForAuthUser(authUser) {
  const byUidSnap = await fbGet(ref(db, `config/moderatorsByUid/${authUser.uid}`));
  if (byUidSnap.val()) {
    const key = byUidSnap.val();
    const modSnap = await fbGet(ref(db, `config/moderators/${key}`));
    if (modSnap.val()) return { key, ...modSnap.val(), authUid: authUser.uid, email: authUser.email };
  }
  const snap = await fbGet(ref(db, 'config/moderators'));
  const mods = snap.val() || {};
  for (const [key, m] of Object.entries(mods)) {
    if (m.authUid === authUser.uid || (m.email && authUser.email && m.email.toLowerCase() === authUser.email.toLowerCase())) {
      return { key, ...m, authUid: authUser.uid, email: authUser.email };
    }
  }
  return null;
}

export async function doLogin() {
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value;
  const errEl = document.getElementById('errMsg');
  const btn = document.getElementById('loginBtn');
  const spinner = document.getElementById('spinner');

  if (!user || !pass) {
    errEl.textContent = 'Kullanıcı adı ve parola zorunlu.';
    return;
  }
  errEl.textContent = '';
  btn.disabled = true;
  spinner.style.display = 'block';

  try {
    console.log("Attempting login for:", user);
    let matched = null;
    let authProvider = 'legacy';
    let authUid = '';

    if (user.includes('@')) {
      const cred = await signInWithEmailAndPassword(auth, user, pass);
      authProvider = 'firebase';
      authUid = cred.user.uid;
      matched = await findModeratorForAuthUser(cred.user);
      if (!matched) {
        await signOut(auth).catch(() => {});
        errEl.textContent = 'Bu e-posta icin moderator yetkisi bulunamadi.';
        btn.disabled = false;
        spinner.style.display = 'none';
        return;
      }
      // v3.5: Auto-persist UID mapping for security rules
      if (!matched.authUid || matched.authUid !== cred.user.uid) {
        console.log("Auto-mapping UID for:", matched.username);
        await fbSet(ref(db, `config/moderatorsByUid/${cred.user.uid}`), matched.key);
        await fbSet(ref(db, `config/moderators/${matched.key}/authUid`), cred.user.uid);
        matched.authUid = cred.user.uid;
      }
    } else {
      const hash = await sha256(pass);
      console.log("Computed hash:", hash);
      const snap = await fbGet(ref(db, 'config/moderators'));
      const mods = snap.val() || {};
      console.log("Moderators found in DB:", Object.keys(mods));

      Object.values(mods).forEach(m => {
        if (m.username === user && m.passwordHash === hash) matched = m;
      });

      if (!matched) {
        console.log("No match in moderators, checking adminAuth fallback...");
        const oldSnap = await fbGet(ref(db, 'config/adminAuth'));
        const old = oldSnap.val();
        if (old) console.log("adminAuth found:", old.username);
        if (old && old.username === user && old.passwordHash === hash) {
          matched = { username: user, role: 'admin', orgIds: { '*': true } };
        }
      }

      if (!matched && Object.keys(mods).length === 0) {
        console.log("DB empty, checking default account...");
        const dHash = await getAdminHash();
        if (user === DEFAULT_USER && hash === dHash) {
          matched = { username: user, role: 'admin', orgIds: { '*': true } };
        }
      }
    }

    if (matched) {
      console.log("Login SUCCESS for:", matched.username);
      const orgIds = normalizeOrgIds(matched);
      const canAccessOrg = orgIds.includes('*') || orgIds.includes(orgId);
      if (!canAccessOrg) {
        errEl.textContent = 'Bu hesabin bu organizasyona erisimi yok.';
        btn.disabled = false;
        spinner.style.display = 'none';
        return;
      }
      sessionStorage.setItem('modAuth', '1');
      sessionStorage.setItem('modUser', matched.username);
      sessionStorage.setItem('modRole', matched.role || 'moderator');
      sessionStorage.setItem('modOrgIds', JSON.stringify(orgIds));
      sessionStorage.setItem('modOrg', orgId);
      sessionStorage.setItem('modAuthProvider', authProvider);
      if (authUid) sessionStorage.setItem('modAuthUid', authUid);
      window.location.href = roomUrl('moderator.html');
    } else {
      console.log("Login FAILED: Incorrect username or password.");
      errEl.textContent = '❌ Kullanıcı adı veya parola hatalı.';
      document.getElementById('password').classList.add('error');
      setTimeout(() => document.getElementById('password').classList.remove('error'), 1500);
    }
  } catch (e) {
    console.error("Login Error:", e);
    errEl.textContent = 'Bağlantı hatası. Tekrar deneyin.';
  }
  btn.disabled = false;
  spinner.style.display = 'none';
}

// Global export
window.doLogin = doLogin;
