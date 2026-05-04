import { playerProfile, AVATARS, BADGES } from "./profile.js";

export const MODES = {
  academy: {
    '--bg':'#f8fafc','--surface':'#ffffff','--card':'#ffffff','--border':'#e2e8f0',
    '--accent':'#3b82f6','--accent2':'#ef4444','--accent3':'#10b981','--purple':'#8b5cf6',
    '--text':'#0f172a','--muted':'#64748b','--display':"'IBM Plex Sans',sans-serif"
  },
  showtime: {
    '--bg':'#09090b','--surface':'#111113','--card':'#18181b','--border':'#27272a',
    '--accent':'#f5c518','--accent2':'#e84040','--accent3':'#3dd68c','--purple':'#a855f7',
    '--text':'#f4f4f5','--muted':'#71717a','--display':"'Bebas Neue',sans-serif"
  },
  turbo: {
    '--bg':'#050505','--surface':'#0a0a0a','--card':'#111111','--border':'#222222',
    '--accent':'#00f2ff','--accent2':'#ff0055','--accent3':'#39ff14','--purple':'#bc13fe',
    '--text':'#ffffff','--muted':'#666666','--display':"'Bebas Neue',sans-serif"
  }
};

let displayScore = 0;

export function applyGameMode(m) {
  const theme = MODES[m] || MODES.showtime;
  const root = document.documentElement;
  Object.entries(theme).forEach(([k, v]) => root.style.setProperty(k, v));
  document.body.setAttribute('data-mode', m);
}

export function updateScoreAnimated(newScore, addedPts = 0) {
  const el = document.getElementById('myScore');
  if (!el) return;
  
  if (addedPts > 0) {
    const float = document.createElement('div');
    float.className = 'floating-pts';
    float.textContent = '+' + addedPts;
    const rect = el.getBoundingClientRect();
    float.style.left = (rect.left + rect.width / 2) + 'px';
    float.style.top = rect.top + 'px';
    document.body.appendChild(float);
    setTimeout(() => float.remove(), 1000);
    
    el.classList.add('score-glow');
    setTimeout(() => el.classList.remove('score-glow'), 600);
  }

  const start = displayScore;
  const end = newScore;
  const duration = 1000;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; 
    const val = Math.floor(start + (end - start) * ease(progress));
    el.textContent = val + ' PT';
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      displayScore = end;
      el.textContent = end + ' PT';
    }
  }
  requestAnimationFrame(step);
}

export function renderAvatarGrid(onAvatarSelected) {
  const grid = document.getElementById('avatarGrid');
  if (!grid) return;
  grid.innerHTML = '';
  AVATARS.forEach(av => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'avatar-btn' + (playerProfile.avatar === av ? ' selected' : '');
    btn.textContent = av;
    btn.onclick = () => {
      playerProfile.avatar = av;
      grid.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (onAvatarSelected) onAvatarSelected(av);
    };
    grid.appendChild(btn);
  });
}

export function renderBadges(containerId, earnedBadges, newId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  BADGES.forEach(b => {
    const chip = document.createElement('div');
    const earned = earnedBadges.has(b.id);
    chip.className = 'badge-chip ' + b.cls + (earned ? ' earned' : '');
    if (earned && b.id === newId) chip.classList.add('new-badge');
    chip.title = b.desc;
    chip.textContent = b.label;
    el.appendChild(chip);
  });
}

export function showBadgeNotif(id) {
  const b = BADGES.find(x => x.id === id);
  if (!b) return;
  const div = document.createElement('div');
  div.className = 'badge-notif-toast';
  div.innerHTML = `<div class="bnt-icon">🏅</div><div class="bnt-body"><div class="bnt-title">ROZET KAZANILDI!</div><div class="bnt-desc">${b.label}: ${b.desc}</div></div>`;
  document.body.appendChild(div);
  setTimeout(() => div.classList.add('visible'), 50);
  setTimeout(() => {
    div.classList.remove('visible');
    setTimeout(() => div.remove(), 500);
  }, 4000);
}

