import { db, ref, onValue, fbGet } from "../core/firebase.js";
import { roomId, orgId, gameRef, orgRef } from "../core/paths.js";

export const DIFF_LABEL = { easy: 'KOLAY', mid: 'ORTA', hard: 'ZOR', vhard: 'ÇOK ZOR' };
export const DIFF_COLOR = { easy: 'var(--accent3)', mid: 'var(--accent)', hard: 'var(--accent2)', vhard: 'var(--purple)' };

// STATE
export let allAnswers = {};
export let questions = [];
export let curRound = null;
export let connections = {};
export let historyData = [];
export let selectedHistory = new Set();

export function switchTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`[onclick="switchTab('${id}')"]`);
  if (btn) btn.classList.add('active');
  document.getElementById('panel-' + id).classList.add('active');
  renderTab(id);
}

export function renderTab(id) {
  // These will be defined in the main stats module or exported here
  if (id === 'canli') window.renderLive();
  else if (id === 'sorular') window.renderQuestionAnalysis();
  else if (id === 'oyuncular') window.renderPlayers();
  else if (id === 'hiz') window.renderSpeed();
  else if (id === 'gecmis') window.renderHistory();
  
  if (id !== 'gecmis') {
    selectedHistory.clear();
    window.updateCompareBar();
  }
}

// Global exports for HTML
window.switchTab = switchTab;
