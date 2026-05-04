import { db, ref, fbGet, fbSet, fbRemove } from "../core/firebase.js";
import { orgId } from "../core/paths.js";
import { sha256 } from "../utils/crypto.js";

let newAccRole = 'moderator';
let availableOrgs = [];

export async function openAccMgmt(isAdmin, modUser) {
  if (!isAdmin) {
    alert('Bu işlem için admin yetkisi gerekli.');
    return;
  }
  document.getElementById('accOverlay').classList.add('visible');
  document.getElementById('accErr').textContent = '';
  document.getElementById('accOk').textContent = '';
  document.getElementById('accSub').innerHTML = `Moderatör hesaplarını yönetin. <a href="https://console.firebase.google.com/project/hata-avi/authentication/users" target="_blank" style="color:var(--accent);text-decoration:underline;">Firebase Console'dan</a> kullanıcıları eklemeyi unutmayın.`;
  await loadOrgList(modUser);
  await loadAccList(modUser);
}

export async function ensureMainOrg(modUser) {
  const snap = await fbGet(ref(db, 'config/orgs/main'));
  if (!snap.val()) {
    await fbSet(ref(db, 'config/orgs/main'), {
      id: 'main',
      name: 'Ana Organizasyon',
      status: 'active',
      createdAt: Date.now(),
      createdBy: modUser
    });
  }
}

export async function loadOrgList(modUser) {
  await ensureMainOrg(modUser);
  const snap = await fbGet(ref(db, 'config/orgs'));
  const orgs = snap.val() || {};
  availableOrgs = Object.entries(orgs).map(([id, v]) => ({
    id,
    ...v
  })).sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
  
  const list = document.getElementById('orgList');
  if (list) {
    list.innerHTML = '';
    availableOrgs.forEach(o => {
      const row = document.createElement('div');
      row.className = 'acc-row';
      row.innerHTML = `<div class="acc-avatar">ORG</div><div class="acc-info"><div class="acc-name">${o.name || o.id}</div><div class="acc-meta">${o.id} Â· ${o.status || 'active'}</div></div>`;
      list.appendChild(row);
    });
  }
  
  const sel = document.getElementById('newAccOrg');
  if (sel) {
    sel.innerHTML = '<option value="*">Tum organizasyonlar</option>' + availableOrgs.map(o => `<option value="${o.id}" ${o.id === orgId ? 'selected' : ''}>${o.name || o.id} (${o.id})</option>`).join('');
  }
}

export async function addOrg(modUser) {
  const idRaw = document.getElementById('newOrgId').value.trim();
  const name = document.getElementById('newOrgName').value.trim();
  const id = idRaw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  const errEl = document.getElementById('accErr');
  const okEl = document.getElementById('accOk');
  errEl.textContent = '';
  okEl.textContent = '';
  
  if (!id || !name) {
    errEl.textContent = 'Org ID ve ad zorunlu.';
    return;
  }
  
  const existing = await fbGet(ref(db, `config/orgs/${id}`));
  if (existing.val()) {
    errEl.textContent = 'Bu org ID zaten var.';
    return;
  }
  
  await fbSet(ref(db, `config/orgs/${id}`), {
    id,
    name,
    status: 'active',
    createdAt: Date.now(),
    createdBy: modUser
  });
  
  document.getElementById('newOrgId').value = '';
  document.getElementById('newOrgName').value = '';
  okEl.textContent = 'Organizasyon olusturuldu.';
  await loadOrgList(modUser);
}