export function updateStreakBadge(streak) {
  const badge = document.getElementById('streakBadge');
  const num = document.getElementById('streakNum');
  const bonus = document.getElementById('bonusNotif');
  if (!badge || !num) return;
  
  if (streak >= 3) {
    num.textContent = streak;
    badge.classList.add('visible');
    if (streak >= 5) {
      badge.classList.add('bonus');
      if (bonus) bonus.classList.add('visible');
    } else {
      badge.classList.remove('bonus');
      if (bonus) bonus.classList.remove('visible');
    }
  } else {
    badge.classList.remove('visible', 'bonus');
    if (bonus) bonus.classList.remove('visible');
  }
}

export function renderTeamSelectUI(teamsData, playerTeam, onTeamSelected) {
  const grid = document.getElementById('teamsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  teamsData.forEach(t => {
    const btn = document.createElement('div');
    btn.className = 'team-btn' + (playerTeam === t.name ? ' selected' : '');
    btn.style.background = t.color + '22';
    btn.style.borderColor = playerTeam === t.name ? t.color : 'transparent';
    btn.style.color = t.color;
    btn.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${t.color};flex-shrink:0;"></span>${t.name}`;
    btn.onclick = () => {
      if (onTeamSelected) onTeamSelected(t.name);
    };
    grid.appendChild(btn);
  });
}

export function showResult(correct, pts, explain, timeout, multiplier, streakBonus) {
  const rc = document.getElementById('resultCard');
  if (!rc) return;
  
  if (timeout) {
    rc.className = 'result-card visible fail';
    document.getElementById('resEmoji').textContent = '⌛';
    document.getElementById('resTitle').innerHTML = '<span style="color:var(--accent2)">SÜRE DOLDU</span>';
    document.getElementById('resPts').className = 'res-pts zero';
    document.getElementById('resPts').textContent = '0 PT';
  } else if (correct) {
    rc.className = 'result-card visible ok';
    document.getElementById('resEmoji').textContent = streakBonus ? '🔥' : '🎯';
    const multTxt = multiplier && multiplier > 1 ? ` <span style="font-size:.7em;color:var(--muted);">×${multiplier}</span>` : '';
    const bonusTxt = streakBonus ? ` <span style="font-size:.7em;color:var(--accent);">+%20 SERİ</span>` : '';
    document.getElementById('resTitle').innerHTML = `<span style="color:var(--accent3)">${streakBonus ? 'MÜKEMMEL!' : 'DOĞRU!'}</span>${multTxt}${bonusTxt}`;
    document.getElementById('resPts').className = 'res-pts plus';
    document.getElementById('resPts').textContent = '+' + pts + ' PT';
  } else {
    rc.className = 'result-card visible fail';
    document.getElementById('resEmoji').textContent = '❌';
    document.getElementById('resTitle').innerHTML = '<span style="color:var(--accent2)">YANLIŞ</span>';
    document.getElementById('resPts').className = 'res-pts zero';
    document.getElementById('resPts').textContent = '0 PT';
  }
  const expEl = document.getElementById('resExp');
  if (expEl) {
    expEl.textContent = explain || '';
    expEl.style.display = explain ? 'block' : 'none';
  }
  document.getElementById('waitNext').style.display = 'block';
}

export function showAiReveal(round) {
  if (!round.aiModel) return;
  const ar = document.getElementById('aiRevealPhone');
  if (!ar) return;
  ar.className = 'ai-reveal-phone visible';
  const SHAPES = ['▲', '◆', '●', '■', '★', '♥'];
  const opts = round.options || [];
  const aiWTxt = round.aiWrong >= 0 && opts[round.aiWrong] ? `${SHAPES[round.aiWrong]} Şık ${String.fromCharCode(65 + round.aiWrong)}` : '—';
  document.getElementById('airBody').innerHTML = `<span>${round.aiModel}</span> (${round.aiYear || '?'}) bu soruyu <span>${aiWTxt}</span> olarak yanlış cevapladı.${round.aiReason ? '<br><br>' + round.aiReason : ''}`;
}

