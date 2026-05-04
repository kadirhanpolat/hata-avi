import { fbUpdate, fbSet, fbGet } from "../core/firebase.js";
import { gameRef } from "../core/paths.js";

export const AVATARS = [
  '🤖','🧠','⚡','🦊','🍉','🦍',
  '🐺','🦅','🐬','🦋','🎮','🚀',
  '🌟','🎯','🔥','💎','🏆','⚔️',
  '🧩','🎲','🌈','🦄','👾','🎭',
];

export const BADGES = [
  { id:'first',   label:'🏁 İlk',       cls:'badge-first',   desc:'İlk doğru cevap' },
  { id:'speed',   label:'⚡ Hızlı',      cls:'badge-speed',   desc:'5 saniyeden hızlı cevap' },
  { id:'streak',  label:'🔥 Seri',       cls:'badge-streak',  desc:'3+ doğru seri' },
  { id:'perfect', label:'🎯 Mükemmel',   cls:'badge-perfect', desc:'Tam puan (süre dolmadan)' },
  { id:'swift',   label:'🏆 Çevik',      cls:'badge-swift',   desc:'Tepki hızı: ilk 3' },
  { id:'veteran', label:'🏅 Emektar',    cls:'badge-veteran', desc:'5 oyun oynadı' },
];

export let playerProfile = {
  avatar: '🤖',
  name: '',
  earnedBadges: new Set(),
  sessionStats: { correct: 0, total: 0, bestStreak: 0, curStreak: 0 }
};

export function getDeviceUID() {
  let uid = localStorage.getItem('usev_uid');
  if (!uid) {
    uid = 'u-' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem('usev_uid', uid);
  }
  return uid;
}

export function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem('usevProfile') || '{}');
    if (p.avatar) playerProfile.avatar = p.avatar;
    if (p.name) {
      playerProfile.name = p.name;
      const nameInp = document.getElementById('nameInp');
      if (nameInp) nameInp.value = p.name;
    }
  } catch (e) { console.error("Error loading profile", e); }
}

export function saveProfile(playerName) {
  try {
    const existing = JSON.parse(localStorage.getItem('usevProfile') || '{}');
    const games = (existing.games || 0) + 1;
    const totalCorrect = (existing.totalCorrect || 0) + playerProfile.sessionStats.correct;
    const totalQuestions = (existing.totalQuestions || 0) + playerProfile.sessionStats.total;
    const bestStreak = Math.max(existing.bestStreak || 0, playerProfile.sessionStats.bestStreak);
    
    localStorage.setItem('usevProfile', JSON.stringify({
      avatar: playerProfile.avatar,
      name: playerName,
      games, totalCorrect, totalQuestions, bestStreak,
      lastPlayed: Date.now()
    }));
    
    if (games >= 5) awardBadge('veteran');
  } catch (e) { console.error("Error saving profile", e); }
}

export function getLocalProfileData() {
  try { return JSON.parse(localStorage.getItem('usevProfile') || '{}'); }
  catch (e) { return {}; }
}

export function awardBadge(id, playerUID, onBadgeAwarded) {
  if (playerProfile.earnedBadges.has(id)) return;
  playerProfile.earnedBadges.add(id);
  
  if (onBadgeAwarded) onBadgeAwarded(id);
  
  if (playerUID) {
    fbUpdate(gameRef('connections/' + playerUID), {
      badges: [...playerProfile.earnedBadges]
    });
  }
}
