import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase.js";
import { roomUrl } from "./paths.js";

export function clearModSession() {
  sessionStorage.removeItem('modAuth');
  sessionStorage.removeItem('modUser');
  sessionStorage.removeItem('modRole');
  sessionStorage.removeItem('modOrgIds');
  sessionStorage.removeItem('modOrg');
  sessionStorage.removeItem('modAuthProvider');
  sessionStorage.removeItem('modAuthUid');
}

export function doLogout() {
  clearModSession();
  signOut(auth).catch(() => {});
  window.location.href = roomUrl('login.html');
}

export async function requireModeratorSession() {
  if (sessionStorage.getItem('modAuth') !== '1') {
    window.location.href = roomUrl('login.html');
    return false;
  }

  // Setup real-time listener for Auth persistence
  onAuthStateChanged(auth, user => {
    if (sessionStorage.getItem('modAuthProvider') === 'firebase') {
      const expectedUid = sessionStorage.getItem('modAuthUid');
      if (!user || (expectedUid && user.uid !== expectedUid)) {
        console.warn("Auth session lost or mismatched");
        doLogout();
      }
    }
  });

  // Org authorization check
  const modOrgIds = (() => {
    try {
      const val = sessionStorage.getItem('modOrgIds');
      if (!val) return ['main'];
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : Object.keys(parsed);
    } catch (e) {
      return ['main'];
    }
  })();

  const currentOrgId = sessionStorage.getItem('usev_org') || 'main';
  if (!modOrgIds.includes('*') && !modOrgIds.includes(currentOrgId)) {
    console.error("No access to current organization");
    doLogout();
    return false;
  }

  return true;
}

// Global exports for compatibility
window.doLogout = doLogout;
window.clearModSession = clearModSession;
