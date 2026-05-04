import { ref } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from "./firebase.js";

const roomParams = new URLSearchParams(window.location.search);

// Room Logic
const rawRoomId = roomParams.get('room') || sessionStorage.getItem('usev_room') || 'main';
const roomId = rawRoomId.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'main';
sessionStorage.setItem('usev_room', roomId);

// Org Logic
const rawOrgId = roomParams.get('org') || sessionStorage.getItem('usev_org') || 'main';
const orgId = rawOrgId.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'main';
sessionStorage.setItem('usev_org', orgId);

// Global properties for easy access (compatibility)
window.usevRoomId = roomId;
window.usevOrgId = orgId;

/**
 * Path Helpers
 */
export function gamePath(path = '') {
  return `rooms/${roomId}/game${path ? '/' + path : ''}`;
}

export function gameRef(path = '') {
  return ref(db, gamePath(path));
}

export function orgPath(path = '') {
  return `orgs/${orgId}${path ? '/' + path : ''}`;
}

export function orgRef(path = '') {
  return ref(db, orgPath(path));
}

export function roomUrl(page) {
  return `${page}?room=${encodeURIComponent(roomId)}&org=${encodeURIComponent(orgId)}`;
}

export function goRoom(page) {
  window.location.href = roomUrl(page);
}

window.roomUrl = roomUrl; // Export to window for HTML onclick usage
window.goRoom = goRoom;

export { roomId, orgId };