export function buildMiniPodium(playerName, myScore, playerAvatar) {
  import("../core/firebase.js").then(({ fbGet, gameRef }) => {
    fbGet(gameRef('answers')).then(snap => {
      const allAnswers = snap.val() || {};
      const scoreboard = {};
      Object.values(allAnswers).forEach(roundData => {
        Object.values(roundData || {}).forEach(e => {
          if (!e.name) return;
          if (!scoreboard[e.name]) scoreboard[e.name] = { name: e.name, score: 0 };
          scoreboard[e.name].score += (e.pts || 0);
        });
      });
      if (playerName && scoreboard[playerName]) scoreboard[playerName].score = myScore;
      else if (playerName) scoreboard[playerName] = { name: playerName, score: myScore };

      const sorted = Object.values(scoreboard).sort((a, b) => b.score - a.score);
      const myRank = sorted.findIndex(p => p.name === playerName) + 1;
      const medals = ['🥇', '🥈', '🥉'];
      
      const rb = document.getElementById('myRankBadge');
      if (rb && myRank > 0) {
        rb.textContent = `${medals[myRank - 1] || myRank + '.SIRADA'} ${myRank <= 3 ? '' : '— ' + myRank + '. sırada'}`;
        rb.style.display = 'block';
      }

      const rows = document.getElementById('miniPodiumRows');
      if (rows) {
        rows.innerHTML = '';
        const showList = sorted.slice(0, 5);
        if (!showList.some(p => p.name === playerName) && myRank > 5) showList.push({ ...scoreboard[playerName] });
        showList.forEach((p, i) => {
          const rank = sorted.findIndex(x => x.name === p.name) + 1;
          const isMe = p.name === playerName;
          const row = document.createElement('div');
          row.className = 'mini-podium-row' + (isMe ? ' is-me' : '');
          row.style.animationDelay = (i * 0.06) + 's';
          row.innerHTML = `<div class="mpr-rank">${medals[rank - 1] || rank}</div>
            <div class="mpr-avatar">${playerAvatar}</div>
            <div class="mpr-name${isMe ? ' is-me' : ''}">${isMe ? `<strong>${p.name}</strong>` : p.name}</div>
            <div class="mpr-score">${p.score} PT</div>`;
          rows.appendChild(row);
        });
        document.getElementById('miniPodium').style.display = 'block';
      }
    });
  });
}

export function showBonusNotif() {
  const n = document.getElementById('bonusNotif');
  if (n) {
    n.classList.add('visible');
    setTimeout(() => n.classList.remove('visible'), 2000);
  }
}

export function showOrderingReveal(opts, playerSeq) {
  const list = document.getElementById('orderingList');
  if (!list) return;
  list.innerHTML = '';
  opts.forEach((o, correctIdx) => {
    const playerPos = playerSeq.indexOf(correctIdx);
    const isCorrect = playerPos === correctIdx;
    const row = document.createElement('div');
    row.className = 'ord-item ' + (isCorrect ? 'ord-correct' : 'ord-wrong');
    row.innerHTML = `
      <div class="ord-rank" style="color:${isCorrect ? 'var(--accent3)' : 'var(--accent2)'}">${correctIdx + 1}</div>
      <div class="ord-text">${o.text}</div>
      <span class="ord-badge" style="background:${isCorrect ? 'rgba(61,214,140,.15)' : 'rgba(232,64,64,.15)'};color:${isCorrect ? 'var(--accent3)' : 'var(--accent2)'};">${isCorrect ? '✓' : 'Sen: ' + (playerPos >= 0 ? playerPos + 1 : '—')}</span>`;
    list.appendChild(row);
  });
}

export function showNumericResult(correct, myVal, unit) {
  if (correct == null) return;
  const res = document.getElementById('numericResult');
  if (!res) return;
  res.style.display = 'block';
  document.getElementById('nrVal').textContent = correct + (unit ? ` ${unit}` : '');
  if (myVal != null) {
    const diff = Math.abs(myVal - correct);
    const pct = correct !== 0 ? Math.round(diff / Math.abs(correct) * 100) : diff;
    const el = document.getElementById('nrDiff');
    if (el) {
      if (diff === 0) { el.textContent = '✅ Tam isabet!'; el.className = 'nr-diff exact'; }
      else if (pct <= 10) { el.textContent = `Farkın: ${diff} — Çok yakın!`; el.className = 'nr-diff close'; }
      else { el.textContent = `Farkın: ${diff} (%${pct})`; el.className = 'nr-diff far'; }
    }
  }
}
