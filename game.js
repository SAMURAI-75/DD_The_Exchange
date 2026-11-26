// Block Bros: Creeper Kingdom — a platformer x blocky-mob mashup.
// Plain canvas, no dependencies. All art and sound are generated in code.
'use strict';
(() => {
const cv = document.getElementById('game');
const cx = cv.getContext('2d');
const W = 960, H = 544, T = 32, ROWS = 17, GRAV = 1900, STEP = 1 / 60;
const MAX_FALL = 900, MAX_PARTICLES = 700;
cx.imageSmoothingEnabled = false;

// ---------- utils ----------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const midX = o => o.x + o.w / 2, midY = o => o.y + o.h / 2;
function mulberry(s) {
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
};

// ---------- audio (generated) ----------
// Every sound goes through one master gain: muting sets it to 0 instantly, cutting notes already queued.
let ac = null, master = null, voices = 0, muted = !!store.get('bb_muted', false);
const MAX_VOICES = 24; // cap simultaneous sounds so heavy action never turns into noise
function audio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    } catch (e) { ac = null; master = null; }
  }
  if (ac && ac.state === 'suspended' && !document.hidden) ac.resume().catch(() => {});
  return ac;
}
function setMuted(v) {
  muted = v; store.set('bb_muted', v);
  if (ac && master) { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(v ? 0 : 1, ac.currentTime); }
}
// silence this copy of the game when its tab is hidden or loses focus (stops overlap between tabs)
function audioSleep() { if (ac && ac.state === 'running') ac.suspend().catch(() => {}); }
function tone(f, d, type = 'square', vol = 0.06, slide = 0, delay = 0) {
  if (muted) return; const a = audio(); if (!a) return;
  try {
    const t0 = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + d);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    if (voices >= MAX_VOICES) return;
    voices++; o.onended = () => { voices--; };
    o.connect(g).connect(master); o.start(t0); o.stop(t0 + d + 0.02);
  } catch (e) { /* ignore */ }
}
function noise(d, vol = 0.25, freq = 800) {
  if (muted) return; const a = audio(); if (!a) return;
  try {
    const n = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    if (voices >= MAX_VOICES) return;
    voices++; s.onended = () => { voices--; };
    s.connect(f).connect(g).connect(master); s.start();
  } catch (e) { /* ignore */ }
}
const SFX = {
  jump: () => tone(380, 0.15, 'square', 0.05, 300),
  coin: () => { tone(988, 0.06, 'square', 0.05); tone(1319, 0.18, 'square', 0.05, 0, 0.06); },
  bump: () => tone(140, 0.08, 'triangle', 0.08),
  brk: () => noise(0.15, 0.2, 1500),
  swing: () => noise(0.07, 0.12, 3000),
  hit: () => tone(220, 0.12, 'sawtooth', 0.06, -120),
  hurt: () => tone(300, 0.25, 'sawtooth', 0.07, -220),
  block: () => tone(700, 0.06, 'square', 0.05, -300),
  shieldBreak: () => { noise(0.2, 0.25, 2500); tone(500, 0.3, 'sawtooth', 0.06, -400); },
  hiss: () => noise(0.5, 0.08, 4000),
  boom: () => { noise(0.7, 0.5, 600); tone(90, 0.5, 'sine', 0.2, -50); },
  arrow: () => tone(900, 0.05, 'triangle', 0.04, -500),
  power: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.1, 'square', 0.05, 0, i * 0.07)),
  die: () => [400, 300, 200, 120].forEach((f, i) => tone(f, 0.14, 'square', 0.06, 0, i * 0.12)),
  fire: () => tone(600, 0.1, 'square', 0.04, -300),
  clear: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.05, 0, i * 0.11)),
  buy: () => { tone(660, 0.08, 'square', 0.05); tone(990, 0.12, 'square', 0.05, 0, 0.08); },
  deny: () => tone(150, 0.2, 'square', 0.05),
  tele: () => tone(200, 0.3, 'sine', 0.08, 600),
  grow: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.08, 'square', 0.05, 0, i * 0.05)),
  shrink: () => [784, 659, 523, 392].forEach((f, i) => tone(f, 0.08, 'square', 0.05, 0, i * 0.05)),
  ghast: () => { tone(900, 0.5, 'sine', 0.06, -500); tone(1200, 0.4, 'triangle', 0.03, -700, 0.05); },
  ghastFire: () => { noise(0.3, 0.15, 900); tone(160, 0.3, 'sawtooth', 0.05, -80); },
  deflect: () => { tone(1200, 0.08, 'square', 0.06, 600); noise(0.1, 0.1, 4000); },
  blaze: () => { noise(0.25, 0.1, 2200); tone(110, 0.25, 'sawtooth', 0.04, 40); },
  roar: () => { tone(90, 0.9, 'sawtooth', 0.12, -40); noise(0.9, 0.2, 400); },
  crystal: () => { [1568, 1319, 988, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.05, 0, i * 0.04)); noise(0.3, 0.2, 3000); },
  breath: () => noise(0.4, 0.12, 1500),
  menu: () => tone(660, 0.05, 'square', 0.04),
  missile: () => { noise(0.35, 0.2, 700); tone(130, 0.3, 'sawtooth', 0.05, -60); },
};

// ---------- music: original chiptune loops, one per map (scheduled ahead on the audio clock) ----------
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const SONGS = {
  title:  { bpm: 132, wave: 'square', vol: 0.025, mel: [72, 0, 76, 79, 0, 76, 74, 0, 72, 74, 76, 0, 67, 0, 0, 0, 69, 0, 72, 76, 0, 74, 72, 0, 71, 72, 74, 0, 72, 0, 0, 0], bass: [48, 55, 45, 52, 41, 48, 43, 50] },
  over:   { bpm: 150, wave: 'square', vol: 0.025, mel: [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 74, 72, 69, 67, 64, 67, 72, 74, 76, 79, 81, 79, 76, 74, 72, 76, 74, 71, 72, 0, 0, 0], bass: [48, 55, 52, 55, 45, 52, 48, 52, 41, 48, 45, 48, 43, 50, 47, 50] },
  nether: { bpm: 112, wave: 'sawtooth', vol: 0.018, mel: [57, 0, 60, 0, 64, 63, 0, 60, 57, 0, 55, 0, 57, 0, 0, 0, 57, 60, 64, 67, 66, 64, 63, 60, 62, 0, 59, 0, 57, 0, 0, 0], bass: [33, 33, 36, 36, 31, 31, 32, 32] },
  end:    { bpm: 92, wave: 'triangle', vol: 0.04, mel: [69, 0, 0, 76, 0, 0, 74, 0, 72, 0, 0, 71, 0, 0, 67, 0, 69, 0, 0, 72, 0, 76, 0, 81, 79, 0, 0, 76, 0, 0, 0, 0], bass: [33, 33, 29, 29, 31, 31, 28, 28] },
  boss:   { bpm: 172, wave: 'square', vol: 0.022, mel: [64, 64, 67, 64, 70, 69, 67, 64, 62, 62, 65, 62, 69, 67, 65, 62, 64, 0, 64, 67, 0, 71, 72, 71, 69, 67, 69, 0, 64, 0, 0, 0], bass: [40, 40, 43, 43, 46, 46, 45, 45] },
  cave:   { bpm: 100, wave: 'triangle', vol: 0.045, mel: [64, 0, 67, 0, 71, 0, 69, 67, 64, 0, 62, 0, 64, 0, 0, 0, 60, 0, 64, 0, 67, 0, 66, 64, 62, 0, 59, 0, 60, 0, 0, 0], bass: [40, 40, 36, 36, 38, 38, 35, 35] },
  win:    { bpm: 140, wave: 'square', vol: 0.03, mel: [72, 76, 79, 84, 0, 79, 84, 0, 0, 0, 0, 0, 0, 0, 0, 0], bass: [48, 52, 55, 48, 0, 0, 0, 0] },
};
const music = { song: null, step: 0, next: 0 };
function setSong(name) { if (music.song === name) return; music.song = name; music.step = 0; music.next = 0; }
setInterval(() => {
  if (muted || !ac || !music.song || ac.state !== 'running' || document.hidden) return;
  const s = SONGS[music.song], dur = 60 / s.bpm / 2;
  if (music.next < ac.currentTime) music.next = ac.currentTime + 0.05;
  while (music.next < ac.currentTime + 0.15) {
    const delay = music.next - ac.currentTime, m = s.mel[music.step % s.mel.length];
    if (m) tone(midi(m), dur * 0.9, s.wave, s.vol, 0, delay);
    if (music.step % 2 === 0) { const b = s.bass[(music.step / 2) % s.bass.length]; if (b) tone(midi(b), dur * 1.8, 'triangle', s.vol * 1.6, 0, delay); }
    music.step++; music.next += dur;
  }
}, 30);

// ---------- input ----------
const keys = Object.create(null), pressed = Object.create(null);
const NOSCROLL = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'ShiftRight', 'Slash', 'Quote', 'Backslash']);
addEventListener('keydown', e => {
  if (NOSCROLL.has(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true; audio();
});
addEventListener('keyup', e => { keys[e.code] = false; });
function releaseAll() { for (const k in keys) keys[k] = false; for (const k in pressed) delete pressed[k]; }
function autoPause() { releaseAll(); audioSleep(); if (G.state === 'play') G.state = 'pause'; }
addEventListener('blur', autoPause);
addEventListener('focus', () => { if (ac) audio(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); else if (ac && document.hasFocus()) audio(); });
const hit1 = (...codes) => codes.some(c => pressed[c]);
// Two key schemes. Settings can swap which player uses which (G.swap).
const CTRL = [
  { name: 'WASD', l: ['KeyA'], r: ['KeyD'], j: ['KeyW', 'Space'], c: ['KeyS'], s: ['KeyQ'], a: ['KeyF'], f: ['KeyG'], b: ['KeyE'] },
  { name: 'ARROWS', l: ['ArrowLeft'], r: ['ArrowRight'], j: ['ArrowUp'], c: ['ArrowDown'], s: ['Slash', 'Numpad2'], a: ['Enter', 'NumpadEnter', 'Numpad0'], f: ['ShiftRight', 'Period', 'Numpad1'], b: ['Quote', 'Backslash', 'Numpad3'] },
];
const KEYNAME = { KeyA: 'A', KeyD: 'D', KeyW: 'W', Space: 'SPACE', KeyS: 'S', KeyQ: 'Q', KeyF: 'F', KeyG: 'G', KeyE: 'E', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Slash: '/', Enter: 'ENTER', ShiftRight: 'R-SHIFT', Quote: "'" };
const ctrlOf = p => CTRL[G.swap ? 1 - p.id : p.id];
const held = list => list.some(c => keys[c]);
const tapped = list => list.some(c => pressed[c]);

// ---------- config ----------
const DIFF = {
  easy:   { name: 'EASY',   lives: 5, spd: 0.8,  fire: 2.8, bossHp: 30, wear: [0, 0] },
  normal: { name: 'NORMAL', lives: 3, spd: 1,    fire: 2.1, bossHp: 40, wear: [0, 0] },
  hard:   { name: 'HARD',   lives: 2, spd: 1.25, fire: 1.5, bossHp: 55, wear: [5, 40] },
  crazy:  { name: 'CRAZY',  lives: 9, spd: 1.35, fire: 1.3, bossHp: 80, wear: [0, 0], crazy: true, horde: 15 },
};
const DKEYS = ['easy', 'normal', 'hard', 'crazy'];
const MAPS = [
  { name: 'OVERWORLD', stars: 1, tier: 'EASY', levels: [1, 2, 6, 3], sword: 0, color: '#7fd650', insp: 'Super Mario Bros. 1-1 x Minecraft Overworld', desc: ['3 levels incl. Mineshaft Caves', 'Boss: the Ghost Miner'] },
  { name: 'THE NETHER', stars: 2, tier: 'MEDIUM', levels: [4, 7], sword: 1, color: '#ff6b3d', insp: 'Mario lava castles x Minecraft Nether', desc: ['Lava pits + Nether Fortress', 'Swing at ghast fireballs!'] },
  { name: 'THE END', stars: 3, tier: 'HARD', levels: [8, 5], sword: 2, color: '#c77dff', insp: 'Mario boss battles x Minecraft The End', desc: ['End Islands: endermen + void', 'Boss: the Ender Dragon'] },
];
const THEME = { 1: 'over', 2: 'over', 3: 'night', 4: 'nether', 5: 'end', 6: 'cave', 7: 'nether', 8: 'end' };
const LEVEL_NAME = { 1: 'GREEN HILLS', 2: 'CREEPER COUNTRY', 3: 'BOSS: THE GHOST MINER', 4: 'LAVA LAKES', 5: 'THE END: SLAY THE DRAGON', 6: 'MINESHAFT CAVES', 7: 'NETHER FORTRESS', 8: 'END ISLANDS' };
const SWORDS = [
  { n: 'WOOD', dmg: 1, reach: 26, c: '#b07a3c', cost: 0 },
  { n: 'STONE', dmg: 2, reach: 32, c: '#9a9a9a', cost: 12 },
  { n: 'IRON', dmg: 3, reach: 38, c: '#f0f0f0', cost: 25 },
  { n: 'DIAMOND', dmg: 5, reach: 46, c: '#4ee6e0', cost: 40 },
];
const SHIELD_DMG = { arrow: 34, zombie: 15, creeper: 60, boss: 25, skeleton: 15, ghast: 40, blaze: 20, bomb: 40, missile: 30 };
const BLAST_R = 6 * T;
const SOLID = new Set(['#', 'X', 'B', '?', 'T', 'U', 'G', 'O', 'W', 'L', 'C']);
const BREAKABLE = new Set(['#', 'B', '?', 'T', 'U']);

// ---------- level generation (seeded => same level every run) ----------
function makeLevel(n) {
  if (n === 3) return bossArena();
  if (n === 5) return endArena();
  const nether = n === 4 || n === 7;
  const rng = mulberry(n * 9973 + 7), ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const w = { 1: 230, 2: 270, 4: 250, 6: 250, 7: 260, 8: 240 }[n] || 250;
  const g = Array.from({ length: ROWS }, () => new Array(w).fill('.'));
  const set = (x, y, c) => { if (x >= 0 && x < w && y >= 0 && y < ROWS) g[y][x] = c; };
  for (let x = 0; x < w; x++) { set(x, 15, '#'); set(x, 16, 'X'); }
  const pit = (x, k) => { for (let i = 0; i < k; i++) { set(x + i, 15, '.'); set(x + i, 16, '.'); } };
  const plat = (x, y, k, c = 'B') => { for (let i = 0; i < k; i++) set(x + i, y, c); };
  let perches = 0;
  const segs = {
    flat(x) { for (let i = 2; i < 6; i++) set(x + i, 12, 'o'); if (rng() < 0.7) set(x + 6, 14, 'z'); return 8; },
    pit(x) { const k = ri(2, n === 1 ? 2 : 3); pit(x + 2, k); for (let i = 0; i < k; i++) set(x + 2 + i, 11, 'o'); return k + 5; },
    qrow(x) { plat(x + 2, 11, 5); set(x + 3, 11, '?'); set(x + 5, 11, '?'); set(x + 4, 7, '?'); set(x + 7, 14, 'z'); return 9; },
    tower(x) { plat(x + 1, 11, 4); set(x + 2, 10, 's'); set(x + 3, 10, 'o'); if (n > 1) set(x + 6, 14, 'z'); return 8; },
    creeper(x) { plat(x + 1, 12, 3); plat(x + 5, 10, 3); set(x + 6, 9, 'o'); set(x + 4, 14, 'c'); if (n > 1) set(x + 9, 14, 'c'); return 11; },
    pipe(x) { const h = n === 1 ? 2 : ri(2, 3); for (let i = 0; i < h; i++) { set(x + 2, 14 - i, 'T'); set(x + 3, 14 - i, 'T'); } set(x + 7, 14, rng() < 0.5 ? 'z' : 'c'); return 9; },
    cannon(x) { set(x + 3, 14, 'C'); set(x + 3, 13, 'C'); for (let i = 5; i < 8; i++) set(x + i, 11, 'o'); return 9; },
    ghast(x) { set(x + 4, 4, 'g'); for (let i = 2; i < 6; i++) set(x + i, 12, 'o'); return 9; },
    blaze(x) { plat(x + 1, 11, 4); set(x + 2, 8, 'b'); set(x + 3, 10, 'o'); if (rng() < 0.5) set(x + 6, 14, 'z'); return 8; },
    perch(x) {
      if (perches >= 2) return segs.flat(x); perches++;
      plat(x + 1, 12, 2); plat(x + 4, 9, 2); plat(x + 7, 6, 3);
      set(x + 7, 5, 'S'); set(x + 9, 5, 's'); if (n > 1) pit(x + 4, 3);
      return 12;
    },
  };
  const order = n === 7
    ? ['blaze', 'pit', 'blaze', 'ghast', 'tower', 'pit', 'blaze', 'qrow', 'ghast', 'pit', 'blaze', 'perch', 'pit', 'ghast', 'blaze', 'pipe']
    : n === 6
    ? ['creeper', 'qrow', 'pit', 'tower', 'creeper', 'pipe', 'perch', 'creeper', 'tower', 'qrow', 'pit', 'creeper', 'flat', 'creeper']
    : n === 8
    ? ['pit', 'tower', 'pit', 'creeper', 'pit', 'flat', 'tower', 'pit', 'perch', 'qrow', 'pit', 'creeper', 'tower']
    : nether
    ? ['ghast', 'pit', 'blaze', 'flat', 'pit', 'tower', 'ghast', 'blaze', 'pit', 'pipe', 'ghast', 'qrow', 'blaze', 'pit', 'perch', 'ghast', 'flat', 'blaze']
    : n === 1
    ? ['flat', 'qrow', 'pit', 'tower', 'creeper', 'pipe', 'perch', 'qrow', 'creeper', 'pit', 'tower', 'flat', 'creeper', 'perch', 'pipe']
    : ['creeper', 'tower', 'pit', 'qrow', 'perch', 'creeper', 'pipe', 'tower', 'pit', 'creeper', 'qrow', 'perch', 'tower', 'creeper', 'pipe', 'pit', 'creeper'];
  let x = 12, i = 0;
  while (x < w - 30) { x += segs[i % 4 === 3 ? 'cannon' : order[i % order.length]](x) + ri(1, 3); i++; }
  // finale staircase (optional to climb) and flag
  for (let s = 0; s < 6; s++) for (let h = 0; h <= s; h++) set(w - 24 + s, 14 - h, 'B');
  set(w - 10, 14, 'F');
  // reinforced ground ('G') at spawn and checkpoint: creepers can't blow it up, so respawns are always safe
  const protect = (a, b) => { for (let c = a; c <= b; c++) { set(c, 15, 'G'); set(c, 16, 'X'); for (let y = 12; y < 15; y++) if (g[y][c] !== 'o') g[y][c] = '.'; for (let y = 0; y < 15; y++) if ('zcsgb'.includes(g[y][c])) g[y][c] = '.'; } };
  const cp = Math.floor(w / 2);
  protect(0, 8); protect(cp - 2, cp + 2);
  // KEY ROOMS + LOCKED DOORS: find the key inside a room to open the door further on
  const doors = [];
  const clearCols = (a, b, ground) => { for (let c = a; c <= b; c++) { set(c, 15, ground); set(c, 16, 'X'); for (let y = 0; y < 15; y++) g[y][c] = '.'; } };
  const keyRoom = x0 => {
    clearCols(x0 - 2, x0 + 13, '#');
    for (let c = x0; c <= x0 + 11; c++) set(c, 9, 'B');          // ceiling
    for (let y = 10; y <= 12; y++) set(x0, y, 'B');               // left wall, open at the bottom (entrance)
    for (let y = 10; y <= 12; y++) set(x0 + 11, y, 'B');          // right wall, open at the bottom (exit), so the path never dead-ends
    set(x0 + 4, 12, '?'); set(x0 + 5, 12, 'B'); set(x0 + 6, 12, 'B');
    for (let c = x0 + 2; c <= x0 + 9; c += 2) set(c, 11, 'o');
    set(x0 + 9, 14, 'y');                                         // the key (on the floor, on the main path)
    set(x0 + 3, 14, 'z'); set(x0 + 7, 14, nether ? 'b' : 's');
  };
  const lockDoor = d => { clearCols(d - 2, d + 2, 'G'); for (let y = 0; y < 15; y++) set(d, y, 'L'); doors.push({ col: d, open: false }); };
  keyRoom(Math.floor(w * 0.14)); lockDoor(Math.floor(w * 0.40));
  keyRoom(Math.floor(w * 0.56)); lockDoor(Math.floor(w * 0.82));
  // 2-PLAYER TEAMWORK: gates that need both players (simultaneous pressure plates, then timed levers)
  const gates = [];
  if (G.players === 2 && !G.race) {
    const flat = (a, b) => { for (let c = a; c <= b; c++) { set(c, 15, 'G'); set(c, 16, 'X'); for (let y = 0; y < 15; y++) g[y][c] = '.'; } };
    const g0 = Math.floor(w * 0.3), g1 = Math.floor(w * 0.7);
    flat(g0 - 9, g0 + 2); for (let y = 0; y < 15; y++) set(g0, y, 'W');
    for (let c = g0 - 4; c <= g0 - 2; c++) set(c, 11, 'G');
    gates.push({ col: g0, type: 'plates', open: false, on: [false, false], plates: [{ x: (g0 - 7) * T + 4, y: 15 * T - 6 }, { x: (g0 - 3) * T + 4, y: 11 * T - 6 }] });
    flat(g1 - 11, g1 + 2); for (let y = 0; y < 15; y++) set(g1, y, 'W');
    for (let c = g1 - 3; c <= g1 - 1; c++) set(c, 11, 'G');
    gates.push({ col: g1, type: 'levers', open: false, levers: [{ x: (g1 - 10) * T + 8, y: 15 * T - 30, t: 0 }, { x: (g1 - 2) * T + 8, y: 11 * T - 30, t: 0 }] });
  }
  if (n === 8) for (const f of [0.2, 0.3, 0.45, 0.62, 0.72, 0.88]) { const c = Math.floor(w * f); if (SOLID.has(g[15][c]) && g[14][c] === '.' && g[13][c] === '.') set(c, 14, 'n'); }
  set(3, 14, '1');
  const L = finalize(g, w, n); L.gates = gates; L.doors = doors;
  return L;
}
function bossArena() {
  const w = 30, g = Array.from({ length: ROWS }, () => new Array(w).fill('.'));
  for (let x = 0; x < w; x++) { g[15][x] = 'G'; g[16][x] = 'X'; }
  for (let y = 0; y < ROWS; y++) { g[y][0] = 'X'; g[y][w - 1] = 'X'; }
  for (let x = 4; x < 9; x++) g[11][x] = 'B';
  for (let x = 21; x < 26; x++) g[11][x] = 'B';
  for (let x = 12; x < 18; x++) g[8][x] = 'B';
  g[11][6] = '?'; g[11][23] = '?'; g[8][14] = '?';
  g[14][3] = '1';
  return finalize(g, w, 3);
}
function endArena() {
  // The End: wide arena, obsidian pillars topped with healing crystals, floating end-stone ledges
  const w = 44, g = Array.from({ length: ROWS }, () => new Array(w).fill('.'));
  for (let x = 0; x < w; x++) { g[15][x] = 'G'; g[16][x] = 'X'; }
  for (let y = 0; y < ROWS; y++) { g[y][0] = 'X'; g[y][w - 1] = 'X'; }
  for (const px of [9, 22, 34]) { for (let y = 11; y < 15; y++) { g[y][px] = 'O'; g[y][px + 1] = 'O'; } g[10][px] = 'k'; }
  for (let x = 14; x < 18; x++) g[10][x] = 'B';
  for (let x = 27; x < 31; x++) g[10][x] = 'B';
  for (let x = 3; x < 6; x++) g[11][x] = 'B';
  for (let x = 38; x < 41; x++) g[11][x] = 'B';
  g[10][15] = '?'; g[10][28] = '?';
  g[14][3] = '1';
  return finalize(g, w, 5);
}
function finalize(g, w, n) {
  const L = { n, w, g, theme: THEME[n], gates: [], doors: [], regen: [], cannons: [], mobs: [], items: [], flagX: -1, spawn: { x: 3 * T, y: 14 * T }, cpCol: Math.floor(w / 2) };
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < w; x++) {
    const c = g[y][x];
    if ('zcsgbk'.includes(c) && c !== '.') { L.mobs.push(makeMob({ z: 'zombie', c: 'creeper', s: 'skeleton', g: 'ghast', b: 'blaze', k: 'crystal' }[c], x * T + 5, y * T + 1)); g[y][x] = '.'; }
    else if (c === 'o') { L.items.push(makeItem('coin', x * T + 8, y * T + 6, true)); g[y][x] = '.'; }
    else if (c === 'S') { L.items.push(makeItem('shield', x * T + 6, y * T + 8, false)); g[y][x] = '.'; }
    else if (c === 'n') { L.mobs.push(makeMob('enderman', x * T + 6, (y + 1) * T - 45)); g[y][x] = '.'; }
    else if (c === 'C' && y === 13) L.cannons.push({ col: x, cd: rand(1, 3) });
    else if (c === 'y') { L.items.push(makeItem('key', x * T + 6, y * T + 6, true)); g[y][x] = '.'; }
    else if (c === 'F') { L.flagX = x * T + 12; g[y][x] = '.'; }
    else if (c === '1') { L.spawn = { x: x * T + 5, y: y * T + 1 }; g[y][x] = '.'; }
  }
  if (n === 3) L.mobs.push(makeMob('boss', 14 * T, 3 * T));
  if (n === 5) L.mobs.push(makeMob('dragon', 18 * T, 3 * T));
  return L;
}

// ---------- world helpers ----------
function tile(tx, ty) { const L = G.lvl; if (tx < 0 || tx >= L.w) return 'X'; if (ty < 0 || ty >= ROWS) return '.'; return L.g[ty][tx]; }
const solidAt = (tx, ty) => SOLID.has(tile(tx, ty));
function setTile(tx, ty, c) { const L = G.lvl; if (tx >= 0 && tx < L.w && ty >= 0 && ty < ROWS) L.g[ty][tx] = c; }
function boxHits(b) {
  const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.001) / T);
  const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.001) / T);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (solidAt(x, y)) return true;
  return false;
}
function moveBody(b, dt) {
  b.hitWall = false;
  b.vy = Math.min(b.vy, MAX_FALL);
  b.x += b.vx * dt;
  if (boxHits(b)) {
    if (b.vx > 0) b.x = Math.floor((b.x + b.w) / T) * T - b.w - 0.01;
    else if (b.vx < 0) b.x = (Math.floor(b.x / T) + 1) * T + 0.01;
    b.vx = 0; b.hitWall = true;
  }
  b.onGround = false;
  b.y += b.vy * dt;
  if (boxHits(b)) {
    if (b.vy > 0) { b.y = Math.floor((b.y + b.h) / T) * T - b.h - 0.01; b.onGround = true; }
    else if (b.vy < 0) { const ty = Math.floor(b.y / T); b.y = (ty + 1) * T + 0.01; if (b.onHead) b.onHead(b, ty); }
    b.vy = 0;
  }
}
// Destroyed blocks grow back after REGROW seconds so big blasts never leave a level unplayable.
const REGROW = 15;
function breakTile(tx, ty) {
  const c = tile(tx, ty); if (!BREAKABLE.has(c)) return;
  setTile(tx, ty, '.');
  G.lvl.regen.push({ x: tx, y: ty, c: c === '?' ? 'U' : c, t: REGROW });
}
function updateRegen(dt) {
  const L = G.lvl; if (!L.regen.length) return;
  for (const r of L.regen) {
    r.t -= dt; if (r.t > 0) continue;
    const box = { x: r.x * T, y: r.y * T, w: T, h: T };
    const blocked = G.p.some(p => !p.dead && overlap(p, box)) || L.mobs.some(m => !m.dead && overlap(m, box)) || L.items.some(i => !i.taken && overlap(i, box));
    if (blocked || tile(r.x, r.y) !== '.') { r.t = 0.5; if (tile(r.x, r.y) !== '.') r.done = true; continue; }
    setTile(r.x, r.y, r.c); r.done = true;
    burst(r.x * T + 16, r.y * T + 16, '#bfffb0', 4, 60, 3);
  }
  L.regen = L.regen.filter(r => !r.done);
}
function unstick(b) { let n = 0; while (boxHits(b) && n++ < ROWS) b.y -= T; }

