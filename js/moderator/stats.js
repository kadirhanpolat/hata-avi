import { fbGet } from "../core/firebase.js";
import { gameRef } from "../core/paths.js";
import { gameStore } from "./game.js";

export function openAnalytics() {
  fbGet(gameRef()).then(snap => {
    const data = snap.val() || {};
    const answers = data.answers || {};
    const conns = data.connections || {};
    const participants = Object.keys(conns).length;

    let totalCorrect = 0, totalAnswers = 0, totalTime = 0;
    const questionsStats = [];

    Object.entries(answers).forEach(([rIdx, ra]) => {
      const qAnswers = Object.values(ra || {});
      const qCorrect = qAnswers.filter(a => a.correct).length;
      const qTotal = qAnswers.length;
      const qTimeSum = qAnswers.reduce((sum, a) => sum + (a.elapsed || 0), 0);
      const qRef = gameStore.filteredQuestions[rIdx];

      if (qRef) {
        questionsStats.push({
          index: parseInt(rIdx) + 1,
          title: qRef.title || qRef.q || 'Soru ' + (parseInt(rIdx) + 1),
          correctPct: qTotal > 0 ? Math.round((qCorrect / qTotal) * 100) : 0,
          avgTime: qTotal > 0 ? (qTimeSum / qTotal).toFixed(1) : 0,
          total: qTotal
        });
        totalCorrect += qCorrect;
        totalAnswers += qTotal;
        totalTime += qTimeSum;
      }
    });

    const stP = document.getElementById('stParticipants'); if (stP) stP.textContent = participants;
    const stAS = document.getElementById('stAvgSuccess'); if (stAS) stAS.textContent = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) + '%' : '0%';
    const stAT = document.getElementById('stAvgTime'); if (stAT) stAT.textContent = totalAnswers > 0 ? (totalTime / totalAnswers).toFixed(1) + 's' : '0s';

    const sorted = [...questionsStats].filter(q => q.total > 0).sort((a, b) => a.correctPct - b.correctPct);
    const hardest = sorted[0];
    const hqcTitle = document.getElementById('hqcTitle');
    const hqcStats = document.getElementById('hqcStats');
    if (hardest) {
      if (hqcTitle) hqcTitle.textContent = hardest.title;
      if (hqcStats) hqcStats.textContent = `Doğru cevaplanma oranı: %${hardest.correctPct} Â· Ortalama süre: ${hardest.avgTime}sn`;
    }

    const tbody = document.getElementById('analyticsTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      questionsStats.forEach(q => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${q.index}</td><td>${q.title}</td><td style="color:var(--accent3);">${q.correctPct}%</td><td style="color:var(--accent2);">${100 - q.correctPct}%</td><td>${q.avgTime}s</td>`;
        tbody.appendChild(tr);
      });
    }

    const meta = document.getElementById('analyticsMeta');
    if (meta) meta.textContent = new Date().toLocaleString('tr-TR');
    
    const overlay = document.getElementById('analyticsOverlay');
    if (overlay) overlay.classList.add('visible');
  });
}

export function closeAnalytics() {
  const overlay = document.getElementById('analyticsOverlay');
  if (overlay) overlay.classList.remove('visible');
}