export async function loadAccList(modUser) {
  const snap = await fbGet(ref(db, 'config/moderators'));
  const mods = snap.val() || {};
  const list = document.getElementById('accList');
  list.innerHTML = '';
  
  if (!Object.keys(mods).length) {
    list.innerHTML = '<div style="font-family:var(--mono);font-size:.68rem;color:var(--muted);text-align:center;padding:10px;">Henüz hesap yok</div>';
    return;
  }
  
  Object.entries(mods).forEach(([key, m]) => {
    const isYou = m.username === modUser;
    const row = document.createElement('div');
    row.className = 'acc-row' + (isYou ? ' is-you' : '');
    const avatar = m.role === 'admin' ? 'â­ ' : 'ğŸ‘¤';
    const roleCls = m.role === 'admin' ? 'role-admin' : 'role-mod';
    const roleLabel = m.role === 'admin' ? 'Admin' : 'Moderatör';
    const since = m.createdAt ? new Date(m.createdAt).toLocaleDateString('tr-TR') : '—';
    const orgIdsMap = m.orgIds || {};
    const orgIds = Object.keys(orgIdsMap);
    const orgLabel = orgIds.includes('*') ? 'Tum orglar' : orgIds.join(', ');
    
    let authStatusHtml = '';
    if (m.authUid) {
      authStatusHtml = '<span class="role-badge" style="background:rgba(61,214,140,.1);color:var(--accent3);border:1px solid rgba(61,214,140,.3);font-size:.45rem;">âœ… LINKED</span>';
    } else if (m.email) {
      authStatusHtml = '<span class="role-badge" style="background:rgba(245,197,24,.1);color:var(--accent);border:1px solid rgba(245,197,24,.3);font-size:.45rem;">âš ï¸  WAITING AUTH</span>';
    } else {
      authStatusHtml = '<span class="role-badge" style="background:rgba(255,255,255,.05);color:var(--muted);border:1px solid var(--border);font-size:.45rem;">LEGACY</span>';
    }
    
    row.innerHTML = `
      <div class="acc-avatar">${avatar}</div>
      <div class="acc-info">
        <div class="acc-name" style="display:flex;align-items:center;gap:6px;">
          ${m.username || '?'}${isYou ? ' <span style="font-size:.55rem;color:var(--muted);">(sen)</span>' : ''}
          ${authStatusHtml}
        </div>
        <div class="acc-meta">
          ${m.email ? `<span style="color:var(--accent);cursor:pointer;" onclick="navigator.clipboard.writeText('${m.email}');alert('Kopyalandı: ${m.email}')" title="Kopyalamak için tıklayın">${m.email} ğŸ“‹</span> Â· ` : ''}
          Org: ${orgLabel} Â· ${since}
        </div>
      </div>
      <span class="role-badge ${roleCls}">${roleLabel}</span>
      <div class="acc-actions">
        <button class="btn btn-ghost btn-sm" onclick="toggleResetForm('${key}')" style="font-size:.6rem;padding:4px 8px;" title="Parola Sıfırla">ğŸ”‘</button>
        ${!isYou ? `<button class="btn btn-danger btn-sm" onclick="deleteAccount('${key}','${m.username}')" style="font-size:.6rem;padding:4px 8px;">✕</button>` : ''}
      </div>`;
      
    const resetDiv = document.createElement('div');
    resetDiv.className = 'reset-form';
    resetDiv.id = `reset-${key}`;
    resetDiv.innerHTML = `
      <div style="display:flex;gap:6px;align-items:center;">
        <input class="acc-inp" id="rpw-${key}" type="password" placeholder="Yeni parola..." style="flex:1;">
        <button class="btn btn-primary btn-sm" onclick="resetPassword('${key}')" style="white-space:nowrap;">Sıfırla</button>
      </div>
      <div id="rpw-err-${key}" style="font-family:var(--mono);font-size:.6rem;color:var(--accent2);margin-top:4px;min-height:14px;"></div>`;
      
    const wrapper = document.createElement('div');
    wrapper.appendChild(row);
    wrapper.appendChild(resetDiv);
    list.appendChild(wrapper);
  });
}

export function toggleResetForm(key) {
  const f = document.getElementById(`reset-${key}`);
  f.classList.toggle('visible');
  if (f.classList.contains('visible')) document.getElementById(`rpw-${key}`).focus();
}

export async function resetPassword(key) {
  const inp = document.getElementById(`rpw-${key}`);
  const errEl = document.getElementById(`rpw-err-${key}`);
  const pw = inp.value.trim();
  if (!pw || pw.length < 4) {
    errEl.textContent = 'En az 4 karakter olmalı.';
    return;
  }
  const hash = await sha256(pw);
  await fbSet(ref(db, `config/moderators/${key}/passwordHash`), hash);
  inp.value = '';
  errEl.textContent = '';
  document.getElementById(`reset-${key}`).classList.remove('visible');
  document.getElementById('accOk').textContent = '✅ Parola sıfırlandı!';
  setTimeout(() => document.getElementById('accOk').textContent = '', 2500);
}

export async function deleteAccount(key, username, modUser) {
  if (!confirm(`"${username}" hesabını silmek istediğinize emin misiniz?`)) return;
  const snap = await fbGet(ref(db, `config/moderators/${key}`));
  const authUid = snap.val()?.authUid;
  await fbRemove(ref(db, `config/moderators/${key}`));
  if (authUid) await fbRemove(ref(db, `config/moderatorsByUid/${authUid}`));
  document.getElementById('accOk').textContent = 'ğŸ—‘ Hesap silindi.';
  setTimeout(() => document.getElementById('accOk').textContent = '', 2000);
  await loadAccList(modUser);
}

export function selectNewRole(role) {
  newAccRole = role;
  document.querySelectorAll('.acc-role-btn').forEach(b => {
    b.className = 'acc-role-btn' + (b.dataset.role === role ? (role === 'admin' ? ' sel-admin' : ' sel-mod') : '');
  });
}