// ---------- entities ----------
function makePlayer(id) {
  return { id, x: 0, y: 0, w: 22, h: 30, vx: 0, vy: 0, face: 1, hp: 3, maxhp: 3, inv: 0, kb: 0, atk: 0, atkCd: 0, fireCd: 0,
    shield: null, blocking: false, power: null, star: 0, dead: false, respawn: 0, coyote: 0, jumpBuf: 0, anim: 0, hitSet: null,
    onGround: false, onHead: headBump };
}
function makeMob(type, x, y) {
  const base = { type, x, y, w: 22, h: 30, vx: 0, vy: 0, face: -1, hp: 3, cd: rand(0.5, 1.5), fuse: -1, active: false, hurt: 0, kb: 0, dead: false, anim: rand(0, 6) };
  if (type === 'creeper') base.hp = 2;
  if (type === 'boss') Object.assign(base, { w: 30, h: 44, hp: 40, maxhp: 40, tele: 3, fade: 0, shoot: 1.5, summon: 6, phase: 1, gravity: false });
  if (type === 'enderman') Object.assign(base, { w: 20, h: 44, hp: 5 });
  if (type === 'missile') Object.assign(base, { w: 28, h: 14, hp: 1, fly: true, active: true, life: 9 });
  if (type === 'ghast') Object.assign(base, { w: 40, h: 40, hp: 4, fly: true, cd: rand(1, 2.5), flash: 0 });
  if (type === 'blaze') Object.assign(base, { hp: 4, fly: true, baseY: y - 10, burst: 0, burstT: 0 });
  if (type === 'crystal') Object.assign(base, { w: 20, h: 24, hp: 1, fly: true, baseY: y + 4, active: true });
  if (type === 'dragon') Object.assign(base, { w: 110, h: 44, hp: 60, maxhp: 60, fly: true, t: 0, mode: 'circle', modeT: 6, breath: 2, heal: 1.5, phase: 1, trail: [], active: true });
  return base;
}
function makeItem(kind, x, y, fixed) { return { kind, x, y, w: kind === 'coin' ? 16 : 20, h: kind === 'coin' ? 20 : 20, vx: 0, vy: fixed ? 0 : -260, fixed, life: Infinity, t: 0 }; }

// ---------- game state ----------
const G = {
  state: 'title', players: 1, diffIdx: 1, diff: DIFF.normal, level: 1, lvl: null,
  p: [], coins: 0, lives: 3, sword: 0, cam: 0, shake: 0, proj: [], parts: [], texts: [], msg: null,
  timer: 0, time: 0, cp: null, overT: 0, best: null, shopSel: 0, map: 0, li: 0, spawnT: 0, split: false, cams: null, viewL: 0, viewR: 960, race: false, raceT: null, swap: !!store.get('bb_swap', false), chars: null, cust: null,
};
const bestKey = () => 'bb_best_' + G.map + '_' + DKEYS[G.diffIdx];

// ---------- characters: Mini Militia-style customizer (all original designs) ----------
const PAL = {
  hatColor: ['#e53935', '#2fbf4a', '#1e88e5', '#fdd835', '#8e24aa', '#212121', '#ffffff', '#ff7043', '#6d7f3a'],
  shirt:    ['#e53935', '#2fbf4a', '#1e88e5', '#fdd835', '#ec407a', '#212121', '#ffffff', '#ff7043', '#6d7f3a', '#00acc1'],
  pants:    ['#1e4fd6', '#3949ab', '#212121', '#6d4c41', '#2e7d32', '#c62828', '#ec407a', '#9e9e9e', '#5a6a2a'],
  skin:     ['#ffcc99', '#f1c27d', '#c68642', '#8d5524', '#ffe0bd'],
  hair:     ['#6b3a1a', '#212121', '#fdd835', '#e65100', '#9e9e9e', '#ec407a'],
};
const HATS = ['cap', 'helmet', 'bandana', 'crown', 'beanie', 'headband', 'knight', 'astro', 'chef', 'wizard', 'dino', 'pirate', 'none'];
const OUTFITS = ['overalls', 'dress', 'jacket', 'tank'];
const TRAILS = ['none', 'sparkle', 'fire', 'rainbow', 'smoke'];
const PRESETS = [
  { preset: 'ROOKIE',    hat: 'cap',      hatColor: 0, shirt: 0, pants: 0, skin: 0, hair: 0, outfit: 'overalls', trail: 'sparkle' },
  { preset: 'SPRINTER',  hat: 'cap',      hatColor: 1, shirt: 1, pants: 1, skin: 0, hair: 0, outfit: 'overalls', trail: 'smoke' },
  { preset: 'ROSE',      hat: 'crown',    hatColor: 3, shirt: 9, pants: 3, skin: 2, hair: 1, outfit: 'dress',    trail: 'rainbow' },
  { preset: 'COMMANDO',  hat: 'helmet',   hatColor: 8, shirt: 8, pants: 8, skin: 2, hair: 1, outfit: 'jacket',   trail: 'smoke' },
  { preset: 'SHADOW',    hat: 'bandana',  hatColor: 5, shirt: 5, pants: 2, skin: 1, hair: 1, outfit: 'tank',     trail: 'fire' },
  { preset: 'BLAZE',     hat: 'headband', hatColor: 7, shirt: 7, pants: 5, skin: 3, hair: 3, outfit: 'jacket',   trail: 'fire' },
  { preset: 'FROST',     hat: 'beanie',   hatColor: 2, shirt: 9, pants: 7, skin: 4, hair: 4, outfit: 'jacket',   trail: 'sparkle' },
  { preset: 'KNIGHT',    hat: 'knight',   hatColor: 0, shirt: 7, pants: 7, skin: 0, hair: 0, outfit: 'tank',     trail: 'sparkle' },
  { preset: 'ASTRO',     hat: 'astro',    hatColor: 2, shirt: 6, pants: 7, skin: 1, hair: 1, outfit: 'jacket',   trail: 'smoke' },
  { preset: 'CHEF',      hat: 'chef',     hatColor: 6, shirt: 6, pants: 2, skin: 2, hair: 1, outfit: 'jacket',   trail: 'fire' },
  { preset: 'WIZARD',    hat: 'wizard',   hatColor: 4, shirt: 4, pants: 1, skin: 4, hair: 4, outfit: 'dress',    trail: 'rainbow' },
  { preset: 'DINO',      hat: 'dino',     hatColor: 1, shirt: 1, pants: 4, skin: 0, hair: 0, outfit: 'jacket',   trail: 'sparkle' },
  { preset: 'PIRATE',    hat: 'pirate',   hatColor: 0, shirt: 6, pants: 3, skin: 2, hair: 1, outfit: 'tank',     trail: 'smoke' },
];
function defaultChar(id) { return Object.assign({ name: id ? 'PLAYER 2' : 'PLAYER 1', number: id ? 2 : 1 }, PRESETS[id ? 1 : 0]); }
function loadChars() {
  const saved = store.get('bb_chars', null), out = [defaultChar(0), defaultChar(1)];
  if (Array.isArray(saved)) saved.slice(0, 2).forEach((c, i) => {
    if (!c || typeof c !== 'object') return;
    const d = out[i];
    if (typeof c.name === 'string') d.name = c.name.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 10) || d.name;
    if (typeof c.preset === 'string') d.preset = c.preset.slice(0, 10);
    if (HATS.includes(c.hat)) d.hat = c.hat;
    if (OUTFITS.includes(c.outfit)) d.outfit = c.outfit;
    if (TRAILS.includes(c.trail)) d.trail = c.trail;
    for (const k of ['hatColor', 'shirt', 'pants', 'skin', 'hair']) if (Number.isInteger(c[k]) && c[k] >= 0 && c[k] < PAL[k].length) d[k] = c[k];
    if (Number.isInteger(c.number) && c.number >= 0 && c.number <= 99) d.number = c.number;
  });
  return out;
}
const charOf = p => (G.chars && G.chars[p.id]) || defaultChar(p.id);
const nameOf = p => charOf(p).name;
G.chars = loadChars();

// ---------- saved progress (browser localStorage) ----------
const REC_KEY = 'bb_records', SAVE_KEY = 'bb_save', LEVEL_ORDER = [1, 2, 6, 3, 4, 7, 8, 5];
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null); // ignore corrupted values
function getRecords() { const r = store.get(REC_KEY, {}); return r && typeof r === 'object' && !Array.isArray(r) ? r : {}; }
const teamScore = () => G.p.reduce((a, p) => a + (p.score || 0), 0);
function recordLevel(n, cleared) {
  const R = getRecords(), k = String(n), e = R[k] && typeof R[k] === 'object' ? R[k] : {};
  e.plays = (num(e.plays) || 0) + (cleared ? 0 : 1);
  if (cleared) {
    const t = Math.max(0, G.time - (G.lvlStartT || 0)), pts = Math.max(0, teamScore() - (G.lvlStartPts || 0));
    e.clears = (num(e.clears) || 0) + 1;
    if (num(e.bestTime) == null || t < e.bestTime) e.bestTime = t;
    if (num(e.bestPts) == null || pts > e.bestPts) e.bestPts = pts;
    e.diff = G.diff.name;
  }
  e.last = Date.now(); R[k] = e; store.set(REC_KEY, R);
}
function saveRun() {
  if (G.race) return;
  store.set(SAVE_KEY, { map: G.map, li: G.li, diffIdx: G.diffIdx, players: G.players, coins: G.coins, sword: G.sword, lives: G.lives, time: G.time, scores: G.p.map(p => p.score || 0), ts: Date.now() });
}
function getSave() {
  const v = store.get(SAVE_KEY, null);
  if (!v || typeof v !== 'object' || !MAPS[v.map] || num(v.li) == null || !MAPS[v.map].levels[v.li] || !DKEYS[v.diffIdx] || (v.players !== 1 && v.players !== 2)) return null;
  return v;
}
function continueRun() {
  const v = getSave(); if (!v) return false;
  G.map = v.map; G.diffIdx = v.diffIdx; G.players = v.players; G.race = false; G.diff = DIFF[DKEYS[G.diffIdx]];
  G.p = [makePlayer(0)]; if (G.players === 2) G.p.push(makePlayer(1));
  G.p.forEach((p, i) => { p.score = num(v.scores && v.scores[i]) || 0; p.lives = G.diff.lives; p.keys = 0; p.cp = null; p.finished = false; });
  G.coins = Math.max(0, num(v.coins) || 0); G.sword = clamp(num(v.sword) || 0, 0, 3); G.lives = Math.max(1, num(v.lives) || 1);
  G.time = Math.max(0, num(v.time) || 0); G.li = v.li; G.raceT = null; G.best = store.get(bestKey(), null);
  loadLevel(MAPS[G.map].levels[G.li]); G.state = 'play'; banner('PROGRESS LOADED', 1.5);
  return true;
}
function newGame() {
  G.diff = DIFF[DKEYS[G.diffIdx]];
  if (G.race) G.players = 2;
  G.p = [makePlayer(0)]; if (G.players === 2) G.p.push(makePlayer(1));
  G.p.forEach(p => { p.score = 0; p.lives = G.diff.lives; p.keys = 0; p.cp = null; p.finished = false; });
  G.raceT = null;
  G.coins = 0; G.lives = G.diff.lives; G.sword = MAPS[G.map].sword; G.time = 0; G.li = 0;
  G.best = store.get(bestKey(), null);
  loadLevel(MAPS[G.map].levels[0]); G.state = 'play';
}
function loadLevel(n) {
  G.lvlStartT = G.time; G.lvlStartPts = teamScore();
  recordLevel(n, false);
  G.level = n; G.lvl = makeLevel(n); G.proj = []; G.parts = []; G.texts = []; G.cp = null; G.overT = 0;
  const boss = G.lvl.mobs.find(m => m.type === 'boss' || m.type === 'dragon');
  if (boss) { boss.hp = boss.maxhp = Math.round(G.diff.bossHp * (boss.type === 'dragon' ? 1.5 : 1)); }
  G.spawnT = 3;
  G.p.forEach((p, i) => {
    if (p.crouch) { p.crouch = false; p.h = p.big ? 42 : 30; }
    p.keys = 0; p.cp = null;
    Object.assign(p, { x: G.lvl.spawn.x + i * 30, y: G.lvl.spawn.y, vx: 0, vy: 0, dead: false, respawn: 0, maxhp: Math.max(3, p.maxhp), inv: 1, kb: 0, atk: 0, star: 0 });
    p.hp = p.maxhp; unstick(p);
  });
  G.keys = 0; G.cam = 0; G.split = false; G.cams = null; G.viewL = 0; G.viewR = W;
  banner(LEVEL_NAME[n] || 'LEVEL ' + n);
  saveRun();
  if (G.diff.crazy) setTimeout(() => banner('CRAZY MODE: GUNS + BOMBS!', 2), 1800);
}
function banner(text, t = 2) { G.msg = { text, t }; }
function floatText(x, y, text, color = '#fff') { G.texts.push({ x, y, text, color, life: 1 }); }
function burst(x, y, color, n = 12, spd = 220, size = 4) {
  for (let i = 0; i < n && G.parts.length < MAX_PARTICLES; i++) {
    const a = rand(0, Math.PI * 2), s = rand(spd * 0.3, spd);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: rand(0.4, 0.9), color, size: rand(size * 0.6, size * 1.3) });
  }
}
const alive = () => G.p.filter(p => !p.dead && !p.finished);
function nearest(m) {
  let best = null, bd = Infinity;
  for (const p of G.p) { if (p.dead || p.finished) continue; const d = Math.hypot(midX(p) - midX(m), midY(p) - midY(m)); if (d < bd) { bd = d; best = p; } }
  return best;
}