export function updateLiveAnswers(all) {
  const cur = all[gameStore.curRound] || {};
  const entries = Object.values(cur);
  const curQ = gameStore.filteredQuestions[gameStore.curRound];
  const isPoll = (curQ && curQ.qType) === 'poll';
  const total = entries.length;
  const correct = entries.filter(e => e.correct || e.approved === true).length;

  const sCevap = document.getElementById('sCevap'); if (sCevap) sCevap.textContent = total;
  const sDogru = document.getElementById('sDoğru');
  const sOran = document.getElementById('sOran');

  if (isPoll) {
    if (sDogru) sDogru.textContent = '—';
    if (sOran) sOran.textContent = '—';
  } else {
    if (sDogru) sDogru.textContent = correct;
    if (sOran) sOran.textContent = total ? Math.round(correct / total * 100) + '%' : '—';
  }

  const rate = total ? Math.round(correct / total * 100) : 0;
  const fill = document.getElementById('accBarFill');
  if (fill) {
    fill.style.width = (isPoll ? 0 : rate) + '%';
    fill.style.background = rate >= 60 ? 'var(--accent3)' : rate >= 35 ? 'var(--accent)' : 'var(--accent2)';
  }

  const al = document.getElementById('answersLive');
  if (!al) return;

  const isOpen = (curQ && curQ.qType) === 'open_ended';
  const oeb = document.getElementById('openEndedBulk');
  if (oeb) oeb.style.display = isOpen && total ? 'flex' : 'none';

  if (!total) {
    al.innerHTML = '<div class="empty">Henüz cevap yok</div>';
  } else if (isOpen) {
    al.innerHTML = '';
    const maxPts = Math.round((curQ.duration || 60) * (curQ.diff === 'easy' ? 1 : curQ.diff === 'hard' ? 2 : curQ.diff === 'vhard' ? 3 : 1.5));
    [...entries].sort((a, b) => a.name.localeCompare(b.name)).forEach(e => {
      const key = e.name.replace(/[.#$/[\]]/g, '_');
      const approved = e.approved;
      const d = document.createElement('div');
      d.className = 'ans-row ans-open-row ' + (approved === true ? 'ok' : approved === false ? 'fail' : 'pending');
      const statusIcon = approved === true ? '✅' : approved === false ? 'â Œ' : '⌛';
      d.innerHTML = `<div class="ans-open-ctrl"><span class="ans-name" style="font-weight:600;">${statusIcon} ${e.name}</span><span class="ans-pts" style="margin-left:auto;">${approved === true ? (e.pts > 0 ? '+' + e.pts + ' PT' : '0 PT') : '—'}</span></div><div class="ans-open-text">${e.textAnswer || '(boş)'}</div><div class="ans-open-ctrl" style="gap:5px;"><button class="oe-approve" onclick="approveAnswer('${key}',${gameStore.curRound})">✅ Onayla</button><button class="oe-reject" onclick="rejectAnswer('${key}',${gameStore.curRound})">â Œ Reddet</button><span class="oe-pts-lbl">Puan:</span><input class="oe-pts-inp" id="pts-${key}" type="number" placeholder="${maxPts}" min="0" max="${maxPts}" value="${e.approved === true && e.pts != null ? e.pts : maxPts}"></div>`;
      al.appendChild(d);
    });
  } else if ((curQ && curQ.qType) === 'reaction') {
    al.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    [...entries].filter(e => e.reactionMs != null).sort((a, b) => a.reactionMs - b.reactionMs).forEach((e, i) => {
      const d = document.createElement('div');
      d.className = 'ans-row ok';
      d.innerHTML = `<span class="ans-name">${medals[i] || '#' + (i + 1)} ${e.name}</span><span class="ans-pts" style="color:#3b82f6;letter-spacing:0;">${e.reactionMs}ms</span><span class="ans-pts">+${e.pts || 0}</span>`;
      al.appendChild(d);
    });
  } else if (isPoll) {
    al.innerHTML = '';
    [...entries].forEach(e => {
      const d = document.createElement('div');
      d.className = 'ans-row ok';
      d.innerHTML = `<span class="ans-name">${e.name}</span><span class="ans-pts" style="color:#14b8a6;">Oy Verdi</span>`;
      al.appendChild(d);
    });
  } else {
    al.innerHTML = '';
    [...entries].sort((a, b) => b.pts - a.pts).forEach(e => {
      const d = document.createElement('div');
      d.className = 'ans-row ' + (e.correct ? 'ok' : 'fail');
      const hintIcon = e.hintUsed ? '<span title="İpucu kullandı (−5 PT)" style="font-size:.75rem;margin-right:2px;">ğŸ’¡</span>' : '';
      d.innerHTML = `<span class="ans-name">${hintIcon}${e.name}</span><span class="ans-pts">${e.pts > 0 ? '+' + e.pts : 0}</span><span>${e.correct ? '✅' : 'â Œ'}</span>`;
      al.appendChild(d);
    });
  }
}
