/**
 * Usev Sound Engine v3.5
 * Web Audio API + Dinamik Ses Paketi Desteği.
 */
(function(global){
'use strict';

let ctx = null;
let masterGain = null;
let sfxEnabled = true;
let musicEnabled = true;
let masterVolume = 0.7;
let currentMusic = null;
let unlocked = false;
let currentTheme = 'classic';

// v3.5: Custom sound storage
const customAudio = {
  lobbyMusic: null,
  gameMusic: null,
  correctSfx: null,
  victoryMusic: null
};

function getCtx(){
  if(!ctx){
    ctx = new(window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

function unlock(){
  if(unlocked) return;
  unlocked = true;
  const c = getCtx();
  if(c.state === 'suspended') c.resume();
}

['touchstart','click','keydown'].forEach(ev =>
  document.addEventListener(ev, unlock, {once:true, passive:true})
);

// ── HELPERS ──
function osc(type, freq, start, dur, gainVal, dest){
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(gainVal, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(dest || masterGain);
  o.start(start); o.stop(start + dur + 0.01);
  return {o, g};
}

function noise(dur, gainVal, dest){
  const c = getCtx();
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buf.getChannelData(0);
  for(let i=0; i<data.length; i++) data[i] = Math.random()*2-1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(gainVal, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(g); g.connect(dest || masterGain);
  src.start(); src.stop(c.currentTime + dur + 0.01);
}

// v3.5 Helper: Play custom URL
function playUrl(url, loop = false) {
  if(!url) return null;
  const audio = new Audio(url);
  audio.volume = masterVolume;
  audio.loop = loop;
  audio.play().catch(e => console.warn('Custom audio play failed', e));
  return {
    stop() { audio.pause(); audio.src = ""; }
  };
}

// ── THEMES ──
const THEMES = {
  classic: {
    correct(t){
      [[523,0],[659,0.1],[784,0.2],[1047,0.32]].forEach(([f,dt]) => osc('sine', f, t+dt, 0.25, 0.22));
      osc('triangle', 1568, t+0.3, 0.2, 0.08);
    },
    wrong(t){
      const o = getCtx().createOscillator(); const g = getCtx().createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(100, t+0.45);
      g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.0001, t+0.5);
      o.connect(g); g.connect(masterGain); o.start(t); o.stop(t+0.55);
      osc('sine', 60, t, 0.2, 0.3);
    }
  },
  retro: {
    correct(t){
      [[440,0],[554,0.08],[659,0.16]].forEach(([f,dt]) => osc('square', f, t+dt, 0.15, 0.15));
    },
    wrong(t){
      const o = getCtx().createOscillator(); const g = getCtx().createGain();
      o.type = 'square'; o.frequency.setValueAtTime(200, t); o.frequency.linearRampToValueAtTime(50, t+0.3);
      g.gain.setValueAtTime(0.2, t); g.gain.linearRampToValueAtTime(0, t+0.3);
      o.connect(g); g.connect(masterGain); o.start(t); o.stop(t+0.3);
    }
  },
  future: {
    correct(t){
      osc('sine', 880, t, 0.4, 0.2);
      const o = getCtx().createOscillator(); const g = getCtx().createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(1760, t); o.frequency.exponentialRampToValueAtTime(3520, t+0.4);
      g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t+0.45);
      o.connect(g); g.connect(masterGain); o.start(t); o.stop(t+0.5);
    },
    wrong(t){
      osc('sawtooth', 60, t, 0.5, 0.3);
      noise(0.4, 0.1);
    }
  }
};

const SFX = {
  correct(){ 
    if(!sfxEnabled)return; unlock(); 
    if(customAudio.correctSfx) { playUrl(customAudio.correctSfx); return; }
    const t=getCtx().currentTime; THEMES[currentTheme].correct(t); 
  },
  wrong(){ if(!sfxEnabled)return; unlock(); const t=getCtx().currentTime; THEMES[currentTheme].wrong(t); },
  timeout(){ if(!sfxEnabled)return; unlock(); const t=getCtx().currentTime; [0,0.18,0.36].forEach(dt=>osc('square',180,t+dt,0.14,0.12)); },
  countdown(n){ if(!sfxEnabled)return; unlock(); const t=getCtx().currentTime; const f=n===1?880:660; const d=n===1?0.5:0.18; osc('sine',f,t,d,0.3); if(n===1){osc('sine',1320,t+0.08,0.35,0.15);osc('sine',1760,t+0.16,0.28,0.08);} },
  go(){ if(!sfxEnabled)return; unlock(); const t=getCtx().currentTime; [[523,0],[659,0.1],[784,0.2],[1047,0.3],[1047,0.4]].forEach(([f,dt])=>osc('sine',f,t+dt,0.3,0.25)); osc('triangle',2093,t+0.4,0.4,0.1); },
  reveal(){ if(!sfxEnabled)return; unlock(); const t=getCtx().currentTime; noise(0.25,0.15); osc('sine',120,t+0.25,0.3,0.4); osc('sine',240,t+0.25,0.2,0.2); [[523,0.35],[659,0.47],[784,0.55],[1047,0.63]].forEach(([f,dt])=>osc('sine',f,t+dt,0.25,0.2)); },
  podium(){ if(!sfxEnabled)return; unlock(); const t=getCtx().currentTime; [[523,0],[523,0.15],[523,0.3],[415,0.45],[523,0.6],[659,0.75],[784,0.95]].forEach(([f,dt])=>osc('sine',f,t+dt,0.28,0.22)); [0,0.6,0.95].forEach(dt=>noise(0.08,0.2)); },
  tick(){ if(!sfxEnabled)return; unlock(); osc('square',1200,getCtx().currentTime,0.04,0.06); },
  urgentTick(){ if(!sfxEnabled)return; unlock(); const t=getCtx().currentTime; osc('square',1400,t,0.05,0.1); osc('square',1600,t+0.06,0.04,0.08); },
  join(){ if(!sfxEnabled)return; unlock(); const t=getCtx().currentTime; osc('sine',880,t,0.18,0.12); osc('sine',1320,t+0.08,0.15,0.08); },
  streak(){ if(!sfxEnabled)return; unlock(); const t=getCtx().currentTime; [[660,0],[880,0.07],[1100,0.14],[1320,0.21]].forEach(([f,dt])=>osc('triangle',f,t+dt,0.12,0.15)); },
  reaction(){ if(!sfxEnabled)return; unlock(); const t=getCtx().currentTime; const o=getCtx().createOscillator(); const g=getCtx().createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(440,t); o.frequency.exponentialRampToValueAtTime(1760,t+0.3); g.gain.setValueAtTime(0.3,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.4); o.connect(g); g.connect(masterGain); o.start(t); o.stop(t+0.45); osc('sine',2200,t+0.3,0.15,0.2); },
  reactionTap(){ if(!sfxEnabled)return; unlock(); const t=getCtx().currentTime; osc('sine',1047,t,0.12,0.3); osc('sine',1568,t+0.06,0.1,0.2); }
};

const TRACKS = [
  { id:'lobby',   name:'Lobi Atmosferi',    icon:'🌅' },
  { id:'pulse',   name:'Pulse',             icon:'💓' },
  { id:'chase',   name:'Chase',             icon:'🏃' },
  { id:'retro',   name:'Retro Arcade',      icon:'👾' },
  { id:'chill',   name:'Chill Wave',        icon:'🌊' },
  { id:'epic',    name:'Epic Countdown',    icon:'⚔️' },
  { id:'custom_lobby', name:'Özel Lobi', icon:'🎵' },
  { id:'custom_game',  name:'Özel Oyun', icon:'🎮' },
];

function bpm(b){ return 60/b; }
function makeMusicTrack(id){
  // v3.5: Custom URL support
  if(id === 'lobby' && customAudio.lobbyMusic) return playUrl(customAudio.lobbyMusic, true);
  if(id === 'victory' && customAudio.victoryMusic) return playUrl(customAudio.victoryMusic, false);
  if(id.startsWith('http')) return playUrl(id, true);

  const c = getCtx(); if(!c) return null; unlock();
  function loopTrack(trackFn, intervalMs){
    let running = true; let timeout = null;
    function schedule(){ if(!running) return; trackFn(); timeout = setTimeout(schedule, intervalMs); }
    schedule();
    return { stop(){ running=false; if(timeout)clearTimeout(timeout); } };
  }
  if(id === 'lobby'){ let ci = 0; const chords = [[261.6, 329.6, 392], [293.7, 369.9, 440]]; const stopper = loopTrack(() => { const chord = chords[ci % chords.length]; ci++; const t = c.currentTime; chord.forEach(f => { const o = c.createOscillator(); const g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t+0.4); g.gain.linearRampToValueAtTime(0, t+2.0); o.connect(g); g.connect(masterGain); o.start(t); o.stop(t+2.2); }); noise(0.04, 0.04); }, 2000); return { stop(){ stopper.stop(); } }; }
  if(id === 'pulse'){ let beat = 0; const stopper = loopTrack(() => { const t = c.currentTime; const b = beat % 8; if(b===0||b===4){ osc('sine',60,t,0.15,0.4); } noise(0.03, 0.04); const bassNotes = [65,65,73,65, 65,65,73,87]; osc('sawtooth', bassNotes[b], t, 0.12, 0.12); beat++; }, bpm(120)*1000); return { stop(){ stopper.stop(); } }; }
  if(id === 'chase'){ let beat = 0; const stopper = loopTrack(() => { const t = c.currentTime; const b = beat % 16; if(b%4===0) osc('sine',55,t,0.1,0.45); noise(0.02,0.05); const bass=[110,110,130,98, 110,110,130,87]; osc('sawtooth', bass[b%8], t, 0.07, 0.15); beat++; }, bpm(140)*1000); return { stop(){ stopper.stop(); } }; }
  if(id === 'retro'){ let i = 0; const melody = [523,523,659,523, 784,698,659,523]; const stopper = loopTrack(() => { const t = c.currentTime; const mi = i % melody.length; osc('square', melody[mi], t, 0.1, 0.12); if(mi%4===0) osc('square',50,t,0.06,0.2); i++; }, bpm(160)*1000); return { stop(){ stopper.stop(); } }; }
  if(id === 'chill'){ let ci = 0; const prog = [[261.6,329.6,392,523], [220, 277.2,329.6,440]]; const stopper = loopTrack(() => { const t = c.currentTime; const chord = prog[ci%prog.length]; ci++; chord.forEach((f,idx) => { osc('sine', f, t+idx*0.04, 0.6, 0.05); }); }, bpm(90)*2*1000); return { stop(){ stopper.stop(); } }; }
  if(id === 'epic'){ let i = 0; const fanfare = [196,196,196, 247,247,247]; const stopper = loopTrack(() => { const t = c.currentTime; const fi = i % fanfare.length; osc('sawtooth', fanfare[fi], t, 0.14, 0.2); if(fi%3===0) noise(0.1,0.15); i++; }, bpm(100)*1000); return { stop(){ stopper.stop(); } }; }
  return null;
}

global.UsevSound = {
  unlock,
  sfx: SFX,
  tracks: TRACKS,
  playMusic,
  stopMusic(){ if(currentMusic){ currentMusic.stop(); currentMusic=null; } },
  setVolume(v){ masterVolume = Math.max(0, Math.min(1, v)); if(masterGain) masterGain.gain.value = masterVolume; },
  setMusicEnabled(v){ musicEnabled = !!v; if(!v) this.stopMusic(); },
  setSfxEnabled(v){ sfxEnabled = !!v; },
  setTheme(t){ if(THEMES[t]) currentTheme = t; },
  getTheme(){ return currentTheme; },
  playSound: (n) => { switch(n){ 
    case 'correct': SFX.correct(); break; 
    case 'wrong': SFX.wrong(); break; 
    case 'timeout': SFX.timeout(); break; 
    case 'victory': if(customAudio.victoryMusic) playMusic('victory'); else SFX.podium(); break;
  } },
  // v3.5: Firebase Sync
  initSync(db, onValue, ref, gameBasePath = 'game') {
    onValue(ref(db, `${gameBasePath}/soundConfig`), snap => {
      const cfg = snap.val() || {};
      customAudio.lobbyMusic = cfg.lobbyMusic || null;
      customAudio.gameMusic = cfg.gameMusic || null;
      customAudio.correctSfx = cfg.correctSfx || null;
      customAudio.victoryMusic = cfg.victoryMusic || null;
      console.log('UsevSound: Custom config synced', cfg);
    });
  }
};

function playMusic(id){
  global.UsevSound.stopMusic();
  if(!id || !musicEnabled) return;
  // v3.5: Handle custom game music
  if(id === 'game' && customAudio.gameMusic) { currentMusic = playUrl(customAudio.gameMusic, true); return; }
  try { currentMusic = makeMusicTrack(id); }
  catch(e){ console.warn('Usev music error', e); }
}

})(window);