// ---------- player ----------
function headBump(p, ty) {
  let tx = Math.floor(midX(p) / T);
  if (!solidAt(tx, ty)) { const a = Math.floor(p.x / T); tx = solidAt(a, ty) ? a : Math.floor((p.x + p.w - 0.001) / T); }
  const c = tile(tx, ty);
  if (c === '?') { setTile(tx, ty, 'U'); blockItem(tx, ty); SFX.bump(); }
  else if (c === 'B') { breakTile(tx, ty); debris(tx, ty, '#c4512c'); SFX.brk(); bonkAbove(tx, ty); }
  else SFX.bump();
}
function bonkAbove(tx, ty) {
  const zone = { x: tx * T, y: (ty - 1) * T, w: T, h: T };
  for (const m of G.lvl.mobs) if (!m.dead && !m.fly && m.type !== 'boss' && overlap(m, zone)) hurtMob(m, 2, 0);
}
function blockItem(tx, ty) {
  const r = Math.random(), x = tx * T + 6, y = ty * T - 22;
  if (r < 0.5) { G.coins++; SFX.coin(); floatText(tx * T + 16, ty * T - 10, '+1', '#ffd84a'); burst(tx * T + 16, ty * T, '#ffd84a', 6, 120, 3); }
  else { const kind = r < 0.7 ? 'mush' : r < 0.87 ? 'flower' : 'star'; G.lvl.items.push(makeItem(kind, x, y, false)); SFX.power(); }
}
function debris(tx, ty, color) { burst(tx * T + 16, ty * T + 16, color, 8, 260, 5); }

function updatePlayer(p, dt) {
  const k = ctrlOf(p);
  if (p.finished) { p.anim += dt; return; } // race: crossed the flag
  if (p.dead) {
    if (p.respawn > 0) {
      p.respawn -= dt;
      if (p.respawn <= 0) {
        if (G.race) { if (p.lives > 0) { p.lives--; respawnPlayer(p); } else p.respawn = 0; }
        else if (G.lives > 0) { G.lives--; respawnPlayer(p); } else p.respawn = 0;
      }
    }
    return;
  }
  p.anim += dt; p.inv = Math.max(0, p.inv - dt); p.star = Math.max(0, p.star - dt);
  // enderman grab: charges while one is next to you (flag set by the mob last frame), drains when you get away
  if (p.enderNear) p.ender = (p.ender || 0) + dt; else p.ender = Math.max(0, (p.ender || 0) - dt * 1.5);
  p.enderNear = false;
  if (p.ender >= 5) enderTeleport(p);
  p.atkCd -= dt; p.fireCd -= dt; p.atk = Math.max(0, p.atk - dt);
  if (p.wantBig && !p.big) grow(p);
  p.blocking = !!p.shield && held(k.s);
  // crouch: shorter hitbox (duck under missiles and arrows), slower walk
  const wantCrouch = held(k.c) && p.onGround;
  if (wantCrouch && !p.crouch) { const ch = p.big ? 26 : 18, dh = p.h - ch; p.h = ch; p.y += dh; p.crouch = true; }
  else if (!wantCrouch && p.crouch) {
    const full = p.big ? 42 : 30, dh = full - p.h; p.y -= dh; p.h = full;
    if (boxHits(p)) { p.y += dh; p.h = full - dh; } else p.crouch = false; // stay down under low ceilings
  }
  const mv = (held(k.r) ? 1 : 0) - (held(k.l) ? 1 : 0);
  const speed = p.crouch ? 80 : p.blocking ? 110 : 235;
  if (p.kb > 0) p.kb -= dt;
  else p.vx += (mv * speed - p.vx) * Math.min(1, dt * (p.onGround ? 14 : 7));
  if (mv && p.kb <= 0 && p.atk <= 0) p.face = mv;
  // jump with buffer + coyote time
  if (tapped(k.j)) p.jumpBuf = 0.12; else p.jumpBuf -= dt;
  p.coyote = p.onGround ? 0.1 : p.coyote - dt;
  if (p.jumpBuf > 0 && p.coyote > 0 && !p.crouch) { p.vy = -760; p.jumpBuf = 0; p.coyote = 0; SFX.jump(); }
  const g = (!held(k.j) && p.vy < 0) ? GRAV * 2.2 : GRAV;
  p.vy += g * dt;
  moveBody(p, dt);
  const mate = G.p.find(q => q !== p && !q.dead);
  if (mate && p.vy > 0 && overlap(p, mate) && p.y + p.h - mate.y < 14) {
    p.y = mate.y - p.h - 0.5;
    if (held(k.j)) { p.vy = -1050; SFX.power(); floatText(midX(p), p.y - 8, 'TEAM BOOST!', '#7fe0ff'); burst(midX(p), p.y + p.h, '#7fe0ff', 10, 160, 3); }
    else { p.vy = -420; SFX.jump(); }
  }
  // race trail (cosmetic) while running
  const tr = charOf(p).trail;
  if (tr !== 'none' && Math.abs(p.vx) > 150 && Math.random() < 0.6 && G.parts.length < MAX_PARTICLES) {
    const col = tr === 'fire' ? (Math.random() < 0.5 ? '#ff8a1a' : '#ffd35a') : tr === 'rainbow' ? `hsl(${(p.anim * 600) % 360},100%,60%)` : tr === 'smoke' ? '#aaaaaa' : (Math.random() < 0.5 ? '#ffffff' : '#fff27a');
    G.parts.push({ x: midX(p) - Math.sign(p.vx) * 10, y: p.y + p.h - rand(4, 12), vx: -p.vx * 0.15, vy: tr === 'fire' || tr === 'smoke' ? -60 : rand(-30, 30), life: 0.35, color: col, size: tr === 'smoke' ? 5 : 3 });
  }
  // attack
  if (tapped(k.a) && p.atkCd <= 0) { p.atk = 0.18; p.atkCd = 0.33; p.hitSet = new Set(); SFX.swing(); }
  if (p.atk > 0) swordHits(p);
  if (G.diff.crazy) {
    // CRAZY MODE: hold fire for an automatic gun, bomb key throws sticky bombs
    if (held(k.f) && p.fireCd <= 0) {
      p.fireCd = 0.09; tone(rand(180, 240), 0.05, 'square', 0.04, -120);
      G.proj.push({ kind: 'bullet', mine: true, owner: p, x: p.face > 0 ? p.x + p.w : p.x - 10, y: p.y + 14 + rand(-2, 2), w: 10, h: 3, vx: p.face * 950, vy: rand(-25, 25), life: 1.2, dmg: p.power === 'fire' ? 2 : 1 });
      G.parts.push({ x: p.face > 0 ? p.x + p.w + 4 : p.x - 6, y: p.y + 14, vx: 0, vy: 0, life: 0.05, color: '#fff27a', size: 6 });
    }
    p.bombCd = (p.bombCd || 0) - dt;
    if (tapped(k.b) && p.bombCd <= 0) {
      p.bombCd = 0.7; SFX.swing();
      G.proj.push({ kind: 'bomb', mine: true, owner: p, x: midX(p) - 5, y: p.y, w: 10, h: 10, vx: p.face * 360 + p.vx * 0.5, vy: -420, life: 1.6, stuck: null });
    }
  } else if (p.power === 'fire' && tapped(k.f) && p.fireCd <= 0) {
    p.fireCd = 0.45; SFX.fire();
    G.proj.push({ kind: 'fire', mine: true, x: p.face > 0 ? p.x + p.w : p.x - 10, y: p.y + 8, w: 10, h: 10, vx: p.face * 430, vy: 0, life: 2.5, owner: p });
  }
  // coop: keep both players on screen
  p.x = clamp(p.x, 0.01, G.lvl.w * T - p.w - 0.01);
  if (p.y > ROWS * T + 60) killPlayer(p);
  if (G.lvl.theme === 'nether' && p.y + p.h > 15 * T + 14) { burst(midX(p), 15 * T + 10, '#ff8a1a', 20, 260, 5); killPlayer(p); } // lava
  // items
  for (const it of G.lvl.items) if (!it.taken && overlap(p, it)) pickup(p, it);
  // flag
  if (G.lvl.flagX > 0 && p.x + p.w > G.lvl.flagX && G.state === 'play') { if (G.race) finishRace(p); else levelClear(); }
}
function swordHits(p) {
  const s = SWORDS[G.sword], box = { x: p.face > 0 ? p.x + p.w - 4 : p.x - s.reach + 4, y: p.y - 6, w: s.reach, h: p.h + 10 };
  for (const m of G.lvl.mobs) {
    if (m.dead || p.hitSet.has(m) || !overlap(box, m)) continue;
    if (m.type === 'boss' && m.fade > 0) continue;
    p.hitSet.add(m); hurtMob(m, s.dmg, p.face * 240, p);
  }
  for (const gt of G.lvl.gates) if (!gt.open && gt.type === 'levers') for (const lv of gt.levers)
    if (lv.t <= 0 && overlap(box, { x: lv.x, y: lv.y, w: 16, h: 30 })) { lv.t = 1.0; SFX.bump(); floatText(lv.x + 8, lv.y - 6, 'FLIP!', '#ffd84a'); }
  for (const pr of G.proj) {
    if (pr.mine || !overlap(box, pr)) continue;
    if (pr.kind === 'gfire') { // return to sender: knock ghast fireballs back
      pr.mine = true; pr.owner = p; pr.vx = p.face * Math.max(320, Math.abs(pr.vx) * 1.4); pr.vy *= -0.6; pr.life = 3; SFX.deflect();
      floatText(midX(pr), pr.y - 10, 'RETURNED!', '#7fe0ff');
    } else { pr.life = 0; burst(midX(pr), midY(pr), '#ddd', 5, 120, 2); SFX.block(); }
  }
}
function pickup(p, it) {
  p.score = (p.score || 0) + (it.kind === 'coin' ? 10 : it.kind === 'key' ? 200 : 50);
  if (it.kind === 'key') { if (G.race) p.keys = (p.keys || 0) + 1; else G.keys++; SFX.power(); banner('KEY FOUND! UNLOCK THE DOOR', 1.6); burst(midX(it), midY(it), '#ffd84a', 14, 180, 3); it.taken = true; return; }
  if (it.kind === 'coin') { G.coins++; SFX.coin(); burst(midX(it), midY(it), '#ffd84a', 5, 100, 2); }
  else if (it.kind === 'shield') {
    const [a, b] = G.diff.wear, hp = 100 - (b > 0 ? irand(a, b) : 0);
    if (p.shield && p.shield.hp >= hp) return; // keep the better one, leave pickup for partner
    p.shield = { hp }; SFX.power(); floatText(midX(p), p.y - 10, 'SHIELD ' + hp + '%', '#9fd3ff');
  }
  else if (it.kind === 'mush') { p.hp = Math.min(p.maxhp, p.hp + 1); grow(p); SFX.grow(); floatText(midX(p), p.y - 10, 'SUPER SIZE!', '#ff6b6b'); }
  else if (it.kind === 'flower') { p.power = 'fire'; SFX.power(); floatText(midX(p), p.y - 10, 'FIRE!', '#ff9b3d'); }
  else if (it.kind === 'star') { p.star = 8; SFX.power(); floatText(midX(p), p.y - 10, 'STAR!', '#ffe94a'); }
  it.taken = true;
}
function grow(p) {
  if (p.big) return;
  if (p.crouch) { p.wantBig = true; return; } // grow once standing
  const ox = p.x, oy = p.y;
  p.w = 30; p.h = 42; p.x -= 4; p.y -= 12;
  if (boxHits(p)) { p.w = 22; p.h = 30; p.x = ox; p.y = oy; p.wantBig = true; } // no headroom: grow once there is space
  else { p.big = true; p.wantBig = false; }
}
function shrink(p) {
  if (!p.big) { p.wantBig = false; return; }
  const nh = p.crouch ? 18 : 30; p.y += p.h - nh; p.big = false; p.wantBig = false; p.w = 22; p.h = nh; p.x += 4;
}
function hurtPlayer(p, amount, srcX, kbx, kby, kind) {
  if (p.dead || p.finished || p.inv > 0 || p.star > 0) return false;
  const dir = Math.sign(midX(p) - srcX) || 1;
  if (p.blocking && p.shield) {
    p.shield.hp -= SHIELD_DMG[kind] || 20; p.vx = dir * kbx * 0.35; p.kb = 0.1; p.inv = 0.25;
    SFX.block(); burst(midX(p) + p.face * 12, midY(p), '#bfe3ff', 6, 140, 3);
    if (p.shield.hp <= 0) { p.shield = null; p.blocking = false; SFX.shieldBreak(); banner('SHIELD BROKE!', 1.2); burst(midX(p), midY(p), '#8a5a2b', 14, 240, 4); }
    return true;
  }
  if (p.big) { // big players shrink instead of losing hearts
    shrink(p); p.inv = 1.4; p.vx = dir * kbx; p.vy = -kby; p.kb = 0.28; SFX.shrink(); floatText(midX(p), p.y - 10, 'SHRUNK!', '#ffb3b3');
    return true;
  }
  p.hp -= amount; p.inv = 1.2; p.vx = dir * kbx; p.vy = -kby; p.kb = 0.28; G.shake = Math.max(G.shake, 0.15);
  SFX.hurt(); burst(midX(p), midY(p), '#ff4d4d', 8, 180, 3);
  if (p.hp <= 0) killPlayer(p);
  return true;
}
function killPlayer(p) {
  if (p.dead) return;
  shrink(p); if (p.crouch) { p.y -= 30 - p.h; p.h = 30; p.crouch = false; }
  if (!p.dead && (G.race || G.p.length > 1)) { p.score = Math.max(0, (p.score || 0) - 250); floatText(midX(p), p.y - 10, '-250', '#ff6b6b'); }
  p.dead = true; p.hp = 0; p.shield = null; p.power = null; p.star = 0; p.blocking = false; p.maxhp = 3;
  burst(midX(p), Math.min(midY(p), ROWS * T - 20), p.id ? '#3ddc5a' : '#ff3b3b', 20, 280, 5); SFX.die();
  p.respawn = 1.6;
}
function respawnPlayer(p) {
  // respawn next to a partner standing on solid ground; otherwise on the indestructible checkpoint/spawn pad
  const partner = G.race ? null : G.p.find(q => q !== p && !q.dead && !q.finished && q.onGround);
  const cp = G.race ? p.cp : G.cp; // in a race each player has their own checkpoint
  const spot = partner ? { x: partner.x, y: partner.y - 4 } : (cp ? { x: cp * T + 5, y: 15 * T - 31 } : { x: G.lvl.spawn.x + p.id * 30, y: G.lvl.spawn.y });
  Object.assign(p, { x: spot.x, y: spot.y, vx: 0, vy: 0, dead: false, hp: 3, maxhp: 3, inv: 2, kb: 0 });
  unstick(p);
  burst(midX(p), midY(p), '#fff', 14, 160, 3);
}

