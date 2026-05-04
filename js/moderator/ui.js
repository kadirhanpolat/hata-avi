export function getCatColorMod(cat) {
  const COLS = ['#e84040', '#3b82f6', '#f5c518', '#3dd68c', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];
  if (!cat) return '#555';
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) & 0xfffff;
  return COLS[h % COLS.length];
}

export function rk(el) {
  if (window.renderMathInElement) {
    window.renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }
}

export function updateFlowStep(step) {
  document.querySelectorAll('.flow-step').forEach(s => s.classList.remove('active', 'done-step'));
  const target = document.getElementById(`fs-${step}`);
  if (target) {
    target.classList.add('active');
    // Mark previous steps as done
    let prev = target.previousElementSibling;
    while (prev) {
      prev.classList.add('done-step');
      prev = prev.previousElementSibling;
    }
  }
}

window.getCatColorMod = getCatColorMod;
window.rk = rk;
window.updateFlowStep = updateFlowStep;

export function updateConnectionsList(conns, knownConns, kickCallback, banCallback) {
  const ids = Object.keys(conns);
  const countEl = document.getElementById('connCount'); if (countEl) countEl.textContent = ids.length;
  const countEl2 = document.getElementById('lobbyCount2'); if (countEl2) countEl2.textContent = ids.length;
  
  const startBtn = document.getElementById('startBtn');
  if (startBtn && !document.getElementById('liveSection').style.display.includes('block')) {
    startBtn.disabled = ids.length === 0;
  }

  const list = document.getElementById('lobbyPlayers');
  if (!list) return;

  ids.forEach(id => {
    if (!knownConns.has(id)) {
      knownConns.add(id);
      if (window.UsevSound && window.UsevSound.sfx) window.UsevSound.sfx.join();
      
      list.querySelectorAll('.lp-new').forEach(b => b.remove());
      list.querySelectorAll('.lp-row').forEach(r => r.classList.remove('newest'));
      
      if (list.querySelector('.empty')) list.innerHTML = '';
      
      const row = document.createElement('div');
      row.className = 'lp-row newest';
      row.id = 'lp-' + id;
      
      const av = conns[id].avatar || '🤖';
      const uid = conns[id].uid || '';
      const name = conns[id].name || '?';
      
      row.innerHTML = `<span style="font-size:1rem;">${av}</span><span class="lp-name" style="flex:1;">${name}</span>
        <div style="display:flex;gap:5px;">
          <button class="kick-btn" data-id="${id}" data-name="${name}" style="background:none;border:none;cursor:pointer;opacity:0.6;font-size:.8rem;" title="At (Kick)">👢</button>
          <button class="ban-btn" data-id="${id}" data-name="${name}" data-uid="${uid}" style="background:none;border:none;cursor:pointer;opacity:0.6;font-size:.8rem;" title="Yasakla (Ban)">🚫</button>
        </div>
        <span class="lp-new">YENİ</span>`;
      list.appendChild(row);

      row.querySelector('.kick-btn').onclick = () => kickCallback(id, name);
      row.querySelector('.ban-btn').onclick = () => banCallback(id, name, uid);

      setTimeout(() => {
        row.classList.remove('newest');
        const b = row.querySelector('.lp-new');
        if (b) b.remove();
      }, 3000);
    }
  });

  knownConns.forEach(id => {
    if (!conns[id] || conns[id].kicked) {
      knownConns.delete(id);
      const el = document.getElementById('lp-' + id);
      if (el) el.remove();
    }
  });

  if (!list.children.length) list.innerHTML = '<div class="empty">Kimse katılmadı</div>';
}
