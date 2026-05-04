import { db, ref, fbGet, fbSet, fbUpdate, onValue, fbRemove, fbPush } from "../core/firebase.js";
import { gameRef, orgRef, roomId, orgId } from "../core/paths.js";
import { updateFlowStep, getCatColorMod, rk } from "./ui.js";

export const gameStore = {
  isGame: false,
  questions: [],
  filteredQuestions: [],
  curRound: 0,
  roundDone: [],
  timerVal: 90,
  timerInt: null,
  timerRunning: false,
  autoAdvInt: null,
  selMusic: 'lobby',
  COLORS: ['#e84040', '#3b82f6', '#f5c518', '#3dd68c', '#a855f7', '#f97316'],
  SHAPES: ['â–²', 'â—†', 'â— ', 'â– ', 'â˜…', 'â™¥'],
  activeCatsMod: new Set(['__all__']),
  curGameMode: 'academy'
};



export function setLobby() {
  updateFlowStep('idle');
  gameStore.isGame = false;
  const pv = document.getElementById('phaseVal');
  if (pv) {
    pv.textContent = '⌛ LOBİ';
    pv.className = 'phase-val lobby';
  }
  const gc = document.getElementById('gameControls');
  if (gc) gc.classList.add('locked');
  const gc2b = document.getElementById('gameControls2');
  if (gc2b) {
    gc2b.classList.add('locked');
    gc2b.style.pointerEvents = 'none';
  }
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.disabled = false;
  ['finishBtn', 'replayBtn', 'exportBtn', 'liveSection'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

export function setGame() {
  gameStore.isGame = true;
  const pv = document.getElementById('phaseVal');
  if (pv) {
    pv.textContent = '🎮 YARIŞMA';
    pv.className = 'phase-val game';
  }
  const gc = document.getElementById('gameControls');
  if (gc) gc.classList.remove('locked');
  const gc2 = document.getElementById('gameControls2');
  if (gc2) {
    gc2.classList.remove('locked');
    gc2.style.pointerEvents = '';
  }
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.disabled = true;
  ['finishBtn', 'liveSection'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
  });
  ['replayBtn', 'exportBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const statusMsg = document.getElementById('statusMsg');
  if (statusMsg) statusMsg.textContent = 'Soruyu yayınlayın — süre otomatik başlar.';
}

export function setFinished() {
  gameStore.isGame = false;
  const pv = document.getElementById('phaseVal');
  if (pv) {
    pv.textContent = 'ğŸ   BİTTİ';
    pv.className = 'phase-val game';
  }
  const gc = document.getElementById('gameControls');
  if (gc) gc.classList.add('locked');
  const gc2b = document.getElementById('gameControls2');
  if (gc2b) {
    gc2b.classList.add('locked');
    gc2b.style.pointerEvents = 'none';
  }
  const finishBtn = document.getElementById('finishBtn');
  if (finishBtn) finishBtn.style.display = 'none';
  ['replayBtn', 'exportBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
  });
  const statusMsg = document.getElementById('statusMsg');
  if (statusMsg) statusMsg.textContent = 'Oyun bitti! Sonuçları indirin veya yeniden oynayın.';
}

export async function startGame() {
  await fbSet(gameRef('phase'), 'game');
  setGame();
}

export function initGameListeners() {
  onValue(gameRef('phase'), snap => {
    const p = snap.val();
    if (p === 'game') setGame();
    else if (p === 'finished') setFinished();
    else setLobby();
  });
}

export async function doReplay() {
  const cdEl = document.getElementById('autoAdvanceCountdown');
  if (cdEl) cdEl.style.display = 'none';
  clearInterval(gameStore.autoAdvInt);
  
  // Clear game data - connections KEPTS
  await fbRemove(gameRef('answers'));
  await fbRemove(gameRef('currentRound'));
  await fbRemove(gameRef('podium'));
  await fbRemove(gameRef('timer'));
  await fbRemove(gameRef('autoAdvance'));
  await fbSet(gameRef('phase'), 'lobby');
  
  gameStore.curRound = 0;
  gameStore.roundDone = Array(gameStore.filteredQuestions.length).fill(false);
  setLobby();
  
  const statusMsg = document.getElementById('statusMsg');
  const connSnap = await fbGet(gameRef('connections'));
  const connCount = Object.keys(connSnap.val() || {}).length;
  if (statusMsg) {
    if (connCount > 0) statusMsg.textContent = `ğŸ”„ Hazır! ${connCount} katılımcı bağlı, yeniden başlatın.`;
    else statusMsg.textContent = 'ğŸ”„ Yeniden oynamaya hazır! Katılımcılar hÃ¢lÃ¢ bağlı.';
  }
}

export async function finishGame(renderRoundCallback) {
  // Compute final stats
  const answersSnap = await fbGet(gameRef('answers'));
  const all = answersSnap.val() || {};
  const scores = {};
  
  Object.entries(all).forEach(([rIdx, ra]) => {
    Object.values(ra || {}).forEach(e => {
      if (!scores[e.name]) scores[e.name] = { name: e.name, score: 0, correct: 0, total: 0 };
      scores[e.name].total++;
      if (e.correct) { scores[e.name].correct++; scores[e.name].score += e.pts; }
    });
  });
  
  const podium = Object.values(scores).sort((a, b) => b.score - a.score).slice(0, 3);
  
  // Hardest question
  const qStats = {};
  Object.entries(all).forEach(([rIdx, ra]) => {
    const entries = Object.values(ra || {}); const total = entries.length;
    const correct = entries.filter(e => e.correct).length;
    qStats[rIdx] = { index: parseInt(rIdx), total, correct, rate: total > 0 ? correct / total : 0 };
  });
  
  const hardest = Object.values(qStats).sort((a, b) => a.rate - b.rate)[0];
  const hardestQ = hardest && gameStore.filteredQuestions[hardest.index] ? gameStore.filteredQuestions[hardest.index].title : '—';
  
  await fbSet(gameRef('phase'), 'finished');
  await fbSet(gameRef('podium'), {
    players: podium,
    hardest: { title: hardestQ, rate: hardest ? Math.round(hardest.rate * 100) : 0 }
  });
  
  // Save history
  try {
    const historyEntry = {
      ts: Date.now(),
      orgId,
      roomId,
      playerCount: Object.keys(scores).length,
      questionCount: gameStore.filteredQuestions.length,
      podium: podium.slice(0, 3),
      qStats: Object.fromEntries(
        Object.entries(qStats).map(([i, s]) => [i, {
          title: gameStore.filteredQuestions[parseInt(i)]?.title || '',
          diff: gameStore.filteredQuestions[parseInt(i)]?.diff || 'mid',
          qType: gameStore.filteredQuestions[parseInt(i)]?.qType || 'multiple',
          correct: s.correct, total: s.total, rate: Math.round(s.rate * 100)
        }])
      ),
      playerStats: Object.fromEntries(
        Object.values(scores).slice(0, 20).map(p => [
          p.name.replace(/[.#$/[\]]/g, '_'),
          { name: p.name, score: p.score, correct: p.correct, total: p.total }
        ])
      )
    };
    await fbPush(orgRef('history'), historyEntry);
  } catch (he) { console.warn('History save failed', he); }
  
  setFinished();
}

export async function exportResults() {
  const snap = await fbGet(gameRef('answers'));
  const all = snap.val() || {};
  const rows = [['Sıra', 'İsim', 'Toplam Puan', 'Doğru', 'Toplam Soru', 'Hız Ort (sn)', 'Seri Bonusu']];
  const totals = {};
  
  Object.entries(all).sort(([a], [b]) => parseInt(a) - parseInt(b)).forEach(([rIdx, ra]) => {
    Object.values(ra || {}).forEach(e => {
      if (!totals[e.name]) totals[e.name] = { name: e.name, score: 0, correct: 0, total: 0, bonusCount: 0, elapsedSum: 0, elapsedCount: 0 };
      totals[e.name].total++;
      if (e.correct) { totals[e.name].correct++; totals[e.name].score += e.pts; if (e.streakBonus) totals[e.name].bonusCount++; }
      if (e.elapsed > 0) { totals[e.name].elapsedSum += e.elapsed; totals[e.name].elapsedCount++; }
    });
  });
  
  Object.values(totals).sort((a, b) => b.score - a.score).forEach((p, i) => {
    rows.push([i + 1, p.name, p.score, p.correct, p.total, p.elapsedCount ? Math.round(p.elapsedSum / p.elapsedCount * 10) / 10 : 0, p.bonusCount]);
  });

  rows.push([]);
  rows.push(['--- SORU BAZLI ANALİZ ---']);
  const headerRow = ['Oyuncu'];
  gameStore.filteredQuestions.forEach((q, i) => headerRow.push(`S${i + 1}: ${q.title.substring(0, 20)}`));
  rows.push(headerRow);

  Object.values(totals).sort((a, b) => b.score - a.score).forEach(p => {
    const pRow = [p.name];
    gameStore.filteredQuestions.forEach((q, i) => {
      const ans = (all[i] || {})[p.name.replace(/[.#$/[\]]/g, '_')];
      if (!ans) pRow.push('—');
      else pRow.push(ans.correct ? `✅ (${ans.pts})` : `â Œ (${ans.pts})`);
    });
    rows.push(pRow);
  });

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `usev_results_${roomId}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function startTimer(dur, stopMusicCallback) {
  gameStore.timerVal = dur || 60;
  const el = document.getElementById('timerDisp');
  if (el) {
    el.textContent = gameStore.timerVal;
    el.className = 'timer-big running';
  }
  const stopBtn = document.getElementById('stopBtn');
  if (stopBtn) stopBtn.style.display = 'block';
  
  gameStore.timerRunning = true;
  fbSet(gameRef('timer'), { value: gameStore.timerVal, running: true, ts: Date.now() });
  
  gameStore.timerInt = setInterval(() => {
    gameStore.timerVal--;
    if (el) {
      el.textContent = gameStore.timerVal;
      if (gameStore.timerVal <= 10) el.className = 'timer-big urgent';
    }
    fbSet(gameRef('timer'), { value: gameStore.timerVal, running: gameStore.timerVal > 0, ts: Date.now() });
    
    if (gameStore.timerVal <= 0) {
      stopTimer(stopMusicCallback);
    }
  }, 1000);
}

export function stopTimer(stopMusicCallback) {
  clearInterval(gameStore.timerInt);
  gameStore.timerRunning = false;
  const el = document.getElementById('timerDisp');
  if (el) {
    el.className = 'timer-big';
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) stopBtn.style.display = 'none';
  }
  fbSet(gameRef('timer'), { value: gameStore.timerVal, running: false, ts: Date.now() });
  if (stopMusicCallback) stopMusicCallback();
}

export function buildFilteredQuestions() {
  if (gameStore.activeCatsMod.has('__all__')) { gameStore.filteredQuestions = [...gameStore.questions]; }
  else { gameStore.filteredQuestions = gameStore.questions.filter(q => gameStore.activeCatsMod.has(q.category || '')); }
  gameStore.roundDone = Array(gameStore.filteredQuestions.length).fill(false);
  if (gameStore.curRound >= gameStore.filteredQuestions.length) gameStore.curRound = 0;
}

export function renderCatFilterMod(renderNavCallback, renderRoundCallback) {
  const wrap = document.getElementById('catFilterMod');
  if (!wrap) return;
  const cats = [...new Set(gameStore.questions.map(q => q.category || '').filter(Boolean))].sort();
  if (!cats.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = '';
  
  const allBtn = document.createElement('button');
  allBtn.className = 'rbtn' + (gameStore.activeCatsMod.has('__all__') ? ' active' : '');
  allBtn.textContent = 'ğŸ · Tümü';
  allBtn.onclick = () => {
    gameStore.activeCatsMod = new Set(['__all__']);
    renderCatFilterMod(renderNavCallback, renderRoundCallback);
    buildFilteredQuestions();
    if (renderNavCallback) renderNavCallback();
    if (gameStore.filteredQuestions.length && renderRoundCallback) renderRoundCallback();
  };
  wrap.appendChild(allBtn);
  
  cats.forEach(cat => {
    const isActive = !gameStore.activeCatsMod.has('__all__') && gameStore.activeCatsMod.has(cat);
    const btn = document.createElement('button');
    btn.className = 'rbtn' + (isActive ? ' active' : '');
    const col = getCatColorMod(cat);
    if (isActive) { btn.style.borderColor = col; btn.style.color = col; }
    btn.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${col};margin-right:4px;vertical-align:middle;"></span>${cat}`;
    btn.onclick = () => {
      gameStore.activeCatsMod.delete('__all__');
      if (gameStore.activeCatsMod.has(cat)) gameStore.activeCatsMod.delete(cat);
      else gameStore.activeCatsMod.add(cat);
      if (!gameStore.activeCatsMod.size) gameStore.activeCatsMod.add('__all__');
      renderCatFilterMod(renderNavCallback, renderRoundCallback);
      buildFilteredQuestions();
      if (renderNavCallback) renderNavCallback();
      if (gameStore.filteredQuestions.length && gameStore.curRound < gameStore.filteredQuestions.length && renderRoundCallback) renderRoundCallback();
    };
    wrap.appendChild(btn);
  });
}

export async function previewRound(setBtnsPreviewCallback, stopMusicCallback) {
  if (!gameStore.isGame || !gameStore.filteredQuestions.length) return;
  const r = gameStore.filteredQuestions[gameStore.curRound];
  const dur = r.duration || 60;
  stopTimer(stopMusicCallback);
  await fbSet(gameRef('currentRound'), {
    index: gameStore.curRound, title: r.title, q: r.q, options: r.options, diff: r.diff,
    revealed: false, answerOpen: false,
    timerStart: null, duration: dur, hint: r.hint,
    totalRounds: gameStore.filteredQuestions.length,
    correctIndex: r.options ? r.options.findIndex(o => o.isCorrect) : 0,
    aiModel: r.aiModel || '', aiYear: r.aiYear || '', aiWrong: r.aiWrong ?? -1, aiReason: r.aiReason || '',
    category: r.category || '',
    image: r.image || null,
    qType: r.qType || 'multiple',
    numericAnswer: r.numericAnswer ?? null,
    numericUnit: r.numericUnit || '',
    modelAnswer: r.modelAnswer || '',
    reactionSignalTs: null
  });
  await fbRemove(gameRef('answers/' + gameStore.curRound));
  if (setBtnsPreviewCallback) setBtnsPreviewCallback();
  const statusMsg = document.getElementById('statusMsg');
  if (statusMsg) statusMsg.textContent = 'ğŸ“– Önizleme modu — katılımcılar soruyu okuyor...';
}

export async function openAnswering(setBtnsAnsweringCallback, playMusicCallback) {
  if (!gameStore.isGame || !gameStore.filteredQuestions.length) return;
  const r = gameStore.filteredQuestions[gameStore.curRound];
  const dur = r.duration || 60;
  await fbSet(gameRef('currentRound/answerOpen'), true);
  await fbSet(gameRef('currentRound/timerStart'), Date.now());
  if (setBtnsAnsweringCallback) setBtnsAnsweringCallback();
  const statusMsg = document.getElementById('statusMsg');
  if (statusMsg) statusMsg.textContent = `â–¶ Cevaplama başladı! Soru ${gameStore.curRound + 1}`;
  startTimer(dur);
  if (gameStore.selMusic && playMusicCallback) playMusicCallback(gameStore.selMusic);
}

export async function publishRound(setBtnsAnsweringCallback, playMusicCallback, stopMusicCallback) {
  if (!gameStore.isGame || !gameStore.filteredQuestions.length) return;
  const r = gameStore.filteredQuestions[gameStore.curRound];
  const dur = r.duration || 60;
  stopTimer(stopMusicCallback);
  await fbSet(gameRef('currentRound'), {
    index: gameStore.curRound, title: r.title, q: r.q, options: r.options, diff: r.diff,
    revealed: false, answerOpen: true,
    timerStart: Date.now(), duration: dur, hint: r.hint,
    totalRounds: gameStore.filteredQuestions.length,
    correctIndex: r.options ? r.options.findIndex(o => o.isCorrect) : 0,
    aiModel: r.aiModel || '', aiYear: r.aiYear || '', aiWrong: r.aiWrong ?? -1, aiReason: r.aiReason || '',
    category: r.category || '',
    image: r.image || null,
    qType: r.qType || 'multiple',
    numericAnswer: r.numericAnswer ?? null,
    numericUnit: r.numericUnit || '',
    modelAnswer: r.modelAnswer || '',
    reactionSignalTs: null
  });
  await fbRemove(gameRef('answers/' + gameStore.curRound));
  if (setBtnsAnsweringCallback) setBtnsAnsweringCallback();
  const statusMsg = document.getElementById('statusMsg');
  if (statusMsg) statusMsg.textContent = `✅ Soru ${gameStore.curRound + 1} yayınlandı!`;
  startTimer(dur);
  if (gameStore.selMusic && playMusicCallback) playMusicCallback(gameStore.selMusic);
}

export async function revealAnswer(stopMusicCallback, renderNavCallback, renderRoundCallback, revealSfxCallback) {
  if (revealSfxCallback) revealSfxCallback();
  updateFlowStep('revealed');
  const r = gameStore.filteredQuestions[gameStore.curRound];
  stopTimer(stopMusicCallback);
  const correctIndex = r.options ? r.options.findIndex(o => o.isCorrect) : 0;
  await fbUpdate(gameRef('currentRound'), {
    revealed: true, correctIndex, explain: r.explain,
    aiModel: r.aiModel || '', aiYear: r.aiYear || '', aiWrong: r.aiWrong ?? -1, aiReason: r.aiReason || '',
    modelAnswer: r.modelAnswer || ''
  });
  gameStore.roundDone[gameStore.curRound] = true;
  if (renderNavCallback) renderNavCallback();
  const revealBtn = document.getElementById('revealBtn');
  if (revealBtn) revealBtn.disabled = true;
  const statusMsg = document.getElementById('statusMsg');
  if (statusMsg) statusMsg.textContent = '✅ Cevap gösterildi!';
  
  const secs = parseInt(document.getElementById('autoAdvanceSel')?.value) || 0;
  if (secs > 0 && gameStore.curRound < gameStore.filteredQuestions.length - 1) {
    fbSet(gameRef('autoAdvance'), { active: true, seconds: secs, ts: Date.now() });
    let rem = secs;
    const cdEl = document.getElementById('autoAdvanceCountdown');
    if (cdEl) {
      cdEl.style.display = 'block'; cdEl.textContent = `â © ${rem}s`;
    }
    gameStore.autoAdvInt = setInterval(() => {
      rem--;
      if (cdEl) cdEl.textContent = `â © ${rem}s`;
      if (rem <= 0) {
        clearInterval(gameStore.autoAdvInt);
        if (cdEl) cdEl.style.display = 'none';
        fbSet(gameRef('autoAdvance'), { active: false, seconds: 0, ts: Date.now() });
        stopTimer(stopMusicCallback);
        gameStore.curRound++;
        if (renderRoundCallback) renderRoundCallback();
        setTimeout(() => publishRound(null, null, stopMusicCallback), 200);
      }
    }, 1000);
  }
}
export function renderRound() {
  if (!gameStore.filteredQuestions.length) return;
  const r = gameStore.filteredQuestions[gameStore.curRound];
  if (!r) return;

  const DIFF = { easy: 'ğŸŸ¢ KOLAY', mid: 'ğŸŸ¡ ORTA', hard: 'ğŸ”´ ZOR', vhard: 'ğŸŸ£ ÇOK ZOR' };
  const MODE_MULT = { academy: 1.0, showtime: 1.2, turbo: 1.5 };
  const mMult = MODE_MULT[gameStore.curGameMode] || 1.0;
  const MULT_MOD = {
    easy: '×' + (1 * mMult).toFixed(1).replace('.0', ''),
    mid: '×' + (1.5 * mMult).toFixed(1).replace('.0', ''),
    hard: '×' + (2 * mMult).toFixed(1).replace('.0', ''),
    vhard: '×' + (3 * mMult).toFixed(1).replace('.0', '')
  };

  const catHtml = r.category ? ` <span style="font-family:var(--mono);font-size:.52rem;padding:2px 6px;border-radius:3px;background:${getCatColorMod(r.category)}22;color:${getCatColorMod(r.category)};border:1px solid ${getCatColorMod(r.category)}44;">${r.category}</span>` : '';
  const qDiffEl = document.getElementById('qDiff');
  if (qDiffEl) qDiffEl.innerHTML = `${DIFF[r.diff] || ''} <span style="font-family:var(--display);font-size:.95rem;color:var(--accent);letter-spacing:1px;">${MULT_MOD[r.diff] || '×1'}</span>${catHtml}`;

  const qt = document.getElementById('qTitle');
  if (qt) {
    qt.textContent = r.title || '';
    setTimeout(() => rk(qt), 100);
  }

  const qx = document.getElementById('qText');
  if (qx) {
    qx.textContent = r.q || '';
    setTimeout(() => rk(qx), 100);
  }

  const td = document.getElementById('timerDisp');
  if (td) td.textContent = r.duration || 60;

  const og = document.getElementById('optsGrid');
  if (og) {
    og.innerHTML = '';
    const isOpen = r.qType === 'open_ended';
    const isReaction = r.qType === 'reaction';

    if (isReaction) {
      og.innerHTML = `<div style="background:rgba(245,197,24,.06);border:1px solid rgba(245,197,24,.3);border-radius:8px;padding:10px;grid-column:1/-1;">
        <div style="font-family:var(--display);font-size:.75rem;letter-spacing:1px;color:var(--accent);margin-bottom:5px;">⚡ TEPKİ HIZI SORUSU</div>
        <div style="font-family:var(--mono);font-size:.68rem;color:var(--muted);line-height:1.6;">Yayınla → "🚀 Sinyal Ver" → katılımcılar yarışır</div>
      </div>`;
    } else if (isOpen) {
      og.innerHTML = `<div style="background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.3);border-radius:8px;padding:10px;grid-column:1/-1;">
        <div style="font-family:var(--display);font-size:.75rem;letter-spacing:1px;color:var(--purple);margin-bottom:5px;">âœ ï¸  AÇIK UÇLU SORU Â· MODEL CEVAP</div>
        <div style="font-family:var(--mono);font-size:.7rem;color:var(--text);line-height:1.6;">${r.modelAnswer || '(model cevap girilmemiş)'}</div>
      </div>`;
    } else {
      const opts = r.options || [];
      const cols = opts.length > 4 ? 3 : 2;
      og.style.gridTemplateColumns = `repeat(${cols},1fr)`;
      opts.forEach((o, i) => {
        const bg = gameStore.COLORS[i] || '#888';
        const sh = gameStore.SHAPES[i] || String(i + 1);
        const d = document.createElement('div');
        d.className = 'opt-card';
        d.style.background = bg;
        d.innerHTML = `<div class="opt-shape">${sh}</div><div class="opt-math" style="color:#fff;">${o.text || '—'}</div>${o.isCorrect ? '<span class="opt-correct-tag">✓ DOĞRU</span>' : ''}`;
        og.appendChild(d);
        setTimeout(() => rk(d), 100);
      });
    }
  }

  const ais = document.getElementById('aiSummary');
  if (ais) {
    if (r.aiModel) {
      ais.style.display = 'block';
      const aiWrongTxt = r.aiWrong >= 0 && r.options && r.options[r.aiWrong] ? `${gameStore.SHAPES[r.aiWrong]} ${String.fromCharCode(65 + r.aiWrong)} şıkkı` : '—';
      const aisc = document.getElementById('aiSummaryContent');
      if (aisc) aisc.innerHTML = `<span>Model:</span> <span>${r.aiModel} (${r.aiYear || '?'})</span> Â· <span>Yanlış Seçim:</span> <span>${aiWrongTxt}</span>`;
    } else {
      ais.style.display = 'none';
    }
  }

  ['previewBtn', 'publishBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });
  const rb = document.getElementById('revealBtn');
  if (rb) rb.disabled = true;
  const oab = document.getElementById('openAnswerBtn');
  if (oab) {
    oab.style.display = 'none';
    oab.disabled = true;
  }
  renderNav();
}

export function renderNav() {
  const nav = document.getElementById('roundNav');
  if (!nav) return;
  nav.innerHTML = '';
  gameStore.filteredQuestions.forEach((r, i) => {
    const d = r.diff === 'easy' ? 'ğŸŸ¢' : r.diff === 'mid' ? 'ğŸŸ¡' : r.diff === 'hard' ? 'ğŸ”´' : 'ğŸŸ£';
    const b = document.createElement('button');
    b.className = 'rbtn' + (i === gameStore.curRound ? ' active' : '') + (gameStore.roundDone[i] ? ' done' : '');
    b.textContent = `${d} ${i + 1}`;
    b.onclick = () => {
      stopTimer();
      gameStore.curRound = i;
      renderRound();
    };
    nav.appendChild(b);
  });
}

export function nextRound(stopMusicCallback) {
  clearInterval(gameStore.autoAdvInt);
  const cdEl = document.getElementById('autoAdvanceCountdown');
  if (cdEl) cdEl.style.display = 'none';
  fbSet(gameRef('autoAdvance'), { active: false, seconds: 0, ts: Date.now() });
  if (gameStore.curRound < gameStore.filteredQuestions.length - 1) {
    stopTimer(stopMusicCallback);
    gameStore.curRound++;
    renderRound();
  }
}

/**
 * v3.5: Missing Game Control Functions
 */

export async function setGameMode(mode) {
  gameStore.curGameMode = mode;
  await fbSet(gameRef('mode'), mode);
  
  // Update UI selector
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  
  // Re-render current round to update multipliers if needed
  renderRound();
}

export async function generatePin() {
  const pin = Math.floor(1000 + Math.random() * 9000);
  await fbSet(gameRef('pin'), pin);
  const disp = document.getElementById('pinDisplay');
  if (disp) disp.textContent = pin;
}

export async function clearPin() {
  await fbRemove(gameRef('pin'));
  const disp = document.getElementById('pinDisplay');
  if (disp) disp.textContent = 'â€”â€”';
}

export async function sendReactionSignal() {
  const btn = document.getElementById('reactionSignalBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'âš¡ SÃ„Â°NYAL GÃƒâ€“NDERÃ„Â°LDÃ„Â°!';
  }
  await fbUpdate(gameRef('currentRound'), {
    reactionSignalTs: Date.now(),
    answerOpen: true
  });
  const rb = document.getElementById('revealBtn');
  if (rb) rb.disabled = false;
  const sm = document.getElementById('statusMsg');
  if (sm) sm.textContent = 'âš¡ Sinyal verildi! Oyuncular yarÃ„Â±Ã…ÅŸÃ„Â±yor...';
}

/**
 * PIN Listener for initial load
 */
export function initPinListener() {
  onValue(gameRef('pin'), snap => {
    const p = snap.val();
    const disp = document.getElementById('pinDisplay');
    if (disp) disp.textContent = p || 'â€”â€”';
  });
}

/**
 * v3.5: Team Management
 */

export async function toggleTeamMode() {
  const chk = document.getElementById('teamModeChk');
  const active = chk ? chk.checked : false;
  document.getElementById('teamSetup').style.display = active ? 'block' : 'none';
  await fbUpdate(gameRef('teamMode'), { active });
}

export function addTeam(name = '', color = '') {
  const list = document.getElementById('teamsList');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'team-row';
  const c = color || gameStore.COLORS[list.children.length % gameStore.COLORS.length];
  row.innerHTML = `
    <div class="team-color-dot" style="background:${c}" onclick="this.style.background=window.cycleTeamColor(this)"></div>
    <input class="team-name-inp" value="${name}" placeholder="TakÃ„Â±m AdÃ„Â±">
    <button class="team-del" onclick="this.parentElement.remove()">âœ•</button>
  `;
  list.appendChild(row);
}

export async function saveTeams() {
  const list = document.getElementById('teamsList');
  const teams = [];
  [...list.children].forEach(row => {
    const name = row.querySelector('input').value.trim();
    const color = row.querySelector('.team-color-dot').style.backgroundColor;
    if (name) teams.push({ name, color });
  });
  await fbUpdate(gameRef('teamMode'), { teams });
  const status = document.getElementById('teamSaveStatus');
  if (status) {
    status.textContent = 'âœ… Kaydedildi!';
    setTimeout(() => status.textContent = '', 2000);
  }
}

window.cycleTeamColor = (el) => {
  const cur = el.style.backgroundColor;
  const idx = gameStore.COLORS.findIndex(c => c === cur) || 0;
  const next = gameStore.COLORS[(idx + 1) % gameStore.COLORS.length];
  return next;
};

export function loadModSet(setId = null) {
  // For now, this just updates the active category or set filter
  // Future: fetch only questions from a specific set
  if (setId === null) {
    gameStore.activeCatsMod = new Set(['__all__']);
  } else {
    // Basic implementation: find questions with this setId if it exists
    // or just use it as a placeholder for now.
  }
  buildFilteredQuestions();
  renderRound();
  renderNav();
}




export function setBtnsPreview() {
  updateFlowStep('preview');
  const pb = document.getElementById('previewBtn'); if (pb) pb.disabled = true;
  const pub = document.getElementById('publishBtn'); if (pub) pub.disabled = true;
  const oab = document.getElementById('openAnswerBtn');
  if (oab) {
    oab.style.display = 'inline-flex';
    oab.disabled = false;
  }
  const rb = document.getElementById('revealBtn'); if (rb) rb.disabled = true;
}

export function setBtnsAnswering() {
  updateFlowStep('answering');
  const pb = document.getElementById('previewBtn'); if (pb) pb.disabled = true;
  const pub = document.getElementById('publishBtn'); if (pub) pub.disabled = true;
  const oab = document.getElementById('openAnswerBtn'); if (oab) oab.style.display = 'none';
  const rb = document.getElementById('revealBtn'); if (rb) rb.disabled = false;

  const r = gameStore.filteredQuestions[gameStore.curRound];
  const isReaction = r && r.qType === 'reaction';
  const rsb = document.getElementById('reactionSignalBtn');
  if (rsb) {
    rsb.style.display = isReaction ? 'inline-flex' : 'none';
    rsb.disabled = false;
  }
  if (isReaction && rb) rb.disabled = true;
}