// ---------- mobs ----------
function hurtMob(m, dmg, kbx, by) {
  if (m.dead) return;
  m.hp -= dmg; m.hurt = 0.2; SFX.hit();
  if (m.type !== 'boss' && !m.fly) { m.vx = kbx; if (kbx) m.vy = -200; m.kb = 0.25; }
  burst(midX(m), midY(m), m.type === 'creeper' ? '#4caf50' : m.type === 'boss' ? '#b36bff' : '#ddd', 6, 160, 3);
  if (m.hp <= 0) killMob(m, by);
  else if (m.type === 'enderman') {
    const c0 = Math.floor(midX(m) / T) + (Math.random() < 0.5 ? -1 : 1) * irand(4, 7);
    const spot = surfaceAt(clamp(c0, 2, G.lvl.w - 3), 44);
    if (spot) { burst(midX(m), midY(m), '#c77dff', 14, 160, 3); m.x = spot.x; m.y = spot.y; m.vx = 0; SFX.tele(); burst(midX(m), midY(m), '#c77dff', 14, 160, 3); }
  }
}
function surfaceAt(col, h) {
  for (let r = 2; r < ROWS - 1; r++) if (solidAt(col, r) && !solidAt(col, r - 1) && !solidAt(col, r - 2)) return { x: col * T + 5, y: r * T - h - 1 };
  return null; // pit
}
function enderTeleport(p) {
  const L = G.lvl;
  for (let tries = 0; tries < 40; tries++) {
    const col = irand(10, Math.floor(L.w / 2));
    const spot = surfaceAt(col, p.h);
    if (!spot || tile(col, 15) === 'W' || tile(col, 15) === 'L') continue;
    burst(midX(p), midY(p), '#c77dff', 24, 220, 4);
    p.x = spot.x; p.y = spot.y; p.vx = 0; p.vy = 0; p.inv = Math.max(p.inv, 1); p.ender = 0;
    burst(midX(p), midY(p), '#c77dff', 24, 220, 4); SFX.tele(); banner('AN ENDERMAN TELEPORTED YOU!', 1.6);
    return;
  }
  p.ender = 0;
}
function killMob(m, by) {
  if (m.dead) return;
  m.dead = true;
  if (by && by.score != null) { const pts = m.type === 'boss' || m.type === 'dragon' ? 2000 : m.type === 'crystal' ? 300 : 100; by.score += pts; floatText(midX(m), m.y - 18, '+' + pts, by.id ? '#5ef07a' : '#ff8a8a'); }
  if (m.type === 'boss' || m.type === 'dragon') { bossDefeated(m); return; }
  if (m.type === 'crystal') { SFX.crystal(); smallBlast(midX(m), midY(m), 2.5 * T, 'bomb', false); banner('CRYSTAL DESTROYED', 1.2); }
  G.coins += 2; floatText(midX(m), m.y, '+2', '#ffd84a');
  burst(midX(m), midY(m), m.type === 'creeper' ? '#4caf50' : m.type === 'zombie' ? '#3f8f5f' : '#e8e8e8', 14, 220, 4);
}
function walkToward(m, target, speed, dt) {
  const dir = Math.sign(midX(target) - midX(m)) || m.face; m.face = dir;
  const aheadX = dir > 0 ? m.x + m.w + 3 : m.x - 3;
  const floor = solidAt(Math.floor(aheadX / T), Math.floor((m.y + m.h + 4) / T));
  m.vx = (m.onGround && !floor) ? 0 : dir * speed;
  if (m.hitWall && m.onGround) m.vy = -520;
}
function wander(m, speed) {
  const aheadX = m.face > 0 ? m.x + m.w + 3 : m.x - 3;
  if (m.hitWall || (m.onGround && !solidAt(Math.floor(aheadX / T), Math.floor((m.y + m.h + 4) / T)))) m.face *= -1;
  m.vx = m.face * speed;
}
function updateMob(m, dt) {
  if (!m.active) { if (midX(m) > G.viewL - W * 0.25 && midX(m) < G.viewR + W * 0.25) m.active = true; else return; }
  m.anim += dt; m.hurt = Math.max(0, m.hurt - dt); m.cd -= dt;
  if (m.type === 'boss') return updateBoss(m, dt);
  if (m.type === 'dragon') return updateDragon(m, dt);
  if (m.fly) return updateFlyer(m, dt);
  const tgt = nearest(m), spd = G.diff.spd;
  if (m.kb > 0) m.kb -= dt;
  else if (m.type === 'zombie') {
    if (tgt && Math.abs(midX(tgt) - midX(m)) < 430 && Math.abs(midY(tgt) - midY(m)) < 260) walkToward(m, tgt, 72 * spd, dt); else wander(m, 30);
  } else if (m.type === 'creeper') {
    if (m.fuse >= 0) { m.vx = 0; m.fuse += dt; if (m.fuse >= 1.5) return explode(m); }
    else if (tgt) {
      const dx = Math.abs(midX(tgt) - midX(m)), dy = midY(m) - midY(tgt);
      if (dx < 64 && dy > -40 && dy < BLAST_R) { m.fuse = 0; SFX.hiss(); } // triggers even when you're ABOVE it
      else if (dx < 360 && Math.abs(dy) < 260) walkToward(m, tgt, 58 * spd, dt); else wander(m, 25);
    } else wander(m, 25);
  } else if (m.type === 'enderman') {
    // stalks slowly; standing next to you charges a 5s teleport (see updatePlayer)
    if (tgt && Math.abs(midX(tgt) - midX(m)) < 360 && Math.abs(midY(tgt) - midY(m)) < 200) walkToward(m, tgt, Math.abs(midX(tgt) - midX(m)) < 40 ? 0 : 45 * spd, dt); else wander(m, 20);
    for (const p of G.p) if (!p.dead && !p.finished && Math.abs(midX(p) - midX(m)) < 56 && Math.abs((p.y + p.h) - (m.y + m.h)) < 50) p.enderNear = true;
    if (Math.random() < 0.15 && G.parts.length < MAX_PARTICLES) G.parts.push({ x: m.x + rand(0, m.w), y: m.y + rand(0, m.h), vx: 0, vy: -30, life: 0.5, color: '#c77dff', size: 2 });
  } else if (m.type === 'skeleton') {
    m.vx = 0;
    if (tgt) {
      m.face = Math.sign(midX(tgt) - midX(m)) || m.face;
      const d = Math.hypot(midX(tgt) - midX(m), midY(tgt) - midY(m));
      if (d < 540 && m.cd <= 0) {
        m.cd = G.diff.fire * rand(0.8, 1.2);
        const ax = midX(tgt) - midX(m), ay = midY(tgt) - (m.y + 12), len = Math.hypot(ax, ay) || 1;
        G.proj.push({ kind: 'arrow', x: midX(m) + m.face * 10, y: m.y + 12, w: 14, h: 4, vx: ax / len * 400, vy: ay / len * 400, life: 3 });
        SFX.arrow();
      }
    }
  }
  m.vy += GRAV * dt; moveBody(m, dt);
  if (m.y > ROWS * T + 60 || (G.lvl.theme === 'nether' && m.y + m.h > 15 * T + 14)) { m.dead = true; return; }
  // contact with players
  for (const p of G.p) {
    if (p.dead || !overlap(p, m) || m.dead) continue;
    if (p.vy > 60 && p.y + p.h - m.y < 16) { // stomp
      p.vy = -430; p.y = m.y - p.h - 0.5; SFX.bump();
      if (m.type === 'creeper') { if (m.fuse < 0) { m.fuse = 0.9; SFX.hiss(); } } else hurtMob(m, 2, 0, p);
      continue;
    }
    if (p.star > 0) { hurtMob(m, 99, 0, p); continue; }
    if (m.type === 'zombie' && m.cd <= 0) { if (hurtPlayer(p, 1, midX(m), 260, 220, 'zombie')) m.cd = 0.8; }
    else if (m.type === 'skeleton' && m.cd <= 0.3) hurtPlayer(p, 1, midX(m), 220, 200, 'skeleton');
  }
}
function explode(m) {
  m.dead = true;
  const ex = midX(m), ey = midY(m);
  // destroy tiles in a 6-block radius (bedrock and the bottom row are indestructible)
  const r = BLAST_R / T, ctx0 = Math.floor(ex / T), cty = Math.floor(ey / T);
  for (let y = cty - 6; y <= cty + 6; y++) for (let x = ctx0 - 6; x <= ctx0 + 6; x++) {
    if (y >= ROWS - 1 || y < 0) continue;
    if (Math.hypot(x + 0.5 - ex / T, y + 0.5 - ey / T) > r) continue;
    const c = tile(x, y);
    if (BREAKABLE.has(c)) { breakTile(x, y); if (Math.random() < 0.5) debris(x, y, c === '#' ? '#8b5a2b' : '#c4512c'); }
  }
  for (const p of G.p) {
    if (p.dead) continue;
    const d = Math.hypot(midX(p) - ex, midY(p) - ey);
    if (d < BLAST_R) hurtPlayer(p, d < BLAST_R / 2 ? 2 : 1, ex, 480, 420, 'creeper');
  }
  for (const o of G.lvl.mobs) {
    if (o === m || o.dead) continue;
    const d = Math.hypot(midX(o) - ex, midY(o) - ey);
    if (d < BLAST_R) {
      if (o.type === 'creeper' && o.fuse < 0) { o.fuse = 1.2; o.active = true; } // chain reaction
      else if (o.type === 'boss') hurtMob(o, 4, 0);
      else if (o.type !== 'creeper') hurtMob(o, 4, Math.sign(midX(o) - ex) * 300);
    }
  }
  burst(ex, ey, '#fff', 30, 420, 6); burst(ex, ey, '#ffb03b', 30, 360, 5); burst(ex, ey, '#555', 20, 200, 7);
  G.shake = 0.5; SFX.boom();
}
function updateBoss(b, dt) {
  const ratio = b.hp / b.maxhp; const ph = ratio > 0.6 ? 1 : ratio > 0.3 ? 2 : 3;
  if (ph !== b.phase) { b.phase = ph; b.summon = Math.min(b.summon, 2); banner('PHASE ' + ph + '!', 1.4); SFX.tele(); }
  b.y += Math.sin(b.anim * 2) * 0.4;
  b.tele -= dt;
  if (b.fade > 0) {
    b.fade -= dt;
    if (b.fade <= 0.25 && !b.moved) {
      const spots = [[4, 8], [14, 4], [23, 8], [8, 4], [20, 4], [14, 10]].filter(s => Math.abs(s[0] * T - b.x) > T * 3);
      const s = spots[irand(0, spots.length - 1)]; b.x = s[0] * T; b.y = s[1] * T; b.moved = true; SFX.tele();
    }
    return;
  }
  if (b.tele <= 0) { b.fade = 0.5; b.moved = false; b.tele = ph === 3 ? 2.2 : 3.5; return; }
  const tgt = nearest(b); if (!tgt) return;
  b.face = Math.sign(midX(tgt) - midX(b)) || 1;
  b.shoot -= dt;
  if (b.shoot <= 0) {
    b.shoot = ph === 1 ? 1.6 : ph === 2 ? 1.2 : 0.9;
    const ax = midX(tgt) - midX(b), ay = midY(tgt) - midY(b), base = Math.atan2(ay, ax);
    const angles = ph === 1 ? [0] : [-0.25, 0, 0.25];
    for (const a of angles) G.proj.push({ kind: 'orb', x: midX(b) - 6, y: midY(b) - 6, w: 12, h: 12, vx: Math.cos(base + a) * 280, vy: Math.sin(base + a) * 280, life: 4 });
    SFX.fire();
  }
  if (ph >= 2) {
    b.summon -= dt;
    const minions = G.lvl.mobs.filter(m => !m.dead && m.type !== 'boss').length;
    if (b.summon <= 0 && minions < 4) {
      b.summon = ph === 3 ? 5 : 7;
      const type = ph === 3 && Math.random() < 0.5 ? 'skeleton' : 'zombie';
      const sx = [5, 23, 14][irand(0, 2)], sy = sx === 14 ? 7 : 10;
      const mob = makeMob(type, sx * T + 5, sy * T - 30); mob.active = true; G.lvl.mobs.push(mob);
      burst(midX(mob), midY(mob), '#b36bff', 16, 200, 4);
    }
  }
  for (const p of G.p) if (!p.dead && overlap(p, b)) {
    if (p.star > 0) { if (b.cd <= 0) { hurtMob(b, 2, 0, p); b.cd = 0.5; } } else hurtPlayer(p, 1, midX(b), 360, 300, 'boss');
  }
}
function updateFlyer(m, dt) {
  const tgt = nearest(m);
  if (m.type === 'crystal') { m.y = m.baseY + Math.sin(m.anim * 3) * 3; return; }
  if (m.type === 'missile') {
    m.x += m.vx * dt; m.life -= dt;
    const fx = m.vx > 0 ? m.x + m.w : m.x;
    if (m.life <= 0 || solidAt(Math.floor(fx / T), Math.floor(midY(m) / T))) { m.dead = true; burst(midX(m), midY(m), '#888', 10, 160, 4); return; }
    if (Math.random() < 0.5 && G.parts.length < MAX_PARTICLES) G.parts.push({ x: m.vx > 0 ? m.x - 2 : m.x + m.w, y: midY(m), vx: -m.vx * 0.2, vy: rand(-20, 20), life: 0.3, color: Math.random() < 0.5 ? '#ffb03b' : '#bbb', size: 3 });
  }
  const d = tgt ? Math.hypot(midX(tgt) - midX(m), midY(tgt) - midY(m)) : Infinity;
  if (m.type === 'ghast') {
    m.flash = Math.max(0, m.flash - dt);
    if (tgt) {
      const side = midX(m) < midX(tgt) ? -1 : 1;
      const gx = midX(tgt) + side * 260 - m.w / 2, gy = clamp(tgt.y - 200, 50, 300);
      m.x += clamp((gx - m.x) / 40, -1, 1) * 50 * G.diff.spd * dt; m.y += clamp((gy - m.y) / 40, -1, 1) * 40 * dt;
      m.face = -side;
      if (d < 640 && m.cd <= 0) {
        m.cd = G.diff.fire * 1.7 * rand(0.8, 1.2); m.flash = 0.5; SFX.ghast();
        const ax = midX(tgt) - midX(m), ay = midY(tgt) - midY(m), len = Math.hypot(ax, ay) || 1;
        G.proj.push({ kind: 'gfire', x: midX(m) - 9, y: midY(m), w: 18, h: 18, vx: ax / len * 250, vy: ay / len * 250, life: 5 });
      }
    }
  } else if (m.type === 'blaze') {
    m.y = m.baseY + Math.sin(m.anim * 2.5) * 12;
    if (Math.random() < 0.2 && G.parts.length < MAX_PARTICLES) G.parts.push({ x: midX(m) + rand(-8, 8), y: m.y + 26, vx: rand(-20, 20), vy: -60, life: 0.5, color: Math.random() < 0.5 ? '#ffb03b' : '#555', size: 3 });
    if (tgt) {
      m.face = Math.sign(midX(tgt) - midX(m)) || m.face;
      if (m.burst > 0) {
        m.burstT -= dt;
        if (m.burstT <= 0) {
          m.burst--; m.burstT = 0.25;
          const ax = midX(tgt) - midX(m), ay = midY(tgt) - midY(m), len = Math.hypot(ax, ay) || 1;
          G.proj.push({ kind: 'bfire', x: midX(m) - 5, y: midY(m) - 5, w: 10, h: 10, vx: ax / len * 330, vy: ay / len * 330, life: 3 }); SFX.fire();
        }
      } else if (d < 470 && m.cd <= 0) { m.burst = 3; m.burstT = 0; m.cd = G.diff.fire * 1.6; SFX.blaze(); }
    }
  }
  for (const p of G.p) {
    if (p.dead || m.dead || !overlap(p, m)) continue;
    if (p.vy > 60 && p.y + p.h - m.y < 16) { p.vy = -430; hurtMob(m, 2, 0, p); SFX.bump(); continue; }
    if (p.star > 0) { hurtMob(m, 99, 0, p); continue; }
    if (m.type === 'blaze') hurtPlayer(p, 1, midX(m), 260, 220, 'blaze');
    if (m.type === 'missile' && hurtPlayer(p, 1, midX(m), 320, 220, 'missile')) { m.dead = true; burst(midX(m), midY(m), '#ff8a1a', 12, 200, 4); SFX.boom(); }
  }
}
function updateDragon(d, dt) {
  const L = G.lvl, arenaMid = L.w * T / 2;
  d.t += dt; d.modeT -= dt;
  const crystals = L.mobs.filter(m => m.type === 'crystal' && !m.dead);
  if (crystals.length && d.hp < d.maxhp) { d.heal -= dt; if (d.heal <= 0) { d.hp = Math.min(d.maxhp, d.hp + 1); d.heal = 1.5; } }
  const ph = d.hp / d.maxhp < 0.5 ? 2 : 1;
  if (ph !== d.phase) { d.phase = ph; banner('THE DRAGON IS ENRAGED!', 1.6); SFX.roar(); }
  const tgt = nearest(d);
  if (d.mode === 'circle') {
    const a = d.t * (ph === 2 ? 0.8 : 0.55);
    const tx = arenaMid + Math.cos(a) * (L.w * T / 2 - 220) - d.w / 2, ty = 110 + Math.sin(a * 2) * 60;
    d.face = tx >= d.x ? 1 : -1;
    d.x += (tx - d.x) * Math.min(1, dt * 2); d.y += (ty - d.y) * Math.min(1, dt * 2);
    d.breath -= dt;
    if (tgt && d.breath <= 0) {
      d.breath = ph === 2 ? 1.0 : 1.7; SFX.breath();
      const hx = d.face > 0 ? d.x + d.w : d.x, hy = d.y + 18, ax = midX(tgt) - hx, ay = midY(tgt) - hy, len = Math.hypot(ax, ay) || 1;
      G.proj.push({ kind: 'breath', x: hx - 8, y: hy - 8, w: 16, h: 16, vx: ax / len * 300, vy: ay / len * 300, life: 4 });
    }
    if (d.modeT <= 0 && tgt) { d.mode = 'swoop'; d.target = { x: midX(tgt), y: midY(tgt) }; d.modeT = 2.5; SFX.roar(); banner('INCOMING!', 0.8); }
  } else if (d.mode === 'swoop') {
    const dx = d.target.x - midX(d), dy = d.target.y - midY(d), len = Math.hypot(dx, dy);
    if (len < 30 || d.modeT <= 0) { d.mode = 'rise'; d.modeT = 1.5; }
    else { const sp = ph === 2 ? 470 : 380; d.x += dx / len * sp * dt; d.y += dy / len * sp * dt; d.face = Math.sign(dx) || d.face; }
  } else {
    d.y -= 220 * dt; if (d.modeT <= 0 || d.y < 90) { d.mode = 'circle'; d.modeT = ph === 2 ? 4 : 6; }
  }
  d.y = clamp(d.y, 40, 15 * T - d.h - 4);
  d.x = clamp(d.x, T, L.w * T - T - d.w);
  d.trail.unshift({ x: midX(d), y: midY(d) }); if (d.trail.length > 36) d.trail.pop();
  for (const p of G.p) if (!p.dead && overlap(p, d)) {
    if (p.star > 0) { if (d.cd <= 0) { hurtMob(d, 2, 0, p); d.cd = 0.5; } } else hurtPlayer(p, 2, midX(d), 520, 380, 'boss');
  }
}
function smallBlast(x, y, r, kind, mine, by) {
  const rt = r / T, c0 = Math.floor(x / T), r0 = Math.floor(y / T), reach = Math.ceil(rt);
  for (let ty = r0 - reach; ty <= r0 + reach; ty++) for (let tx = c0 - reach; tx <= c0 + reach; tx++) {
    if (ty >= ROWS - 1 || ty < 0) continue;
    if (Math.hypot(tx + 0.5 - x / T, ty + 0.5 - y / T) > rt) continue;
    const c = tile(tx, ty); if (BREAKABLE.has(c)) { breakTile(tx, ty); if (Math.random() < 0.4) debris(tx, ty, '#8b5a2b'); }
  }
  for (const p of G.p) if (!p.dead && Math.hypot(midX(p) - x, midY(p) - y) < r) hurtPlayer(p, 1, x, 380, 320, kind);
  if (mine) for (const m of G.lvl.mobs) if (!m.dead && Math.hypot(midX(m) - x, midY(m) - y) < r + m.w / 2) {
    if (m.type === 'creeper' && m.fuse < 0) { m.fuse = 1.1; m.active = true; } else hurtMob(m, m.type === 'dragon' || m.type === 'boss' ? 4 : 6, Math.sign(midX(m) - x) * 300, by);
  }
  burst(x, y, '#fff', 14, 300, 5); burst(x, y, '#ff8a1a', 18, 280, 5); burst(x, y, '#444', 10, 160, 6);
  G.shake = Math.max(G.shake, 0.3); SFX.ghastFire();
}
function bossDefeated(b) {
  recordLevel(G.level, true);
  for (let i = 0; i < 5; i++) burst(midX(b) + rand(-30, 30), midY(b) + rand(-30, 30), ['#b36bff', '#fff', '#ffd84a'][i % 3], 30, 400, 6);
  G.shake = 0.8; SFX.boom(); if (b.type === 'dragon') SFX.roar();
  G.lvl.mobs.forEach(m => { if (m !== b && !m.dead) { m.dead = true; burst(midX(m), midY(m), '#b36bff', 10, 200, 4); } });
  G.proj = []; G.state = 'clear'; G.timer = 2.5; G.coins += 25; banner(b.type === 'dragon' ? 'ENDER DRAGON SLAIN!' : 'GHOST MINER DEFEATED!', 2.5);
}

// ---------- projectiles & items ----------
function updateProj(dt) {
  const solidPt = pr => solidAt(Math.floor(midX(pr) / T), Math.floor(midY(pr) / T));
  const mobAt = pr => G.lvl.mobs.find(m => !m.dead && overlap(pr, m) && !(m.type === 'boss' && m.fade > 0));
  for (const pr of G.proj) {
    pr.life -= dt;
    if (pr.kind === 'fire') {
      pr.vy += 1300 * dt; moveBody(pr, dt);
      if (pr.hitWall) pr.life = 0; if (pr.onGround) pr.vy = -360;
      const m = mobAt(pr); if (m) { hurtMob(m, 2, Math.sign(pr.vx) * 200, pr.owner); pr.life = 0; }
      if (Math.random() < 0.5) G.parts.push({ x: midX(pr), y: midY(pr), vx: 0, vy: -30, life: 0.25, color: '#ff9b3d', size: 3 });
    } else if (pr.kind === 'bullet') {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (solidPt(pr)) { pr.life = 0; burst(midX(pr), midY(pr), '#ffe27a', 3, 80, 2); }
      const m = mobAt(pr); if (m) { hurtMob(m, pr.dmg, Math.sign(pr.vx) * 60, pr.owner); pr.life = 0; }
    } else if (pr.kind === 'bomb') {
      if (pr.stuck && !pr.stuck.dead) { pr.x = pr.stuck.x + pr.ox; pr.y = pr.stuck.y + pr.oy; }
      else if (!pr.stuck || pr.stuck.dead) {
        pr.stuck = null; pr.vy += 1300 * dt; moveBody(pr, dt);
        if (pr.onGround || pr.hitWall) { pr.vx = 0; pr.vy = 0; } // sticky
        const m = mobAt(pr); if (m) { pr.stuck = m; pr.ox = pr.x - m.x; pr.oy = pr.y - m.y; floatText(midX(m), m.y - 8, 'STUCK!', '#ff6b6b'); }
      }
      if (Math.random() < 0.3) G.parts.push({ x: midX(pr), y: pr.y, vx: 0, vy: -40, life: 0.2, color: '#ff3b3b', size: 2 });
      if (pr.life <= 0) smallBlast(midX(pr), midY(pr), 3 * T, 'bomb', true, pr.owner);
    } else if (pr.kind === 'gfire') {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (Math.random() < 0.6) G.parts.push({ x: midX(pr), y: midY(pr), vx: rand(-30, 30), vy: rand(-30, 30), life: 0.3, color: pr.mine ? '#7fe0ff' : '#ff6b1a', size: 4 });
      let boom = solidPt(pr);
      if (pr.mine) { const m = mobAt(pr); if (m) { hurtMob(m, 4, 0, pr.owner); boom = true; } }
      else for (const p of G.p) if (!p.dead && overlap(pr, p)) boom = true;
      if (boom) { pr.life = 0; smallBlast(midX(pr), midY(pr), 2.5 * T, 'ghast', !!pr.mine, pr.owner); }
    } else {
      // arrow, blaze fireball, boss orb, dragon breath
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if ((pr.kind === 'arrow' || pr.kind === 'bfire') && solidPt(pr)) pr.life = 0;
      const kind = pr.kind === 'arrow' ? 'arrow' : pr.kind === 'bfire' ? 'blaze' : 'boss';
      for (const p of G.p) if (!p.dead && pr.life > 0 && overlap(pr, p)) {
        // knock you back in the direction the shot travels (even mid-jump)
        if (hurtPlayer(p, 1, midX(p) - Math.sign(pr.vx || 1) * 10, pr.kind === 'arrow' ? 380 : 300, 220, kind)) pr.life = 0;
      }
    }
    if (pr.x < G.viewL - 300 || pr.x > G.viewR + 300 || pr.y > H + 100 || pr.y < -300) pr.life = 0;
  }
  G.proj = G.proj.filter(p => p.life > 0);
}
function updateItems(dt) {
  for (const it of G.lvl.items) {
    if (it.taken) continue; it.t += dt;
    if (!it.fixed) {
      it.vy += GRAV * dt;
      if (it.kind === 'mush' && it.t > 0.4) { if (!it.vx) it.vx = 80; } else if (it.kind === 'star') { if (!it.vx) it.vx = 110; if (it.onGround) it.vy = -500; }
      const vx = it.vx; moveBody(it, dt); if (it.hitWall) it.vx = -vx;
      if (it.y > ROWS * T + 40) it.taken = true;
    }
  }
  G.lvl.items = G.lvl.items.filter(i => !i.taken);
}

