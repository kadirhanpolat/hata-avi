import { db, ref, fbGet, fbSet, fbUpdate, auth } from "../core/firebase.js";
import { goRoom } from "../core/paths.js";

let currentModUser = '';

export async function openAccMgmt(isAdmin, modUser) {
  if (!isAdmin) return alert("Bu işlem için admin yetkisi gerekiyor.");
  currentModUser = modUser;
  document.getElementById('accOverlay').classList.add('visible');
  loadAccList();
  loadOrgList();
}

export function closeAccOverlay() {
  document.getElementById('accOverlay').classList.remove('visible');
}

async function loadOrgList() {
  const list = document.getElementById('orgList');
  if (!list) return;
  const snap = await fbGet(ref(db, 'config/orgs'));
  const orgs = snap.val() || {};
  
  list.innerHTML = '';
  Object.entries(orgs).forEach(([id, o]) => {
    const div = document.createElement('div');
    div.className = 'acc-row';
    div.innerHTML = `
      <div style="flex:1;">
        <div style="font-family:var(--mono);font-size:.7rem;color:var(--text);">${o.name}</div>
        <div style="font-family:var(--mono);font-size:.55rem;color:var(--muted);">ID: ${id}</div>
      </div>
    `;
    list.appendChild(div);
  });
  
  // Populate multi-select for accounts
  const sel = document.getElementById('newAccOrg');
  if (sel) {
    sel.innerHTML = '<option value="*">Tüm Organizasyonlar (*)</option>';
    Object.entries(orgs).forEach(([id, o]) => {
      sel.innerHTML += `<option value="${id}">${o.name}</option>`;
    });
  }
}

async function loadAccList() {
  const list = document.getElementById('accList');
  if (!list) return;
  const snap = await fbGet(ref(db, 'config/moderators'));
  const mods = snap.val() || {};
  
  list.innerHTML = '';
  Object.entries(mods).forEach(([key, m]) => {
    const isYou = m.username === currentModUser;
    const row = document.createElement('div');
    row.className = `acc-row ${isYou ? 'is-you' : ''}`;
    
    const roleCls = m.role === 'admin' ? 'role-admin' : 'role-mod';
    const roleLabel = m.role === 'admin' ? 'Admin' : 'Moderatör';
    const since = m.createdAt ? new Date(m.createdAt).toLocaleDateString('tr-TR') : '-';
    
    let authStatusHtml = '';
    if (m.authUid) {
      authStatusHtml = '<span class="role-badge" style="background:rgba(61,214,140,.1);color:var(--accent3);border:1px solid rgba(61,214,140,.3);font-size:.45rem;">✅ LINKED</span>';
    } else if (m.email) {
      authStatusHtml = '<span class="role-badge" style="background:rgba(245,197,24,.1);color:var(--accent);border:1px solid rgba(245,197,24,.3);font-size:.45rem;">⚠️ WAITING AUTH</span>';
    } else {
      authStatusHtml = '<span class="role-badge" style="background:rgba(255,255,255,.05);color:var(--muted);border:1px solid var(--border);font-size:.45rem;">LEGACY</span>';
    }

    row.innerHTML = `
      <div class="acc-avatar">👤</div>
      <div class="acc-info">
        <div class="acc-name" style="display:flex;align-items:center;gap:6px;">
          ${m.username || '?'}${isYou ? ' <span style="font-size:.55rem;color:var(--muted);">(sen)</span>' : ''}
          ${authStatusHtml}
        </div>
        <div class="acc-meta">
          ${m.email ? `<span style="color:var(--accent);cursor:pointer;" onclick="navigator.clipboard.writeText('${m.email}');alert('Kopyalandı: ${m.email}')" title="Kopyalamak için tıklayın">${m.email} 📋</span> · ` : ''}
          Org: ${Object.keys(m.orgIds || {}).join(', ')} · ${since}
        </div>
      </div>
      <span class="role-badge ${roleCls}">${roleLabel}</span>
      <div class="acc-actions">
        <button class="btn btn-ghost btn-sm" onclick="toggleResetForm('${key}')" style="font-size:.6rem;padding:4px 8px;" title="Parola Sıfırla">🔑</button>
        ${!isYou ? `<button class="btn btn-danger btn-sm" onclick="deleteAccount('${key}','${m.username}')" style="font-size:.6rem;padding:4px 8px;">✕</button>` : ''}
      </div>`;
      
    const resetDiv = document.createElement('div');
    resetDiv.className = 'reset-form';
    resetDiv.id = `reset-${resetDiv}`; // wait, should be key
    resetDiv.id = `reset-${key}`;
    resetDiv.innerHTML = `
      <div style="display:flex;gap:6px;align-items:center;">
        <input class="acc-inp" id="rpw-${key}" type="password" placeholder="Yeni parola..." style="flex:1;">
        <button class="btn btn-primary btn-sm" onclick="resetPassword('${key}')">Sıfırla</button>
      </div>`;
      
    const wrap = document.createElement('div');
    wrap.appendChild(row);
    wrap.appendChild(resetDiv);
    list.appendChild(wrap);
  });
}

export async function addOrg() {
  const id = document.getElementById('newOrgId').value.trim();
  const name = document.getElementById('newOrgName').value.trim();
  if (!id || !name) return alert("Eksik bilgi!");
  await fbSet(ref(db, `config/orgs/${id}`), { id, name, createdAt: Date.now() });
  loadOrgList();
}

export async function addAccount() {
  const user = document.getElementById('newAccUser').value.trim();
  const pass = document.getElementById('newAccPass').value;
  const email = document.getElementById('newAccEmail').value.trim();
  const role = document.querySelector('.acc-role-btn.sel-admin') ? 'admin' : 'moderator';
  const orgSel = document.getElementById('newAccOrg');
  const orgIds = Array.from(orgSel.selectedOptions).reduce((acc, opt) => { acc[opt.value] = true; return acc; }, {});

  if (!user || (!pass && !email)) return alert("Kullanıcı adı ve parola/e-posta zorunlu!");
  
  const key = user.toLowerCase();
  await fbSet(ref(db, `config/moderators/${key}`), {
    username: user,
    passwordHash: pass ? (await (await import("../utils/crypto.js")).sha256(pass)) : '',
    email: email,
    role: role,
    orgIds: orgIds,
    createdAt: Date.now()
  });
  
  loadAccList();
}

export function toggleResetForm(key) {
  document.getElementById(`reset-${key}`).classList.toggle('visible');
}

export async function resetPassword(key) {
  const pw = document.getElementById(`rpw-${key}`).value;
  if (!pw) return alert("Parola boş olamaz!");
  const hash = await (await import("../utils/crypto.js")).sha256(pw);
  await fbUpdate(ref(db, `config/moderators/${key}`), { passwordHash: hash });
  alert("Parola başarıyla değiştirildi.");
  loadAccList();
}

export async function deleteAccount(key, user) {
  if (!confirm(`"${user}" hesabını silmek istiyor musunuz?`)) return;
  await fbSet(ref(db, `config/moderators/${key}`), null);
  loadAccList();
}

export function selectNewRole(role) {
  const btns = document.querySelectorAll('.acc-role-btn');
  btns.forEach(b => b.classList.remove('sel-admin', 'sel-mod'));
  const btn = document.querySelector(`.acc-role-btn[data-role="${role}"]`);
  btn.classList.add(role === 'admin' ? 'sel-admin' : 'sel-mod');
}