export async function addAccount(modUser) {
  const user = document.getElementById('newAccUser').value.trim();
  const pass = document.getElementById('newAccPass').value;
  const email = document.getElementById('newAccEmail').value.trim().toLowerCase();
  const authUid = document.getElementById('newAccAuthUid').value.trim();
  const orgSelect = document.getElementById('newAccOrg');
  let orgIds = [...orgSelect.selectedOptions].map(o => o.value);
  if (orgIds.includes('*')) orgIds = ['*'];
  const errEl = document.getElementById('accErr');
  const okEl = document.getElementById('accOk');
  errEl.textContent = '';
  okEl.textContent = '';
  
  if (!user || !pass) {
    errEl.textContent = 'Kullanıcı adı ve parola zorunlu.';
    return;
  }
  if (user.length < 3) {
    errEl.textContent = 'Kullanıcı adı en az 3 karakter.';
    return;
  }
  if (pass.length < 4) {
    errEl.textContent = 'Parola en az 4 karakter.';
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = 'Gecerli bir e-posta girin.';
    return;
  }
  if (!orgIds.length) {
    errEl.textContent = 'En az bir organizasyon secin.';
    return;
  }
  
  const orgIdsMap = {};
  orgIds.forEach(id => orgIdsMap[id] = true);
  
  const snap = await fbGet(ref(db, 'config/moderators'));
  const mods = snap.val() || {};
  const exists = Object.values(mods).some(m => m.username === user);
  if (exists) {
    errEl.textContent = 'Bu kullanıcı adı zaten kullanılıyor.';
    return;
  }
  
  const hash = await sha256(pass);
  const key = user.replace(/[^a-zA-Z0-9_]/g, '_') + '_' + Date.now();
  const payload = {
    username: user,
    passwordHash: hash,
    role: newAccRole,
    orgIds: orgIdsMap,
    createdAt: Date.now()
  };
  
  if (email) payload.email = email;
  if (authUid) payload.authUid = authUid;
  
  await fbSet(ref(db, `config/moderators/${key}`), payload);
  if (authUid) await fbSet(ref(db, `config/moderatorsByUid/${authUid}`), key);
  
  document.getElementById('newAccUser').value = '';
  document.getElementById('newAccPass').value = '';
  document.getElementById('newAccEmail').value = '';
  document.getElementById('newAccAuthUid').value = '';
  okEl.textContent = `✅ "${user}" hesabı oluşturuldu!`;
  setTimeout(() => okEl.textContent = '', 2500);
  await loadAccList(modUser);
}

export async function saveNewPw(modUser) {
  const current = document.getElementById('pwCurrent').value;
  const nw = document.getElementById('pwNew').value;
  const confirmPw = document.getElementById('pwConfirm').value;
  const errEl = document.getElementById('pwErr');
  const okEl = document.getElementById('pwOk');
  
  if (!current || !nw || !confirmPw) {
    errEl.textContent = 'Tüm alanları doldurun.';
    return;
  }
  if (nw !== confirmPw) {
    errEl.textContent = 'Yeni parolalar eşleşmiyor.';
    return;
  }
  
  const currentHash = await sha256(current);
  const snap = await fbGet(ref(db, 'config/moderators'));
  const mods = snap.val() || {};
  let foundKey = null;
  
  Object.entries(mods).forEach(([k, m]) => {
    if (m.username === modUser && m.passwordHash === currentHash) foundKey = k;
  });
  
  if (!foundKey) {
    const oldSnap = await fbGet(ref(db, 'config/adminAuth'));
    if (oldSnap.val()?.passwordHash === currentHash) foundKey = '__legacy__';
  }
  
  if (!foundKey) {
    errEl.textContent = '❌ Mevcut parola hatalı.';
    return;
  }
  
  const newHash = await sha256(nw);
  if (foundKey === '__legacy__') {
    await fbSet(ref(db, `config/moderators/admin`), {
      username: modUser,
      passwordHash: newHash,
      role: 'admin',
      orgIds: { '*': true },
      createdAt: Date.now()
    });
  } else {
    await fbSet(ref(db, `config/moderators/${foundKey}/passwordHash`), newHash);
  }
  
  okEl.textContent = '✅ Parola başarıyla değiştirildi!';
  setTimeout(() => document.getElementById('pwOverlay').classList.remove('visible'), 2000);
}

// Global exports for HTML onclick
window.openAccMgmt = (isAdmin, modUser) => openAccMgmt(isAdmin, modUser);
window.closeAccOverlay = () => document.getElementById('accOverlay').classList.remove('visible');
window.addOrg = (modUser) => addOrg(modUser);
window.toggleResetForm = (key) => toggleResetForm(key);
window.resetPassword = (key) => resetPassword(key);
window.deleteAccount = (key, username, modUser) => deleteAccount(key, username, modUser);
window.selectNewRole = (role) => selectNewRole(role);
window.addAccount = (modUser) => addAccount(modUser);
window.saveNewPw = (modUser) => saveNewPw(modUser);