// ---------- flow ----------
function finishRace(p) {
  if (p.finished) return;
  const place = G.p.filter(q => q.finished).length;
  p.finished = true; p.place = place + 1; p.finishT = G.time; p.vx = 0;
  const bonus = place === 0 ? 1000 : 500, tb = Math.max(0, Math.round((240 - G.time) * 5));
  p.score = (p.score || 0) + bonus + tb; p.bonus = bonus + tb;
  SFX.clear(); banner(`${nameOf(p)} WINS THE RACE! +${bonus + tb}`, 2);
  if (place === 0) { G.raceT = 1.5; recordLevel(G.level, true); } // first across the flag ends the race (short celebration, then results)
}
function levelClear() {
  if (G.state !== 'play') return;
  recordLevel(G.level, true);
  G.state = 'clear'; G.timer = 2.2; G.coins += 10; SFX.clear(); banner('LEVEL CLEAR! +10', 2.2);
  alive().forEach(p => { p.score = (p.score || 0) + 500; });
}
const SHOP = [
  { id: 'sword', label: () => G.sword < 3 ? `UPGRADE SWORD -> ${SWORDS[G.sword + 1].n}` : 'SWORD MAXED', cost: () => G.sword < 3 ? SWORDS[G.sword + 1].cost : null },
  { id: 'heal', label: () => 'MEGA HEART (+1 MAX HEART, BOTH)', cost: () => 10 },
  { id: 'life', label: () => 'EXTRA LIFE', cost: () => 15 },
  { id: 'go', label: () => 'CONTINUE ->', cost: () => 0 },
];
function buy(i) {
  const o = SHOP[i], c = o.cost();
  if (o.id === 'go') { G.li++; loadLevel(MAPS[G.map].levels[G.li]); G.state = 'play'; return; }
  if (c == null || G.coins < c) { SFX.deny(); return; }
  if (o.id === 'heal' && G.p.every(p => p.maxhp >= 5)) { SFX.deny(); return; }
  G.coins -= c; SFX.buy();
  if (o.id === 'sword') G.sword++;
  else if (o.id === 'heal') G.p.forEach(p => { p.maxhp = Math.min(5, p.maxhp + 1); p.hp = p.maxhp; });
  else if (o.id === 'life') G.lives++;
}

function updateDoors(dt) {
  G.lockMsg = Math.max(0, (G.lockMsg || 0) - dt);
  for (const d of G.lvl.doors) {
    if (d.open) continue;
    const nearP = alive().filter(p => Math.abs(midX(p) - (d.col * T + 16)) < 44);
    if (!nearP.length) continue;
    const holder = G.race ? nearP.find(p => p.keys > 0) : (G.keys > 0 ? nearP[0] : null);
    if (holder) {
      if (G.race) holder.keys--; else G.keys--;
      d.open = true; SFX.clear(); banner('DOOR UNLOCKED!', 1.2);
      for (let y = 0; y < 15; y++) if (tile(d.col, y) === 'L') { setTile(d.col, y, '.'); debris(d.col, y, '#8a5a2b'); }
    } else if (G.lockMsg <= 0) { G.lockMsg = 3; banner('LOCKED! FIND THE KEY IN THE ROOM', 1.6); SFX.deny(); }
  }
}
function updateCannons(dt) {
  for (const c of G.lvl.cannons) {
    if (tile(c.col, 13) !== 'C') continue;
    c.cd -= dt; if (c.cd > 0) continue;
    const cxp = c.col * T + 16, tgt = alive().find(p => { const dx = Math.abs(midX(p) - cxp); return dx > 80 && dx < 620 && Math.abs(midY(p) - 14 * T) < 160; });
    if (!tgt) { c.cd = 0.5; continue; }
    const dir = Math.sign(midX(tgt) - cxp) || 1, sx = dir > 0 ? (c.col + 1) * T + 2 : c.col * T - 30;
    if (solidAt(Math.floor((sx + 14) / T), 14)) { c.cd = 1; continue; }
    const m = makeMob('missile', sx, 14 * T - 3); m.vx = dir * 230 * G.diff.spd; m.face = dir; G.lvl.mobs.push(m);
    c.cd = 3.2 * (G.diff.fire / 2.1) * rand(0.9, 1.2); SFX.missile(); burst(sx + (dir > 0 ? 0 : 28), 14 * T + 7, '#999', 8, 120, 4);
  }
}
function updateGates(dt) {
  updateDoors(dt); updateCannons(dt);
  const L = G.lvl; if (!L.gates.length) return;
  const able = G.p.filter(p => !p.dead || p.respawn > 0).length; // players still in the game
  for (const gt of L.gates) {
    if (gt.open) continue;
    let ok = able < 2; // never soft-lock: if your partner is out, gates unlock
    if (gt.type === 'plates') {
      const was = gt.on.slice();
      gt.on = gt.plates.map(pl => alive().some(p => overlap(p, { x: pl.x, y: pl.y - 4, w: 24, h: 12 })));
      if (gt.on.some((v, i) => v && !was[i])) SFX.bump();
      ok = ok || gt.on.every(Boolean);
    } else {
      for (const lv of gt.levers) lv.t = Math.max(0, lv.t - dt);
      ok = ok || gt.levers.every(lv => lv.t > 0);
    }
    if (ok) {
      gt.open = true;
      for (let y = 0; y < 15; y++) if (tile(gt.col, y) === 'W') { setTile(gt.col, y, '.'); debris(gt.col, y, '#8a8a99'); }
      SFX.clear(); banner(able < 2 ? 'GATE UNLOCKED (PARTNER OUT)' : 'TEAMWORK! GATE OPEN', 1.6);
    }
  }
}
// CRAZY MODE horde: keeps ~15 mobs on screen, spawning at the screen edges (never on the safe pads)
function spawnHorde(dt) {
  if (!G.diff.crazy || G.state !== 'play') return;
  G.spawnT -= dt; if (G.spawnT > 0) return; G.spawnT = 0.2;
  for (let tries = 0; tries < 4; tries++) if (trySpawn()) break;
}
function trySpawn() {
  const L = G.lvl, near = L.mobs.filter(m => !m.dead && !['boss', 'dragon', 'crystal', 'missile'].includes(m.type) && midX(m) > G.viewL - W / 2 && midX(m) < G.viewR + W / 2).length;
  if (near >= G.diff.horde) return true;
  const pool = L.theme === 'nether' ? ['zombie', 'zombie', 'ghast', 'blaze', 'skeleton', 'blaze'] : L.theme === 'end' ? ['zombie', 'enderman', 'skeleton', 'creeper', 'enderman'] : ['zombie', 'zombie', 'creeper', 'creeper', 'skeleton'];
  const type = pool[irand(0, pool.length - 1)];
  const edge = Math.random() < 0.5 ? G.viewL - 48 : G.viewR + 48;
  let col = Math.floor(edge / T);
  if (col < 2 || col > L.w - 3) col = Math.floor((G.cam + rand(80, W - 80)) / T);
  if (col <= 9 || (L.flagX > 0 && Math.abs(col - L.cpCol) <= 3)) return false;
  if (alive().some(p => Math.abs(midX(p) - col * T) < 4 * T)) return false;
  let y = null;
  if (type === 'ghast') y = rand(60, 180); else if (type === 'blaze') y = rand(200, 330);
  else for (let r = 1; r < ROWS; r++) if (solidAt(col, r) && !solidAt(col, r - 1)) { y = r * T - (type === 'enderman' ? 45 : 31); break; }
  if (y == null) return false;
  const m = makeMob(type, col * T + 5, y); m.active = true; if (type === 'blaze') m.baseY = y;
  L.mobs.push(m); burst(midX(m), midY(m), '#b36bff', 8, 140, 3);
  return true;
}
// ---------- character customizer (before every game / race) ----------
const CROWS = ['NAME', 'PRESET', 'HAT', 'HAT COLOUR', 'SHIRT', 'SHORTS', 'OUTFIT', 'SKIN', 'HAIR', 'RACE TRAIL', 'RACE NUMBER'];
function cycle(list, v, d) { const i = list.indexOf(v); return list[(i + d + list.length) % list.length]; }
function changeRow(c, row, d) {
  const key = { 'HAT COLOUR': 'hatColor', SHIRT: 'shirt', SHORTS: 'pants', SKIN: 'skin', HAIR: 'hair' }[row];
  if (key) c[key] = (c[key] + d + PAL[key].length) % PAL[key].length;
  else if (row === 'PRESET') { const i = (PRESETS.findIndex(q => q.preset === c.preset) + d + PRESETS.length) % PRESETS.length; Object.assign(c, PRESETS[i]); }
  else if (row === 'HAT') c.hat = cycle(HATS, c.hat, d);
  else if (row === 'OUTFIT') c.outfit = cycle(OUTFITS, c.outfit, d);
  else if (row === 'RACE TRAIL') c.trail = cycle(TRAILS, c.trail, d);
  else if (row === 'RACE NUMBER') c.number = (c.number + d + 100) % 100;
  if (row !== 'NAME' && row !== 'RACE NUMBER' && row !== 'PRESET') c.preset = 'CUSTOM';
}
function updateCustom() {
  const U = G.cust;
  if (U.typing >= 0) { // typing a name: letters, digits, space, backspace; Enter/Esc to finish
    const c = G.chars[U.typing];
    for (const code in pressed) {
      if (code === 'Enter' || code === 'NumpadEnter' || code === 'Escape') { c.name = c.name.trim() || (U.typing ? 'PLAYER 2' : 'PLAYER 1'); U.typing = -1; SFX.menu(); break; }
      if (code === 'Backspace') c.name = c.name.slice(0, -1);
      else if (c.name.length < 10) {
        if (/^Key[A-Z]$/.test(code)) c.name += code[3];
        else if (/^Digit[0-9]$/.test(code)) c.name += code[5];
        else if (code === 'Space' && c.name.length) c.name += ' ';
        else if (code === 'Minus') c.name += '-';
      }
    }
    return;
  }
  for (let i = 0; i < G.players; i++) {
    const k = ctrlOf({ id: i }), c = G.chars[i], row = CROWS[U.sel[i]];
    if (hit1(k.j[0])) { U.sel[i] = (U.sel[i] + CROWS.length - 1) % CROWS.length; SFX.menu(); }
    if (tapped(k.c)) { U.sel[i] = (U.sel[i] + 1) % CROWS.length; SFX.menu(); }
    if (tapped(k.l)) { changeRow(c, row, -1); SFX.menu(); }
    if (tapped(k.r)) { changeRow(c, row, 1); SFX.menu(); }
    if (row === 'NAME' && tapped(k.a)) { U.typing = i; SFX.menu(); return; }
  }
  if (hit1('Escape')) { G.state = 'maps'; return; }
  if (hit1('Space')) { store.set('bb_chars', G.chars); newGame(); }
}
function update(dt) {
  if (hit1('KeyM')) setMuted(!muted);
  if (G.msg) { G.msg.t -= dt; if (G.msg.t <= 0) G.msg = null; }
  setSong(G.state === 'title' || G.state === 'maps' || G.state === 'custom' ? 'title' : G.state === 'win' || G.state === 'results' ? 'win' : G.state === 'over' ? null
    : G.lvl ? { over: 'over', night: 'boss', nether: 'nether', end: 'end', cave: 'cave' }[G.lvl.theme] : 'title');
  if (G.state === 'title') {
    if (hit1('KeyL') && continueRun()) return;
    if (hit1('Enter', 'Space', 'NumpadEnter')) { G.state = 'maps'; SFX.menu(); }
    return;
  }
  if (G.state === 'maps') {
    const n = DKEYS.length;
    if (hit1('ArrowLeft', 'KeyA')) { G.map = (G.map + MAPS.length - 1) % MAPS.length; SFX.menu(); }
    if (hit1('ArrowRight', 'KeyD')) { G.map = (G.map + 1) % MAPS.length; SFX.menu(); }
    if (hit1('ArrowUp', 'KeyW')) { G.diffIdx = (G.diffIdx + n - 1) % n; SFX.menu(); }
    if (hit1('ArrowDown', 'KeyS')) { G.diffIdx = (G.diffIdx + 1) % n; SFX.menu(); }
    if (hit1('Digit1', 'Numpad1')) { G.players = 1; G.race = false; SFX.menu(); }
    if (hit1('Digit2', 'Numpad2')) { G.players = 2; SFX.menu(); }
    if (hit1('KeyR')) { G.race = !G.race; if (G.race) G.players = 2; SFX.menu(); }
    if (hit1('KeyC')) { G.swap = !G.swap; store.set('bb_swap', G.swap); SFX.menu(); }
    if (hit1('Escape', 'Backspace')) G.state = 'title';
    if (hit1('Enter', 'Space', 'NumpadEnter')) { G.state = 'custom'; G.cust = { sel: [0, 0], typing: -1 }; SFX.menu(); }
    return;
  }
  if (G.state === 'custom') { updateCustom(); return; }
  if (G.state === 'pause') { if (hit1('KeyP', 'Escape')) G.state = 'play'; if (hit1('KeyQ')) G.state = 'title'; return; }
  if (G.state === 'shop') {
    if (hit1('ArrowUp', 'KeyW')) G.shopSel = (G.shopSel + SHOP.length - 1) % SHOP.length;
    if (hit1('ArrowDown', 'KeyS')) G.shopSel = (G.shopSel + 1) % SHOP.length;
    for (let i = 0; i < SHOP.length; i++) if (hit1('Digit' + (i + 1))) { G.shopSel = i; buy(i); return; }
    if (hit1('Enter', 'Space')) buy(G.shopSel);
    return;
  }
  if (G.state === 'over' || G.state === 'win' || G.state === 'results') { if (hit1('Enter', 'Space')) G.state = 'title'; return; }
  if (G.state === 'play' && hit1('KeyP', 'Escape')) { G.state = 'pause'; return; }

  // play / clear both simulate the world so the celebration looks alive
  if (G.state === 'play') G.time += dt;
  for (const p of G.p) updatePlayer(p, dt);
  spawnHorde(dt); updateGates(dt); updateRegen(dt);
  for (const m of G.lvl.mobs) if (!m.dead) updateMob(m, dt);
  G.lvl.mobs = G.lvl.mobs.filter(m => !m.dead);
  updateProj(dt); updateItems(dt);
  for (const pt of G.parts) { pt.life -= dt; pt.vy += 900 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const t of G.texts) { t.life -= dt; t.y -= 40 * dt; }
  G.texts = G.texts.filter(t => t.life > 0);
  G.shake = Math.max(0, G.shake - dt);
  // checkpoint
  if (G.race) { for (const p of alive()) if (!p.cp && p.x / T > G.lvl.cpCol) { p.cp = G.lvl.cpCol; floatText(midX(p), p.y - 20, 'CHECKPOINT', '#ffd84a'); SFX.coin(); } }
  else if (!G.cp && G.lvl.flagX > 0 && alive().some(p => p.x / T > G.lvl.cpCol)) { G.cp = G.lvl.cpCol; banner('CHECKPOINT', 1.2); SFX.coin(); }
  // camera follows the players' midpoint
  // SPLIT SCREEN: when co-op players drift apart, each gets their own half of the screen
  const live = alive(), focus = live.length ? live : G.p, maxCam = Math.max(0, G.lvl.w * T - W);
  if (G.race && G.p.length === 2) G.split = true; // race: always split, P1 left / P2 right
  else if (live.length === 2 && G.lvl.w * T > W * 1.2) {
    const d = Math.abs(midX(live[0]) - midX(live[1]));
    if (!G.split && d > 720) { G.split = true; G.cams = null; } else if (G.split && d < 540) G.split = false;
  } else G.split = false;
  if (G.split) {
    const order = G.race ? G.p : [...live].sort((a, b) => midX(a) - midX(b)), maxH = Math.max(0, G.lvl.w * T - W / 2);
    const tgt = order.map(p => clamp(midX(p) - W / 4, 0, maxH));
    if (!G.cams) G.cams = tgt.slice();
    G.cams = G.cams.map((c, i) => c + (tgt[i] - c) * Math.min(1, dt * 8));
    G.cam = G.cams[0]; G.viewL = G.cams[0]; G.viewR = G.cams[1] + W / 2;
  } else {
    const tx = focus.reduce((s, p) => s + midX(p), 0) / focus.length - W / 2 + (focus.length > 1 ? 0 : 60);
    G.cam += (clamp(tx, 0, maxCam) - G.cam) * Math.min(1, dt * 6); G.cam = clamp(G.cam, 0, maxCam);
    G.viewL = G.cam; G.viewR = G.cam + W;
  }
  // flow
  if (G.state === 'clear') {
    G.timer -= dt;
    if (G.timer <= 0) {
      if (G.li >= MAPS[G.map].levels.length - 1) { G.state = 'win'; store.set(SAVE_KEY, null); if (G.best == null || G.time < G.best) { G.best = G.time; store.set(bestKey(), G.best); } }
      else { G.state = 'shop'; G.shopSel = 0; }
    }
  } else if (G.race) {
    if (G.state === 'play') {
      if (G.raceT != null) G.raceT -= dt;
      const done = G.p.every(q => q.finished || (q.dead && q.lives <= 0 && q.respawn <= 0));
      if (done || (G.raceT != null && G.raceT <= 0)) { G.state = 'results'; G.raceEnd = G.time; G.raceT = null; releaseAll(); SFX.clear(); }
    }
  } else if (G.p.every(p => p.dead) && G.lives <= 0 && G.p.every(p => p.respawn <= 0)) {
    G.overT += dt; if (G.overT > 1.2) { G.state = 'over'; store.set(SAVE_KEY, null); }
  }
}

// ---------- art (all drawn in code) ----------
const tileCache = {};
function makeTile(c) {
  const o = document.createElement('canvas'); o.width = o.height = T; const g = o.getContext('2d');
  const r = mulberry(c.charCodeAt(0) * 31);
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  if (c === '#' || c === 'D') {
    px(0, 0, T, T, '#8b5a2b');
    for (let i = 0; i < 18; i++) px(Math.floor(r() * 8) * 4, Math.floor(r() * 8) * 4, 4, 4, r() < 0.5 ? '#6e4520' : '#a0703c');
    if (c === '#') { px(0, 0, T, 8, '#5fb83a'); for (let x = 0; x < T; x += 4) if (r() < 0.6) px(x, 8, 4, 4 * (1 + Math.floor(r() * 2)), '#4e9c2e'); px(0, 0, T, 2, '#7fd650'); }
  } else if (c === 'G') {
    // reinforced grass: grass top on cobblestone (indestructible)
    px(0, 0, T, T, '#7d7d7d');
    for (let i = 0; i < 20; i++) px(Math.floor(r() * 8) * 4, Math.floor(r() * 8) * 4, 4, 4, r() < 0.5 ? '#5e5e5e' : '#9a9a9a');
    px(0, 0, T, 8, '#5fb83a'); px(0, 0, T, 2, '#7fd650'); px(0, 8, T, 2, '#3a7a24');
  } else if (c === 'X') {
    px(0, 0, T, T, '#3a3a3a'); for (let i = 0; i < 26; i++) px(Math.floor(r() * 8) * 4, Math.floor(r() * 8) * 4, 4, 4, ['#222', '#555', '#2d2d2d'][Math.floor(r() * 3)]);
  } else if (c === 'B') {
    px(0, 0, T, T, '#c4512c');
    g.fillStyle = '#7a2a12';
    for (let y = 0; y < T; y += 8) { g.fillRect(0, y + 7, T, 1); const off = (y / 8) % 2 ? 8 : 0; for (let x = off; x < T; x += 16) g.fillRect(x, y, 1, 8); }
    px(0, 0, T, 1, '#e07a4c');
  } else if (c === '?' || c === 'U') {
    px(0, 0, T, T, c === '?' ? '#f0a020' : '#8a5a2b'); px(0, 0, T, 2, c === '?' ? '#ffd27a' : '#a0703c');
    px(0, T - 2, T, 2, '#5a3510'); px(T - 2, 0, 2, T, '#5a3510');
    g.fillStyle = '#5a3510'; [[3, 3], [T - 6, 3], [3, T - 6], [T - 6, T - 6]].forEach(([x, y]) => g.fillRect(x, y, 3, 3));
    if (c === '?') { g.fillStyle = '#fff6d0'; g.font = 'bold 20px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 16, 17); }
  } else if (c === 'C') {
    px(0, 0, T, T, '#26262e'); px(0, 0, T, 3, '#4a4a56'); px(0, T - 4, T, 4, '#5a3a20');
    g.fillStyle = '#0a0a0e'; g.beginPath(); g.arc(4, 15, 6, 0, Math.PI * 2); g.arc(T - 4, 15, 6, 0, Math.PI * 2); g.fill();
    px(12, 9, 8, 8, '#e0e0e0'); px(14, 11, 4, 4, '#26262e');
  } else if (c === 'L') {
    px(0, 0, T, T, '#7a4a1f'); px(2, 0, 2, T, '#5a3510'); px(T - 4, 0, 2, T, '#5a3510'); px(0, 14, T, 3, '#5a3510');
    px(12, 8, 8, 8, '#ffd84a'); px(15, 11, 2, 4, '#3a2210');
  } else if (c === 'W') {
    px(0, 0, T, T, '#2a2a33'); for (let x = 3; x < T; x += 9) { px(x, 0, 4, T, '#8a8a99'); px(x, 0, 1, T, '#b8b8c8'); }
    px(0, 12, T, 4, '#6a6a78'); px(0, 12, T, 1, '#b8b8c8');
  } else if (c === 'T') {
    px(0, 0, T, T, '#2f9e44'); px(4, 0, 6, T, '#69db7c'); px(T - 6, 0, 4, T, '#1b6e2e');
  }
  return o;
}
function makeThemedTile(c, theme) {
  const o = document.createElement('canvas'); o.width = o.height = T; const g = o.getContext('2d');
  const r = mulberry(c.charCodeAt(0) * 57 + theme.length);
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const speck = (base, cols, n) => { px(0, 0, T, T, base); for (let i = 0; i < n; i++) px(Math.floor(r() * 8) * 4, Math.floor(r() * 8) * 4, 4, 4, cols[Math.floor(r() * cols.length)]); };
  if (c === 'O') { speck('#140b22', ['#2a1647', '#0b0614', '#3d2266'], 22); return o; }
  if (theme === 'nether') {
    if (c === '#' || c === 'D') { speck('#6e1f1f', ['#8a2a2a', '#4f1414', '#a33a2a'], 24); if (c === '#') px(0, 0, T, 3, '#b0442f'); return o; }
    if (c === 'G') { speck('#4a4a52', ['#33333a', '#62626b'], 20); px(0, 0, T, 6, '#9a2f2f'); px(0, 0, T, 2, '#c24a3a'); return o; }
    if (c === 'B') { px(0, 0, T, T, '#3a1418'); g.fillStyle = '#1e0a0c'; for (let y = 0; y < T; y += 8) { g.fillRect(0, y + 7, T, 1); const off = (y / 8) % 2 ? 8 : 0; for (let x = off; x < T; x += 16) g.fillRect(x, y, 1, 8); } return o; }
    if (c === 'T') { speck('#3b3b44', ['#2a2a31', '#55555f'], 16); px(0, 0, 3, T, '#5a5a66'); return o; }
  }
  if (theme === 'cave') {
    if (c === '#' || c === 'D') {
      speck('#6d6d74', ['#5a5a61', '#808088', '#4e4e55'], 22);
      if (r() < 0.5) { const ore = r() < 0.15 ? '#4ee6e0' : r() < 0.5 ? '#d8a878' : '#1e1e1e'; for (let i = 0; i < 3; i++) px(4 + Math.floor(r() * 6) * 4, 4 + Math.floor(r() * 6) * 4, 4, 4, ore); }
      return o;
    }
    if (c === 'G') { speck('#6a6a6a', ['#555', '#7d7d7d'], 20); px(0, 0, T, 5, '#4f8a3a'); return o; }
    if (c === 'B') { px(0, 0, T, T, '#a8824e'); g.fillStyle = '#7a5a30'; for (let y = 0; y < T; y += 8) g.fillRect(0, y + 7, T, 1); g.fillRect(10, 0, 1, 8); g.fillRect(22, 8, 1, 8); g.fillRect(6, 16, 1, 8); g.fillRect(26, 24, 1, 8); return o; }
    if (c === 'T') { px(0, 0, T, T, '#6b4a2a'); px(4, 0, 4, T, '#8a6238'); px(20, 0, 3, T, '#4a3218'); return o; }
  }
  if (theme === 'end') {
    if (c === '#' || c === 'D' || c === 'G') { speck('#dcd9a3', ['#c9c58c', '#ece9bb', '#bdb97f'], 22); if (c === 'G') { px(0, 0, T, 4, '#b48ee0'); } return o; }
    if (c === 'B') { px(0, 0, T, T, '#e3dfa8'); g.fillStyle = '#bdb97f'; for (let y = 0; y < T; y += 16) { g.fillRect(0, y + 15, T, 1); g.fillRect((y / 16) % 2 ? 16 : 0, y, 1, 16); } return o; }
  }
  return makeTile(c);
}
const tileImg = c => { const th = (G.lvl && G.lvl.theme) || 'over', k = th + c; return tileCache[k] || (tileCache[k] = makeThemedTile(c, th)); };

function rect(x, y, w, h, c) { cx.fillStyle = c; cx.fillRect(Math.round(x), Math.round(y), w, h); }
function drawHero(p, x, y) {
  if (p.inv > 0 && Math.floor(p.inv * 20) % 2) return;
  // scale the 22x30 sprite to the current hitbox (big and/or crouching), anchored at the feet
  const w = p.w || 22, h = p.h || 30;
  cx.save(); cx.translate(Math.round(x), Math.round(y + h)); cx.scale(w / 22, h / 30); drawHeroBody(p, 0, -30); cx.restore();
  if (p.finished) text(p.place === 1 ? '1ST!' : '2ND', x + w / 2, y - 18, 14, '#ffd84a', 'center');
  if (p.ender > 0.05) { // circular enderman teleport progress
    const ccx = x + w / 2, ccy = y - 22;
    cx.lineWidth = 4; cx.strokeStyle = 'rgba(0,0,0,.6)'; cx.beginPath(); cx.arc(ccx, ccy, 10, 0, Math.PI * 2); cx.stroke();
    cx.strokeStyle = '#c77dff'; cx.beginPath(); cx.arc(ccx, ccy, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p.ender / 5)); cx.stroke();
    rect(ccx - 2, ccy - 2, 4, 4, '#e07aff');
  }
}
function drawHeroBody(p, x, y) {
  const C = p.char || charOf(p), f = p.face, walk = Math.abs(p.vx) > 20 && p.onGround ? Math.floor(p.anim * 12) % 2 : 0;
  const hatC = PAL.hatColor[C.hatColor], shirt = PAL.shirt[C.shirt], pants = PAL.pants[C.pants], skin = PAL.skin[C.skin], hair = PAL.hair[C.hair];
  const dark = c => c === '#212121' ? '#555' : '#222';
  // hair (long for dresses) behind the head
  if (C.outfit === 'dress') rect(f > 0 ? x + 3 : x + 13, y + 4, 6, 12, hair);
  // head
  rect(x + 4, y + 6, 14, 8, skin); rect(f > 0 ? x + 13 : x + 7, y + 8, 2, 3, '#222');
  rect(f > 0 ? x + 4 : x + 16, y + 6, 2, 5, hair);
  // hat
  if (C.hat === 'cap') { rect(x + 3, y, 16, 6, hatC); rect(f > 0 ? x + 12 : x, y + 4, 10, 3, hatC); }
  else if (C.hat === 'helmet') { rect(x + 2, y, 18, 7, hatC); rect(x + 2, y + 5, 18, 2, dark(hatC)); rect(f > 0 ? x + 16 : x + 2, y + 2, 4, 2, '#cfd8dc'); }
  else if (C.hat === 'bandana') { rect(x + 3, y + 1, 16, 5, hatC); rect(f > 0 ? x : x + 18, y + 3, 4, 3, hatC); rect(f > 0 ? x - 2 : x + 20, y + 5, 3, 3, hatC); }
  else if (C.hat === 'crown') { rect(x + 3, y + 1, 16, 5, hair); rect(x + 5, y - 2, 12, 4, '#fdd835'); rect(x + 5, y - 5, 2, 3, '#fdd835'); rect(x + 10, y - 5, 2, 3, '#fdd835'); rect(x + 15, y - 5, 2, 3, '#fdd835'); rect(x + 10, y - 1, 2, 2, '#e53935'); }
  else if (C.hat === 'beanie') { rect(x + 3, y - 1, 16, 7, hatC); rect(x + 3, y + 4, 16, 2, '#ffffff'); rect(x + 9, y - 4, 4, 3, '#ffffff'); }
  else if (C.hat === 'knight') { rect(x + 2, y - 1, 18, 9, '#b0bec5'); rect(x + 2, y + 6, 18, 2, '#78909c'); rect(f > 0 ? x + 12 : x + 4, y + 3, 6, 2, '#263238'); rect(x + 9, y - 6, 4, 6, hatC); }
  else if (C.hat === 'astro') { rect(x + 1, y - 2, 20, 17, '#eceff1'); rect(f > 0 ? x + 9 : x + 3, y + 3, 10, 8, '#4fc3f7'); rect(f > 0 ? x + 10 : x + 4, y + 4, 3, 2, '#ffffff'); rect(x + 1, y + 12, 20, 2, hatC); }
  else if (C.hat === 'chef') { rect(x + 3, y + 2, 16, 4, '#ffffff'); rect(x + 4, y - 7, 14, 9, '#ffffff'); rect(x + 2, y - 9, 6, 5, '#ffffff'); rect(x + 14, y - 9, 6, 5, '#ffffff'); rect(x + 3, y + 3, 16, 1, '#dddddd'); }
  else if (C.hat === 'wizard') { rect(x + 1, y + 3, 20, 3, hatC); rect(x + 5, y - 2, 12, 5, hatC); rect(x + 8, y - 7, 7, 5, hatC); rect(x + 11, y - 11, 4, 4, hatC); rect(x + 7, y, 2, 2, '#fdd835'); rect(x + 13, y - 5, 2, 2, '#fdd835'); }
  else if (C.hat === 'dino') { rect(x + 2, y - 1, 18, 8, hatC); rect(f > 0 ? x + 14 : x + 2, y + 1, 6, 3, '#ffffff'); rect(f > 0 ? x + 16 : x + 4, y + 2, 2, 2, '#111'); for (let i = 0; i < 3; i++) rect(f > 0 ? x + 1 - i * 3 : x + 18 + i * 3, y + 2 + i * 4, 4, 4, '#ff7043'); }
  else if (C.hat === 'pirate') { rect(x + 3, y + 1, 16, 5, hatC); rect(f > 0 ? x : x + 18, y + 3, 4, 3, hatC); rect(f > 0 ? x + 12 : x + 6, y + 8, 4, 3, '#111'); rect(x + 4, y + 8, 14, 1, '#111'); }
  else if (C.hat === 'headband') { rect(x + 3, y + 1, 16, 4, hair); rect(x + 3, y + 3, 16, 2, hatC); rect(f > 0 ? x : x + 18, y + 3, 4, 2, hatC); }
  else rect(x + 3, y + 1, 16, 5, hair);
  // body by outfit
  rect(x + 1, y + 16, 3, 5, skin); rect(x + 18, y + 16, 3, 5, skin); // hands
  if (C.outfit === 'overalls') {
    rect(x + 3, y + 14, 16, 6, shirt); rect(x + 5, y + 16, 12, 9, pants);
    rect(x + 6, y + 17, 2, 2, '#ffd84a'); rect(x + 14, y + 17, 2, 2, '#ffd84a');
  } else if (C.outfit === 'dress') {
    rect(x + 4, y + 14, 14, 6, shirt); rect(x + 3, y + 20, 16, 3, shirt); rect(x + 2, y + 23, 18, 3, shirt); rect(x + 5, y + 19, 12, 1, pants);
  } else if (C.outfit === 'jacket') {
    rect(x + 3, y + 14, 16, 9, shirt); rect(x + 10, y + 14, 2, 9, '#eeeeee'); rect(x + 3, y + 14, 2, 7, dark(shirt)); rect(x + 17, y + 14, 2, 7, dark(shirt)); rect(x + 5, y + 22, 12, 3, pants);
  } else { // tank top
    rect(x + 3, y + 14, 16, 3, skin); rect(x + 6, y + 14, 10, 9, shirt); rect(x + 5, y + 22, 12, 3, pants);
  }
  // legs (shorts colour) and shoes
  rect(x + 5, y + 25 - walk, 5, 3, C.outfit === 'dress' ? skin : pants); rect(x + 12, y + 25 - (1 - walk), 5, 3, C.outfit === 'dress' ? skin : pants);
  rect(x + 4, y + 28 - walk, 6, 2, '#5a3510'); rect(x + 12, y + 28 - (1 - walk), 6, 2, '#5a3510');
  if (p.star > 0) { cx.globalAlpha = 0.45; rect(x, y, 22, 30, `hsl(${(p.anim * 720) % 360},100%,60%)`); cx.globalAlpha = 1; }
  if (p.power === 'fire') { cx.globalAlpha = 0.5; rect(x + 3, y + 14, 16, 2, '#ff9b3d'); cx.globalAlpha = 1; }
  // sword
  const s = SWORDS[G.sword];
  if (p.atk > 0) {
    const t = 1 - p.atk / 0.18, a0 = f > 0 ? -1.4 : Math.PI + 1.4, a1 = f > 0 ? 1.0 : Math.PI - 1.0, a = a0 + (a1 - a0) * t;
    cx.save(); cx.translate(x + 11 + f * 8, y + 16); cx.rotate(a);
    rect(0, -2, s.reach, 4, s.c); rect(0, -3, 4, 6, '#5a3510'); cx.restore();
    cx.globalAlpha = 0.3; cx.strokeStyle = s.c; cx.lineWidth = 3; cx.beginPath();
    cx.arc(x + 11 + f * 8, y + 16, s.reach, Math.min(a0, a), Math.max(a0, a)); cx.stroke(); cx.globalAlpha = 1;
  } else {
    rect(f > 0 ? x + 19 : x - 1, y + 10, 3, 12, s.c); rect(f > 0 ? x + 17 : x - 3, y + 20, 7, 2, '#5a3510');
  }
  if (p.shield) {
    const sx = f > 0 ? x + (p.blocking ? 18 : -6) : x + (p.blocking ? -6 : 18), hp = p.shield.hp;
    rect(sx, y + 10, 10, 14, '#8a5a2b'); rect(sx, y + 10, 10, 2, '#b0b0b0'); rect(sx + 4, y + 10, 2, 14, '#b0b0b0');
    if (hp < 50) { rect(sx + 2, y + 15, 2, 4, '#3a2210'); rect(sx + 6, y + 19, 2, 3, '#3a2210'); }
    if (p.blocking) { cx.globalAlpha = 0.25; rect(sx - 2, y + 6, 14, 22, '#bfe3ff'); cx.globalAlpha = 1; }
  }
  // name tag in co-op
  if (G.players === 2 && !p.noTag) { cx.fillStyle = p.id ? '#5ef07a' : '#ff8a8a'; cx.font = 'bold 9px monospace'; cx.textAlign = 'center'; cx.fillText((G.race ? '#' + C.number + ' ' : '') + C.name, x + 11, y - 8); }
}
function drawMob(m, x, y) {
  const f = m.face, step = Math.floor(m.anim * 8) % 2;
  if (m.type === 'zombie') {
    rect(x + 3, y, 16, 12, '#5a9a5a'); rect(x + 3, y, 16, 3, '#2e5e2e');
    rect(f > 0 ? x + 12 : x + 5, y + 5, 3, 3, '#111'); rect(f > 0 ? x + 16 : x + 9, y + 5, 3, 3, '#111');
    rect(x + 3, y + 12, 16, 10, '#2aa6a6'); rect(f > 0 ? x + 14 : x - 4, y + 13, 12, 4, '#5a9a5a');
    rect(x + 4, y + 22, 6, 8 - step * 2, '#4b3fa0'); rect(x + 12, y + 22, 6, 6 + step * 2, '#4b3fa0');
  } else if (m.type === 'creeper') {
    let flash = m.fuse >= 0 && Math.floor(m.fuse * (6 + m.fuse * 10)) % 2 === 0;
    const sw = m.fuse >= 0 ? m.fuse * 2 : 0;
    cx.save(); cx.translate(x + 11, y + 30); cx.scale(1 + sw * 0.08, 1 + sw * 0.05); cx.translate(-11, -30);
    const gcol = flash ? '#f4fff4' : '#3fae46';
    // dark outline so creepers read clearly against any background
    rect(2, -1, 18, 16, '#14361a'); rect(5, 13, 12, 12, '#14361a'); rect(3, 23, 8, 8, '#14361a'); rect(11, 23, 8, 8, '#14361a');
    rect(3, 0, 16, 14, gcol); rect(6, 14, 10, 10, gcol);
    if (!flash) { rect(4, 2, 4, 4, '#3d8b40'); rect(14, 8, 4, 4, '#6fcf72'); rect(8, 16, 4, 4, '#3d8b40'); }
    rect(6, 4, 4, 4, '#111'); rect(12, 4, 4, 4, '#111'); rect(9, 8, 4, 3, '#111'); rect(7, 10, 8, 3, '#111'); rect(7, 13, 2, 1, '#111'); rect(13, 13, 2, 1, '#111');
    rect(4, 24, 6, 6 - step, gcol); rect(12, 24, 6, 5 + step, gcol);
    cx.restore();
  } else if (m.type === 'skeleton') {
    rect(x + 4, y, 14, 12, '#e6e6e6'); rect(f > 0 ? x + 11 : x + 6, y + 4, 3, 3, '#222'); rect(f > 0 ? x + 15 : x + 4, y + 4, 2, 3, '#222'); rect(x + 7, y + 9, 8, 1, '#888');
    rect(x + 9, y + 12, 4, 12, '#d0d0d0'); for (let i = 0; i < 3; i++) rect(x + 5, y + 13 + i * 3, 12, 1, '#d0d0d0');
    rect(x + 6, y + 24, 3, 6, '#d0d0d0'); rect(x + 13, y + 24, 3, 6, '#d0d0d0');
    cx.strokeStyle = '#7a4a1f'; cx.lineWidth = 2; cx.beginPath();
    const bx = f > 0 ? x + 20 : x + 2; cx.arc(bx, y + 16, 9, f > 0 ? -1.2 : Math.PI - 1.2, f > 0 ? 1.2 : Math.PI + 1.2); cx.stroke();
    if (m.cd < 0.4) { rect(f > 0 ? x + 12 : x - 2, y + 15, 12, 2, '#ccc'); }
  } else if (m.type === 'boss') {
    if (m.fade > 0) cx.globalAlpha = Math.max(0.1, Math.abs(Math.sin(m.fade * 20)));
    cx.globalAlpha *= 1; cx.shadowColor = '#b36bff'; cx.shadowBlur = 20;
    rect(x + 3, y, 24, 18, '#2a1840'); rect(x + 6, y + 6, 18, 12, '#c49a6c');
    rect(x + 8, y + 9, 5, 3, '#fff'); rect(x + 17, y + 9, 5, 3, '#fff');
    rect(x + 2, y + 18, 26, 16, '#3b2a6b'); rect(x + 8, y + 34, 6, 10, '#22184a'); rect(x + 16, y + 34, 6, 10, '#22184a');
    cx.shadowBlur = 0;
    const px = f > 0 ? x + 28 : x - 10; rect(px + 4, y + 10, 3, 26, '#7a4a1f'); rect(px - 2, y + 8, 15, 4, '#4ee6e0');
    cx.globalAlpha = 1;
  } else if (m.type === 'enderman') {
    const step2 = Math.abs(m.vx) > 1 ? Math.floor(m.anim * 6) % 2 : 0;
    rect(x + 2, y, 16, 14, '#141414'); rect(x + 3, y + 6, 6, 2, '#e07aff'); rect(x + 11, y + 6, 6, 2, '#e07aff');
    rect(x + 5, y + 14, 10, 14, '#1a1a1a'); rect(x + 1, y + 15, 3, 18, '#141414'); rect(x + 16, y + 15, 3, 18, '#141414');
    rect(x + 5, y + 28, 3, 16 - step2 * 2, '#141414'); rect(x + 12, y + 28, 3, 14 + step2 * 2, '#141414');
  } else if (m.type === 'missile') {
    const d = m.vx > 0 ? 1 : -1, fl = Math.floor(m.anim * 20) % 2;
    rect(x + 4, y + 2, 20, 10, '#3a3a44'); rect(x + 4, y + 2, 20, 2, '#5a5a66');
    rect(d > 0 ? x + 24 : x, y + 3, 4, 8, '#e53935');
    rect(d > 0 ? x + 2 : x + 22, y - 1, 4, 4, '#2a2a33'); rect(d > 0 ? x + 2 : x + 22, y + 11, 4, 4, '#2a2a33');
    rect(d > 0 ? x - 4 - fl * 2 : x + 28, y + 4, 4 + fl * 2, 6, fl ? '#ffe27a' : '#ff8a1a');
  } else if (m.type === 'ghast') {
    for (let i = 0; i < 6; i++) rect(x + 3 + i * 6, y + 40, 3, 8 + Math.sin(m.anim * 4 + i) * 4, '#d8d8d8');
    rect(x, y, 40, 40, '#f2f2f2'); rect(x, y + 34, 40, 6, '#d0d0d0'); rect(x + 34, y, 6, 40, '#dedede');
    if (m.flash > 0) { rect(x + 8, y + 12, 8, 8, '#c21f1f'); rect(x + 24, y + 12, 8, 8, '#c21f1f'); rect(x + 14, y + 24, 12, 8, '#222'); }
    else { rect(x + 8, y + 16, 8, 2, '#555'); rect(x + 24, y + 16, 8, 2, '#555'); rect(x + 16, y + 26, 8, 2, '#777'); }
  } else if (m.type === 'blaze') {
    for (let i = 0; i < 6; i++) { const a = m.anim * 3 + i * Math.PI / 3, rr = 14; rect(x + 9 + Math.cos(a) * rr, y + 16 + Math.sin(a) * rr * 0.5 + (i % 2) * 6, 4, 10, '#e8a020'); }
    cx.shadowColor = '#ffb03b'; cx.shadowBlur = 14;
    rect(x + 3, y, 16, 15, '#ffcf3a'); rect(x + 3, y, 16, 3, '#e8a020'); cx.shadowBlur = 0;
    rect(f > 0 ? x + 11 : x + 5, y + 5, 3, 3, '#3a1a00'); rect(f > 0 ? x + 16 : x + 10, y + 5, 3, 3, '#3a1a00'); rect(x + 7, y + 10, 8, 2, '#a05a00');
  } else if (m.type === 'crystal') {
    cx.save(); cx.translate(x + 10, y + 12); cx.rotate(m.anim * 2); cx.shadowColor = '#ff7ae0'; cx.shadowBlur = 18;
    rect(-9, -9, 18, 18, 'rgba(255,140,230,.55)'); cx.rotate(-m.anim * 4); rect(-6, -6, 12, 12, '#ff9ae6'); rect(-3, -3, 6, 6, '#fff'); cx.restore();
    rect(x + 2, y + 22, 16, 4, '#2a1647');
  } else if (m.type === 'dragon') {
    const flap = Math.sin(m.anim * 6);
    // tail from trail history
    for (let i = 4; i < m.trail.length; i += 3) { const s = Math.max(6, 22 - i * 0.5); rect(m.trail[i].x - s / 2, m.trail[i].y - s / 2 + 6, s, s, i % 6 ? '#1c1c22' : '#2b2b33'); }
    cx.fillStyle = '#26262e'; cx.beginPath(); cx.moveTo(x + 35, y + 12); cx.lineTo(x + 55, y + 12 - 46 * flap); cx.lineTo(x + 85, y + 12); cx.fill();
    rect(x + 15, y + 10, 75, 26, '#16161c'); for (let i = 0; i < 6; i++) rect(x + 20 + i * 11, y + 6, 6, 6, '#2e2e38');
    const hx = f > 0 ? x + 84 : x - 4;
    rect(hx, y + 6, 30, 22, '#1c1c22'); rect(f > 0 ? hx + 24 : hx - 6, y + 14, 12, 12, '#1c1c22');
    cx.shadowColor = '#e04cff'; cx.shadowBlur = 12; rect(f > 0 ? hx + 16 : hx + 6, y + 11, 8, 4, '#e04cff'); cx.shadowBlur = 0;
    cx.fillStyle = '#33333d'; cx.beginPath(); cx.moveTo(x + 40, y + 20); cx.lineTo(x + 60, y + 20 + 40 * flap); cx.lineTo(x + 80, y + 20); cx.fill();
  }
  if (m.hurt > 0) { cx.globalAlpha = 0.6; rect(x, y, m.w, m.h, '#ff3b3b'); cx.globalAlpha = 1; }
}
function drawItem(it, x, y) {
  const bob = Math.sin(it.t * 4 + it.x) * 2;
  if (it.kind === 'key') {
    cx.shadowColor = '#ffd84a'; cx.shadowBlur = 14;
    rect(x, y + bob, 10, 10, '#ffd84a'); rect(x + 3, y + 3 + bob, 4, 4, '#a07800'); rect(x + 10, y + 4 + bob, 10, 3, '#ffd84a'); rect(x + 16, y + 7 + bob, 3, 4, '#ffd84a');
    cx.shadowBlur = 0; return;
  }
  if (it.kind === 'coin') { const sq = Math.abs(Math.cos(it.t * 3 + it.x)); rect(x + 8 - 6 * sq, y + bob, 12 * sq + 2, 18, '#ffd84a'); rect(x + 8 - 3 * sq, y + 3 + bob, 6 * sq + 1, 12, '#e0a800'); }
  else if (it.kind === 'shield') {
    cx.shadowColor = '#bfe3ff'; cx.shadowBlur = 12;
    rect(x + 2, y + bob, 16, 20, '#8a5a2b'); rect(x + 2, y + bob, 16, 3, '#c0c0c0'); rect(x + 8, y + bob, 3, 20, '#c0c0c0'); cx.shadowBlur = 0;
  } else if (it.kind === 'mush') { rect(x, y, 20, 10, '#e53935'); rect(x + 4, y + 2, 4, 4, '#fff'); rect(x + 13, y + 3, 4, 4, '#fff'); rect(x + 5, y + 10, 10, 10, '#ffe0b2'); rect(x + 7, y + 12, 2, 3, '#222'); rect(x + 11, y + 12, 2, 3, '#222'); }
  else if (it.kind === 'flower') { rect(x + 9, y + 10, 3, 10, '#2f9e44'); rect(x + 3, y, 14, 10, '#ff6b1a'); rect(x + 6, y + 2, 8, 6, '#ffe94a'); rect(x + 9, y + 4, 2, 2, '#fff'); }
  else if (it.kind === 'star') {
    cx.fillStyle = `hsl(${(it.t * 400) % 360},100%,60%)`; cx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, a = -Math.PI / 2 + i * Math.PI / 5; cx.lineTo(x + 10 + Math.cos(a) * r, y + 10 + Math.sin(a) * r); }
    cx.fill();
  }
}
function drawBackground() {
  const th = G.lvl && G.lvl.theme, now = performance.now() / 1000;
  if (th === 'nether') {
    const grd = cx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#1a0303'); grd.addColorStop(1, '#6a1505');
    cx.fillStyle = grd; cx.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) { // distant lava falls
      const x = ((i * 300 - G.cam * 0.25) % (W + 300) + W + 300) % (W + 300) - 150;
      rect(x, 0, 18, H, '#e8581a'); rect(x + 4, 0, 8, H, '#ffb03b');
      for (let k = 0; k < 5; k++) rect(x + 2, ((now * 200 + k * 110 + i * 37) % H), 14, 10, '#ffe27a');
    }
    for (let i = 0; i < 6; i++) { const x = ((i * 380 - G.cam * 0.45) % (W + 380) + W + 380) % (W + 380) - 190; cx.fillStyle = '#3a0a0a'; cx.beginPath(); cx.moveTo(x, H); cx.lineTo(x + 90, 330 + (i % 3) * 30); cx.lineTo(x + 200, H); cx.fill(); }
    const lg = cx.createLinearGradient(0, 440, 0, H); lg.addColorStop(0, '#ff7a1a'); lg.addColorStop(1, '#c22a00');
    cx.fillStyle = lg; cx.fillRect(0, 470 + Math.sin(now * 2) * 3, W, H);
    for (let i = 0; i < 30; i++) { const ex = (i * 97 + now * 30 * (1 + i % 3)) % W, ey = H - ((now * 40 * (1 + i % 4) + i * 53) % H); rect(ex, ey, 3, 3, i % 2 ? '#ffb03b' : '#ff5a1a'); }
    return;
  }
  if (th === 'cave') {
    const grd = cx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#121216'); grd.addColorStop(1, '#2a2730');
    cx.fillStyle = grd; cx.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { const x = ((i * 170 - G.cam * 0.3) % (W + 170) + W + 170) % (W + 170) - 85; rect(x, 0, 64, 40 + (i * 37) % 70, '#1c1b21'); rect(x + 20, 40 + (i * 37) % 70, 24, 18, '#1c1b21'); }
    for (let i = 0; i < 7; i++) { // torches with flicker glow
      const x = ((i * 290 - G.cam * 0.5) % (W + 290) + W + 290) % (W + 290) - 145, y = 220 + (i % 3) * 40, f = 0.25 + 0.1 * Math.sin(now * 12 + i);
      cx.globalAlpha = f; cx.fillStyle = '#ffb03b'; cx.beginPath(); cx.arc(x + 3, y, 46, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;
      rect(x, y, 6, 20, '#6b4a2a'); rect(x - 1, y - 6, 8, 7, '#ffcf3a');
    }
    return;
  }
  if (th === 'end') {
    const grd = cx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#05030a'); grd.addColorStop(1, '#1d1030');
    cx.fillStyle = grd; cx.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { const tw = (Math.sin(now * 2 + i) + 1) / 2; cx.globalAlpha = 0.3 + tw * 0.7; rect((i * 173) % W, (i * 89) % 420, 2, 2, i % 4 ? '#fff' : '#d7b3ff'); }
    cx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) { const x = ((i * 260 - G.cam * 0.3) % (W + 260) + W + 260) % (W + 260) - 130; rect(x, 220 + (i % 2) * 60, 40, H, '#120a1e'); rect(x + 12, 210 + (i % 2) * 60, 16, 10, '#ff9ae6'); }
    return;
  }
  const night = th === 'night';
  const grd = cx.createLinearGradient(0, 0, 0, H);
  if (night) { grd.addColorStop(0, '#0d0221'); grd.addColorStop(1, '#3b1e5f'); } else { grd.addColorStop(0, '#5c94fc'); grd.addColorStop(1, '#a8d4ff'); }
  cx.fillStyle = grd; cx.fillRect(0, 0, W, H);
  const cam = G.lvl ? G.cam : performance.now() / 20;
  if (night) { for (let i = 0; i < 60; i++) rect((i * 137) % W, (i * 71) % 300, 2, 2, i % 3 ? '#fff' : '#b36bff'); rect(780, 60, 48, 48, '#e8e8f0'); return; }
  rect(820, 50, 48, 48, '#fff6a0');
  // blocky clouds
  for (let i = 0; i < 8; i++) { const x = ((i * 310 - cam * 0.15) % (W + 300) + W + 300) % (W + 300) - 150, y = 60 + (i * 47) % 120; rect(x, y, 96, 24, '#fff'); rect(x + 24, y - 16, 48, 16, '#fff'); }
  // hills
  for (let i = 0; i < 6; i++) {
    const x = ((i * 420 - cam * 0.4) % (W + 420) + W + 420) % (W + 420) - 210;
    cx.fillStyle = '#9fd88a'; cx.beginPath(); cx.ellipse(x + 100, 480, 140, 110 + (i % 2) * 40, 0, Math.PI, 0); cx.fill();
    rect(x + 80, 420, 8, 8, '#86c472'); rect(x + 120, 400, 8, 8, '#86c472');
  }
}
function drawWorld() {
  const L = G.lvl, sh = G.shake > 0 ? G.shake * 14 : 0;
  const ox = Math.round(-G.cam + rand(-sh, sh)), oy = Math.round(rand(-sh, sh));
  cx.save(); cx.translate(ox, oy);
  const c0 = Math.max(0, Math.floor(G.cam / T) - 1), c1 = Math.min(L.w - 1, Math.ceil((G.cam + W) / T) + 1);
  for (let y = 0; y < ROWS; y++) for (let x = c0; x <= c1; x++) {
    let c = L.g[y][x]; if (c === '.') continue;
    if (c === '#' && y > 0 && solidAt(x, y - 1)) c = 'D';
    cx.drawImage(tileImg(c), x * T, y * T);
  }
  if (L.flagX > 0) {
    const fx = L.flagX; rect(fx, 4 * T, 4, 11 * T, '#ddd'); rect(fx - 2, 4 * T - 8, 8, 8, '#ffd84a');
    const wave = Math.sin(performance.now() / 200) * 3; rect(fx + 4, 4 * T + 4 + wave, 30, 20, '#2fbf4a');
    rect(fx + 12, 4 * T + 9 + wave, 4, 4, '#111'); rect(fx + 22, 4 * T + 9 + wave, 4, 4, '#111'); rect(fx + 16, 4 * T + 14 + wave, 6, 5, '#111');
  }
  for (const r of L.regen) if (r.t < 3 && r.x >= c0 && r.x <= c1) {
    cx.globalAlpha = 0.15 + 0.25 * (1 - r.t / 3) + (Math.floor(r.t * 8) % 2 ? 0.1 : 0);
    cx.drawImage(tileImg(r.c), r.x * T, r.y * T); cx.globalAlpha = 1;
  }
  if (L.theme === 'nether') for (let x = c0; x <= c1; x++) if (!solidAt(x, 16)) { // lava pits
    const wv = Math.sin(performance.now() / 300 + x) * 3;
    rect(x * T, 15 * T + 12 + wv, T, H, '#ff6a00'); rect(x * T, 15 * T + 12 + wv, T, 4, '#ffd35a');
  }
  const dragon = L.mobs.find(m => m.type === 'dragon');
  if (dragon) for (const c of L.mobs) if (c.type === 'crystal' && !c.dead) {
    cx.strokeStyle = 'rgba(255,140,230,.7)'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(midX(c), midY(c)); cx.lineTo(midX(dragon), midY(dragon)); cx.stroke();
  }
  if (L.flagX > 0) { // checkpoint beacon
    const bx = L.cpCol * T + 12, lit = G.cp != null;
    rect(bx, 12 * T, 6, 3 * T, '#6b4a2a'); rect(bx - 5, 12 * T - 14, 16, 14, lit ? '#ffd84a' : '#777');
    if (lit) { cx.globalAlpha = 0.3 + 0.2 * Math.sin(performance.now() / 150); rect(bx - 9, 12 * T - 18, 24, 22, '#fff6a0'); cx.globalAlpha = 1; }
  }
  for (const gt of L.gates) {
    if (gt.type === 'plates') gt.plates.forEach((pl, i) => { const on = gt.on[i]; rect(pl.x - 2, pl.y + 4, 28, 2, '#555'); rect(pl.x, pl.y + (on ? 3 : 0), 24, on ? 3 : 6, on ? '#7fd650' : '#d0a020'); });
    else gt.levers.forEach(lv => {
      rect(lv.x + 2, lv.y + 26, 12, 4, '#555');
      cx.save(); cx.translate(lv.x + 8, lv.y + 26); cx.rotate(lv.t > 0 ? 0.7 : -0.7); rect(-2, -20, 4, 20, '#9a9a9a'); rect(-4, -24, 8, 6, lv.t > 0 ? '#7fd650' : '#e53935'); cx.restore();
      if (lv.t > 0) rect(lv.x - 4, lv.y - 10, 24 * lv.t, 4, '#ffd84a');
    });
    if (!gt.open) {
      text(gt.type === 'plates' ? 'TEAM GATE: BOTH STAND ON A PLATE' : 'TEAM GATE: HIT BOTH LEVERS WITHIN 1s', gt.col * T - 150, 5 * T, 13, '#ffd84a', 'center');
      text('tip: jump on your partner + hold jump = TEAM BOOST', gt.col * T - 150, 5 * T + 20, 10, '#7fe0ff', 'center');
    }
  }
  for (const it of L.items) drawItem(it, it.x, it.y);
  for (const m of L.mobs) if (m.x + m.w > G.cam - 60 && m.x < G.cam + W + 60) drawMob(m, m.x, m.y);
  for (const p of G.p) if (!p.dead) drawHero(p, p.x, p.y);
  for (const pr of G.proj) {
    if (pr.kind === 'arrow') { cx.save(); cx.translate(midX(pr), midY(pr)); cx.rotate(Math.atan2(pr.vy, pr.vx)); rect(-7, -1, 14, 2, '#d8c8a8'); rect(5, -2, 3, 4, '#aaa'); rect(-8, -2, 3, 4, '#fff'); cx.restore(); }
    else if (pr.kind === 'fire' || pr.kind === 'bfire') { rect(pr.x, pr.y, 10, 10, '#ff6b1a'); rect(pr.x + 2, pr.y + 2, 6, 6, '#ffe94a'); }
    else if (pr.kind === 'bullet') { rect(pr.x, pr.y, 10, 3, '#fff27a'); }
    else if (pr.kind === 'bomb') { rect(pr.x, pr.y, 10, 10, '#2a2a2a'); rect(pr.x + 3, pr.y - 3, 3, 4, '#8a5a2b'); if (Math.floor(pr.life * 10) % 2) rect(pr.x + 3, pr.y + 3, 4, 4, '#ff3b3b'); }
    else if (pr.kind === 'gfire') { cx.shadowColor = pr.mine ? '#7fe0ff' : '#ff6b1a'; cx.shadowBlur = 16; rect(pr.x, pr.y, 18, 18, pr.mine ? '#3fb6ff' : '#ff4a1a'); rect(pr.x + 4, pr.y + 4, 10, 10, '#ffe27a'); cx.shadowBlur = 0; }
    else if (pr.kind === 'breath') { cx.shadowColor = '#e04cff'; cx.shadowBlur = 16; rect(pr.x, pr.y, 16, 16, '#b04cff'); rect(pr.x + 4, pr.y + 4, 8, 8, '#f0c0ff'); cx.shadowBlur = 0; }
    else { cx.shadowColor = '#b36bff'; cx.shadowBlur = 14; rect(pr.x, pr.y, 12, 12, '#d7b3ff'); cx.shadowBlur = 0; }
  }
  for (const pt of G.parts) { cx.globalAlpha = Math.min(1, pt.life * 2); rect(pt.x, pt.y, pt.size, pt.size, pt.color); }
  cx.globalAlpha = 1;
  cx.font = 'bold 14px monospace'; cx.textAlign = 'center';
  for (const t of G.texts) { cx.globalAlpha = Math.min(1, t.life * 2); cx.fillStyle = '#000'; cx.fillText(t.text, t.x + 1, t.y + 1); cx.fillStyle = t.color; cx.fillText(t.text, t.x, t.y); }
  cx.globalAlpha = 1;
  cx.restore();
}
function text(s, x, y, size = 16, color = '#fff', align = 'left') {
  cx.font = `bold ${size}px monospace`; cx.textAlign = align; cx.textBaseline = 'alphabetic';
  cx.fillStyle = 'rgba(0,0,0,.7)'; cx.fillText(s, x + 2, y + 2); cx.fillStyle = color; cx.fillText(s, x, y);
}
function heart(x, y, full) { const c = full ? '#ff3b3b' : '#4a1a1a'; rect(x, y + 2, 4, 6, c); rect(x + 4, y, 4, 12, c); rect(x + 8, y + 2, 4, 6, c); rect(x + 2, y + 8, 8, 4, c); rect(x + 4, y + 12, 4, 2, c); }
function drawHUD() {
  rect(0, 0, W, 44, 'rgba(0,0,0,.45)');
  G.p.forEach((p, i) => {
    const bx = i === 0 ? 12 : W - 230;
    text(nameOf(p).slice(0, 10) + '  ' + (p.score || 0) + ' pts' + (G.race ? `  x${p.lives}  KEYS ${p.keys || 0}` : ''), bx, 16, 12, p.id ? '#5ef07a' : '#ff6b6b');
    if (p.finished) { text(`FINISHED ${p.place === 1 ? '1ST' : '2ND'}  ${fmtTime(p.finishT)}`, bx, 36, 14, '#ffd84a'); return; }
    if (p.dead) { text(p.respawn > 0 ? 'RESPAWNING...' : 'OUT', bx, 36, 14, '#aaa'); return; }
    for (let h = 0; h < p.maxhp; h++) heart(bx + h * 16, 22, h < p.hp);
    let ix = bx + p.maxhp * 16 + 8;
    if (p.shield) { text('SH', ix, 33, 9, '#9fd3ff'); rect(ix + 16, 25, 40, 8, '#333'); rect(ix + 16, 25, 40 * p.shield.hp / 100, 8, p.shield.hp > 50 ? '#9fd3ff' : p.shield.hp > 25 ? '#ffd84a' : '#ff6b6b'); ix += 62; }
    if (p.power === 'fire') { text('FIRE', ix, 34, 11, '#ff9b3d'); ix += 34; }
    if (p.star > 0) text('STAR ' + Math.ceil(p.star), ix, 34, 11, '#ffe94a');
  });
  const cxm = W / 2;
  text(`${MAPS[G.map].name} ${G.li + 1}/${MAPS[G.map].levels.length}: ${(LEVEL_NAME[G.level] || '').replace('BOSS: ', '').replace('THE END: ', '')}   ${G.diff.name}`, cxm, 16, 12, G.diff.crazy ? `hsl(${(performance.now() / 4) % 360},100%,65%)` : '#fff', 'center');
  if (G.race) text(`DRAG RACE   ${fmtTime(G.time)}${G.raceT != null ? `   ENDS IN ${Math.ceil(Math.max(0, G.raceT))}s` : ''}`, cxm, 36, 14, '#ffd84a', 'center');
  else text(`${G.lvl.doors.length ? 'KEYS ' + G.keys + '   ' : ''}COINS ${G.coins}   LIVES ${G.lives}   SWORD ${SWORDS[G.sword].n}   ${fmtTime(G.time)}`, cxm, 36, 13, '#ffd84a', 'center');
  const boss = G.lvl.mobs.find(m => m.type === 'boss' || m.type === 'dragon');
  if (boss) {
    const crystals = G.lvl.mobs.filter(m => m.type === 'crystal').length;
    rect(cxm - 200, 56, 400, 12, '#222'); rect(cxm - 200, 56, 400 * Math.max(0, boss.hp) / boss.maxhp, 12, boss.type === 'dragon' ? '#e04cff' : '#b36bff');
    text(boss.type === 'dragon' ? `ENDER DRAGON${crystals ? `  (healed by ${crystals} crystal${crystals > 1 ? 's' : ''})` : ''}` : 'GHOST MINER', cxm, 84, 12, '#d7b3ff', 'center');
  }
  if (G.diff.crazy) text('HOLD FIRE: GUN   ' + (G.players === 2 ? "E / '" : 'E') + ': STICKY BOMB', cxm, H - 10, 11, '#ffd84a', 'center');
  if (G.msg) { const a = Math.min(1, G.msg.t * 2); cx.globalAlpha = a; text(G.msg.text, cxm, 170, 34, '#fff', 'center'); cx.globalAlpha = 1; }
  text(muted ? 'M: SOUND OFF' : 'M: SOUND ON', W - 12, H - 10, 10, '#ddd', 'right');
  text('P: PAUSE', 12, H - 10, 10, '#ddd');
}
const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function panel(x, y, w, h) { rect(x, y, w, h, 'rgba(10,10,30,.88)'); cx.strokeStyle = '#ffd84a'; cx.lineWidth = 3; cx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); }
// CONTROLS GUIDE (title screen + pause menu; reflects the WASD/ARROWS swap setting)
function controlsPanel(L0, T0) {
  panel(L0, T0, 484, 300);
  const c1 = CTRL[G.swap ? 1 : 0], c2 = CTRL[G.swap ? 0 : 1], kn = list => list.filter(k => KEYNAME[k]).map(k => KEYNAME[k]).join(' / ');
  const rows = [
    ['MOVE', kn(c1.l) + ' ' + kn(c1.r), kn(c2.l) + ' ' + kn(c2.r), ''],
    ['JUMP', kn(c1.j), kn(c2.j), 'hold = higher; stomp'],
    ['CROUCH', kn(c1.c), kn(c2.c), 'duck under missiles'],
    ['SWORD', kn(c1.a), kn(c2.a), 'deflects shots'],
    ['SHIELD hold', kn(c1.s), kn(c2.s), 'blocks until it breaks'],
    ['FIRE / GUN', kn(c1.f), kn(c2.f), 'flower / CRAZY gun'],
    ['STICKY BOMB', kn(c1.b), kn(c2.b), 'CRAZY mode only'],
  ];
  text('CONTROLS', L0 + 14, T0 + 26, 14, '#ffd84a'); text('P1 ' + c1.name, L0 + 120, T0 + 26, 12, '#ff9a9a'); text('P2 ' + c2.name, L0 + 222, T0 + 26, 12, '#9af0a9');
  rows.forEach((r, i) => { const y = T0 + 52 + i * 22; text(r[0], L0 + 14, y, 11, '#fff'); text(r[1], L0 + 120, y, 11, '#ffd0d0'); text(r[2], L0 + 222, y, 11, '#d0ffd8'); text(r[3], L0 + 330, y, 10, '#aaa'); });
  text('P pause · M mute · C on world screen swaps keys', L0 + 242, T0 + 220, 11, '#ccc', 'center');
  text('creepers blow up blocks · blocks regrow in 15s', L0 + 242, T0 + 238, 11, '#ccc', 'center');
}
function drawTitle() {
  drawBackground();
  for (let x = 0; x < W; x += T) { cx.drawImage(tileImg('#'), x, H - 2 * T); cx.drawImage(tileImg('X'), x, H - T); }
  const t = performance.now() / 1000;
  drawMob({ type: 'creeper', face: -1, anim: t, fuse: -1, hurt: 0, w: 22, h: 30 }, 700, H - 2 * T - 30);
  drawMob({ type: 'zombie', face: -1, anim: t, hurt: 0, w: 22, h: 30 }, 760, H - 2 * T - 30);
  drawMob({ type: 'skeleton', face: -1, anim: t, cd: 1, hurt: 0, w: 22, h: 30 }, 820, H - 2 * T - 30);
  const fake = { id: 0, face: 1, vx: 100, onGround: true, anim: t, inv: 0, star: 0, w: 22, h: 30 };
  drawHero(fake, 180, H - 2 * T - 30); if (G.players === 2) drawHero({ ...fake, id: 1 }, 220, H - 2 * T - 30);
  text('BLOCK BROS', W / 2, 120 + Math.sin(t * 2) * 4, 64, '#ffd84a', 'center');
  text('CREEPER KINGDOM', W / 2, 165, 28, '#7fd650', 'center');
  controlsPanel(16, 182);
  // PROGRESS LIST (right; saved in the browser)
  const R0 = 512, recs = getRecords(), sv = getSave();
  panel(R0, 182, 432, 300);
  text('YOUR PROGRESS', R0 + 14, 208, 14, '#ffd84a'); text('BEST TIME', R0 + 250, 208, 10, '#aaa', 'right'); text('BEST PTS', R0 + 340, 208, 10, '#aaa', 'right'); text('PLAYS', R0 + 418, 208, 10, '#aaa', 'right');
  let any = false;
  LEVEL_ORDER.forEach((n, i) => {
    const e = recs[String(n)] || {}, y = 230 + i * 20, plays = num(e.plays) || 0, clears = num(e.clears) || 0;
    if (plays || clears) any = true;
    const world = n === 4 || n === 7 ? '#ff8a5a' : n === 5 || n === 8 ? '#d7a6ff' : '#9fe07a';
    text((clears ? '✓ ' : plays ? '· ' : '  ') + (LEVEL_NAME[n] || '').replace('BOSS: ', '').replace('THE END: SLAY THE DRAGON', 'ENDER DRAGON'), R0 + 14, y, 11, plays ? world : '#555');
    text(num(e.bestTime) != null ? fmtTime(e.bestTime) : '--', R0 + 250, y, 11, '#fff', 'right');
    text(num(e.bestPts) != null ? String(e.bestPts) : '--', R0 + 340, y, 11, '#ffd84a', 'right');
    text(String(plays), R0 + 418, y, 11, '#ccc', 'right');
  });
  if (!any) text('No levels played yet. Your runs are saved here.', R0 + 216, 402, 11, '#aaa', 'center');
  else text('✓ cleared   · played, not cleared yet', R0 + 216, 402, 10, '#aaa', 'center');
  if (sv) text(`L: CONTINUE ${MAPS[sv.map].name} ${sv.li + 1}/${MAPS[sv.map].levels.length} (${DIFF[DKEYS[sv.diffIdx]].name})`, R0 + 216, 424, 12, '#7fe0ff', 'center');
  if (Math.floor(t * 2) % 2) text(sv ? 'PRESS ENTER FOR NEW GAME' : 'PRESS ENTER', W / 2, 512, 20, '#fff', 'center');
}
function drawMaps() {
  drawTitle();
  rect(0, 0, W, H, 'rgba(5,5,15,.82)');
  text('CHOOSE YOUR WORLD', W / 2, 60, 34, '#ffd84a', 'center');
  const t = performance.now() / 1000;
  MAPS.forEach((m, i) => {
    const sel = i === G.map, x = W / 2 - 435 + i * 295, y = 90 + (sel ? Math.sin(t * 4) * 3 : 0), w = 280, h = 230;
    const bg = ['#5c94fc', '#5a1205', '#120a1e'][i];
    rect(x, y, w, h, bg); rect(x, y + h - 40, w, 40, ['#5fb83a', '#6e1f1f', '#dcd9a3'][i]); rect(x, y + h - 40, w, 6, ['#7fd650', '#b0442f', '#ece9bb'][i]);
    if (i === 1) { rect(x + 30, y, 14, h - 40, '#ffb03b'); rect(x + 220, y, 14, h - 40, '#e8581a'); }
    if (i === 2) { rect(x + 120, y + 60, 40, 130, '#140b22'); rect(x + 132, y + 48, 16, 12, '#ff9ae6'); }
    cx.strokeStyle = sel ? '#ffd84a' : '#555'; cx.lineWidth = sel ? 5 : 2; cx.strokeRect(x, y, w, h);
    text(m.name, x + w / 2, y + 36, 22, m.color, 'center');
    text('★'.repeat(m.stars) + '☆'.repeat(3 - m.stars), x + w / 2, y + 70, 26, '#ffd84a', 'center');
    text('MAP DIFFICULTY: ' + m.tier, x + w / 2, y + 96, 12, '#fff', 'center');
    text(m.desc[0], x + w / 2, y + 130, 12, '#eee', 'center'); text(m.desc[1], x + w / 2, y + 150, 12, '#eee', 'center');
    text('Starts with ' + SWORDS[m.sword].n + ' sword', x + w / 2, y + 172, 11, '#bbb', 'center');
    text('Inspired by:', x + w / 2, y + 190, 10, '#ffd84a', 'center'); text(m.insp, x + w / 2, y + 204, 10, '#ffe9a0', 'center');
    const best = store.get('bb_best_' + i + '_' + DKEYS[G.diffIdx], null);
    if (best != null) text('BEST ' + fmtTime(best), x + w / 2, y + h - 14, 12, '#111', 'center');
  });
  panel(W / 2 - 330, 328, 660, 210);
  text(`PLAYERS:   ${G.players === 1 ? '[ 1 PLAYER ]   2 PLAYERS' : '  1 PLAYER   [ 2 PLAYERS ]'}   (1 / 2)`, W / 2, 352, 16, '#fff', 'center');
  text(`GAME:   ${G.race ? '  CO-OP   [ DRAG RACE ]' : '[ CO-OP ]   DRAG RACE  '}   (R)`, W / 2, 378, 16, G.race ? '#ff9a3d' : '#7fe0ff', 'center');
  text(G.race ? 'Race to the flag in split screen. Coins, kills, keys and finishing first earn points.' : G.players === 2 ? 'Co-op: split screen, TEAM GATES (plates + timed levers), TEAM BOOST jumps' : 'Co-op adventure through every level of the world', W / 2, 394, 11, '#ccc', 'center');
  const dk = DKEYS[G.diffIdx], dcol = { easy: '#7fd650', normal: '#fff', hard: '#ff6b6b', crazy: `hsl(${(t * 300) % 360},100%,65%)` }[dk];
  text(`MODE:   ▲ ${DIFF[dk].name} ▼`, W / 2, 424, 16, dcol, 'center');
  text(dk === 'crazy' ? 'Guns, sticky bombs, 9 lives and a 15-mob horde. Total chaos.' : dk === 'hard' ? 'Faster mobs, 2 lives, shields spawn damaged.' : dk === 'easy' ? '5 lives, slower mobs.' : '3 lives. The intended experience.', W / 2, 440, 11, '#ccc', 'center');
  text(`SETTINGS > CONTROLS:   P1 = ${CTRL[G.swap ? 1 : 0].name},  P2 = ${CTRL[G.swap ? 0 : 1].name}   (C to swap)`, W / 2, 470, 14, '#fff', 'center');
  text('LEFT/RIGHT world   UP/DOWN mode   ENTER start   ESC back', W / 2, 515, 12, '#ffd84a', 'center');
}
function drawCustom() {
  drawTitle(); rect(0, 0, W, H, 'rgba(5,5,15,.86)');
  const t = performance.now() / 1000, U = G.cust;
  text(G.race ? 'DRAG RACE: DESIGN YOUR RACERS' : 'CUSTOMIZE YOUR FIGHTER' + (G.players === 2 ? 'S' : ''), W / 2, 40, 26, '#ffd84a', 'center');
  for (let i = 0; i < G.players; i++) {
    const c = G.chars[i], px0 = G.players === 2 ? (i ? 492 : 24) : 258, k = ctrlOf({ id: i }), col = i ? '#5ef07a' : '#ff8a8a';
    panel(px0, 56, 444, 456);
    text(`P${i + 1} · ${KEYNAME[k.j[0]]}/${KEYNAME[k.c[0]]} select · ${KEYNAME[k.l[0]]}/${KEYNAME[k.r[0]]} change · ${KEYNAME[k.a[0]]} edit name`, px0 + 222, 76, 10, col, 'center');
    // live preview, running in place
    const fake = { id: i, face: 1, vx: 200, onGround: true, anim: t, inv: 0, star: 0, w: 22, h: 30, char: c, noTag: true };
    cx.save(); cx.translate(px0 + 222 - 35, 92); cx.scale(3.2, 3.2); drawHeroBody(fake, 0, 0); cx.restore();
    const typing = U.typing === i;
    text(`#${c.number} ${c.name}${typing && Math.floor(t * 2) % 2 ? '_' : ''}`, px0 + 222, 210, 18, typing ? '#7fe0ff' : col, 'center');
    CROWS.forEach((row, r) => {
      const y = 238 + r * 24, sel = U.sel[i] === r;
      if (sel) rect(px0 + 12, y - 16, 420, 22, 'rgba(255,216,74,.16)');
      text(row, px0 + 24, y, 12, sel ? '#fff' : '#aaa');
      let val = '', sw = null;
      if (row === 'NAME') val = typing ? 'typing... Enter to finish' : c.name;
      else if (row === 'PRESET') val = c.preset;
      else if (row === 'HAT') val = c.hat.toUpperCase();
      else if (row === 'OUTFIT') val = c.outfit.toUpperCase();
      else if (row === 'RACE TRAIL') val = c.trail.toUpperCase();
      else if (row === 'RACE NUMBER') val = '#' + c.number;
      else { const key = { 'HAT COLOUR': 'hatColor', SHIRT: 'shirt', SHORTS: 'pants', SKIN: 'skin', HAIR: 'hair' }[row]; sw = PAL[key][c[key]]; }
      if (sw) { rect(px0 + 330, y - 12, 40, 14, sw); cx.strokeStyle = '#fff'; cx.lineWidth = 1; cx.strokeRect(px0 + 330.5, y - 11.5, 39, 13); }
      else text(val, px0 + 350, y, 12, sel ? '#ffd84a' : '#ddd', 'center');
      if (sel && row !== 'NAME') { text('◀', px0 + 290, y, 12, '#ffd84a', 'center'); text('▶', px0 + 410, y, 12, '#ffd84a', 'center'); }
    });
  }
  text(U.typing >= 0 ? 'Type a name (letters, numbers, space) · Enter to finish' : 'SPACE: START' + (G.race ? ' THE RACE' : '') + '   ESC: BACK', W / 2, 532, 14, '#fff', 'center');
}
function drawShop() {
  panel(W / 2 - 280, 110, 560, 330);
  text('BLOCKSMITH SHOP', W / 2, 150, 28, '#ffd84a', 'center');
  text(`COINS: ${G.coins}   SWORD: ${SWORDS[G.sword].n}   LIVES: ${G.lives}`, W / 2, 180, 14, '#fff', 'center');
  SHOP.forEach((o, i) => {
    const y = 225 + i * 44, sel = i === G.shopSel, c = o.cost(), afford = c != null && G.coins >= c;
    if (sel) rect(W / 2 - 250, y - 24, 500, 34, 'rgba(255,216,74,.18)');
    text(`${i + 1}. ${o.label()}`, W / 2 - 235, y, 16, sel ? '#fff' : '#ccc');
    if (o.id !== 'go') text(c == null ? '--' : c + 'c', W / 2 + 235, y, 16, afford ? '#7fd650' : '#ff6b6b', 'right');
  });
  text('Up/Down + Enter, or press 1-4', W / 2, 425, 12, '#aaa', 'center');
}
function render() {
  if (G.state === 'title') { drawTitle(); return; }
  if (G.state === 'maps') { drawMaps(); return; }
  if (G.state === 'custom') { drawCustom(); return; }
  if (G.split && G.cams) {
    const save = G.cam;
    for (let i = 0; i < 2; i++) {
      cx.save(); cx.beginPath(); cx.rect(i * W / 2, 0, W / 2, H); cx.clip(); cx.translate(i * W / 2, 0);
      G.cam = G.cams[i]; drawBackground(); drawWorld(); cx.restore();
    }
    G.cam = save; rect(W / 2 - 3, 0, 6, H, '#111'); rect(W / 2 - 1, 0, 2, H, '#ffd84a');
  } else { drawBackground(); drawWorld(); }
  drawHUD();
  if (G.state === 'pause') {
    rect(0, 0, W, H, 'rgba(5,5,15,.7)');
    text('PAUSED', W / 2, 110, 36, '#ffd84a', 'center');
    controlsPanel(W / 2 - 242, 126);
    text('P / Esc resume    Q quit to title    M sound', W / 2, 462, 15, '#fff', 'center');
  }
  if (G.state === 'shop') drawShop();
  if (G.state === 'over') { panel(W / 2 - 220, 190, 440, 150); text('GAME OVER', W / 2, 245, 40, '#ff3b3b', 'center'); text('Press Enter for title', W / 2, 300, 14, '#fff', 'center'); }
  if (G.state === 'results') {
    panel(W / 2 - 300, 120, 600, 300); text('RACE RESULTS', W / 2, 165, 36, '#ffd84a', 'center');
    // the winner is whoever crossed the flag first; if nobody finished, the higher score wins
    const ranked = [...G.p].sort((a, b) => (a.finished ? a.place : 9) - (b.finished ? b.place : 9) || b.score - a.score);
    const win = ranked[0], tie = !win.finished && ranked[0].score === ranked[1].score;
    text(tie ? "IT'S A TIE!" : `${nameOf(win)} WINS!`, W / 2, 200, 26, tie ? '#fff' : win.id ? '#5ef07a' : '#ff6b6b', 'center');
    ranked.forEach((p, i) => {
      const y = 250 + i * 56, col = p.id ? '#5ef07a' : '#ff6b6b';
      text(`${i === 0 && !tie ? '1ST' : '2ND'}  #${charOf(p).number} ${nameOf(p)}`, W / 2 - 270, y, 20, col);
      text(`${p.score} pts`, W / 2 + 270, y, 20, '#fff', 'right');
      text(p.finished ? `TIME ${fmtTime(p.finishT)}  (finish bonus +${p.bonus})` : `did not finish  (race ended at ${fmtTime(G.raceEnd || G.time)})`, W / 2 - 270, y + 20, 12, '#ccc');
    });
    text('coin 10 · kill 100 · key 200 · 1st finish 1000 · time bonus · death -250', W / 2, 390, 11, '#aaa', 'center');
    text('Press Enter for title', W / 2, 410, 13, '#fff', 'center');
  }
  if (G.state === 'win') {
    panel(W / 2 - 260, 170, 520, 200); text('YOU WIN!', W / 2, 225, 44, '#ffd84a', 'center');
    text(`${MAPS[G.map].name} CLEARED   TIME ${fmtTime(G.time)}   ${G.diff.name}`, W / 2, 270, 16, '#fff', 'center');
    if (G.best != null) text('BEST ' + fmtTime(G.best), W / 2, 300, 14, '#7fd650', 'center');
    text('Press Enter for title', W / 2, 340, 14, '#fff', 'center');
  }
}

// ---------- loop ----------
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000); last = now;
  let n = 0;
  while (acc >= STEP && n < 5) {
    try { update(STEP); } catch (e) { console.error(e); }
    for (const k in pressed) delete pressed[k];
    acc -= STEP; n++;
  }
  if (n >= 5) acc = 0;
  try { render(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
cv.focus();
cv.addEventListener('pointerdown', () => { cv.focus(); audio(); });
requestAnimationFrame(frame);
})();
