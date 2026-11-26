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
let ac = null, muted = !!store.get('bb_muted', false);
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
function tone(f, d, type = 'square', vol = 0.06, slide = 0, delay = 0) {
  if (muted) return; const a = audio(); if (!a) return;
  try {
    const t0 = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + d);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + d + 0.02);
  } catch (e) { /* ignore */ }
}
function noise(d, vol = 0.25, freq = 800) {
  if (muted) return; const a = audio(); if (!a) return;
  try {
    const n = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
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
};

// ---------- input ----------
const keys = Object.create(null), pressed = Object.create(null);
const NOSCROLL = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'ShiftRight', 'Slash']);
addEventListener('keydown', e => {
  if (NOSCROLL.has(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true; audio();
});
addEventListener('keyup', e => { keys[e.code] = false; });
function releaseAll() { for (const k in keys) keys[k] = false; for (const k in pressed) delete pressed[k]; }
function autoPause() { releaseAll(); if (G.state === 'play') G.state = 'pause'; }
addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
const hit1 = (...codes) => codes.some(c => pressed[c]);
const CTRL = [
  { l: ['KeyA'], r: ['KeyD'], j: ['KeyW', 'Space'], s: ['KeyS'], a: ['KeyF'], f: ['KeyG'] },
  { l: ['ArrowLeft'], r: ['ArrowRight'], j: ['ArrowUp'], s: ['ArrowDown'], a: ['Enter', 'NumpadEnter', 'Slash', 'Numpad0'], f: ['ShiftRight', 'Period', 'Numpad1'] },
];
const held = list => list.some(c => keys[c]);
const tapped = list => list.some(c => pressed[c]);

// ---------- config ----------
const DIFF = {
  easy:   { name: 'EASY',   lives: 5, spd: 0.8,  fire: 2.8, bossHp: 30, wear: [0, 0] },
  normal: { name: 'NORMAL', lives: 3, spd: 1,    fire: 2.1, bossHp: 40, wear: [0, 0] },
  hard:   { name: 'HARD',   lives: 2, spd: 1.25, fire: 1.5, bossHp: 55, wear: [5, 40] },
};
const DKEYS = ['easy', 'normal', 'hard'];
const SWORDS = [
  { n: 'WOOD', dmg: 1, reach: 26, c: '#b07a3c', cost: 0 },
  { n: 'STONE', dmg: 2, reach: 32, c: '#9a9a9a', cost: 12 },
  { n: 'IRON', dmg: 3, reach: 38, c: '#f0f0f0', cost: 25 },
  { n: 'DIAMOND', dmg: 5, reach: 46, c: '#4ee6e0', cost: 40 },
];
const SHIELD_DMG = { arrow: 34, zombie: 15, creeper: 60, boss: 25, skeleton: 15 };
const BLAST_R = 6 * T;
const SOLID = new Set(['#', 'X', 'B', '?', 'T', 'U', 'G']);
const BREAKABLE = new Set(['#', 'B', '?', 'T', 'U']);

// ---------- level generation (seeded => same level every run) ----------
function makeLevel(n) {
  if (n === 3) return bossArena();
  const rng = mulberry(n * 9973 + 7), ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const w = n === 1 ? 150 : 190;
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
    perch(x) {
      if (perches >= 2) return segs.flat(x); perches++;
      plat(x + 1, 12, 2); plat(x + 4, 9, 2); plat(x + 7, 6, 3);
      set(x + 7, 5, 'S'); set(x + 9, 5, 's'); if (n > 1) pit(x + 4, 3);
      return 12;
    },
  };
  const order = n === 1
    ? ['flat', 'qrow', 'pit', 'tower', 'creeper', 'pipe', 'perch', 'qrow', 'creeper', 'pit', 'tower', 'flat', 'creeper', 'perch', 'pipe']
    : ['creeper', 'tower', 'pit', 'qrow', 'perch', 'creeper', 'pipe', 'tower', 'pit', 'creeper', 'qrow', 'perch', 'tower', 'creeper', 'pipe', 'pit', 'creeper'];
  let x = 12, i = 0;
  while (x < w - 30) { x += segs[order[i % order.length]](x) + ri(1, 3); i++; }
  // finale staircase (optional to climb) and flag
  for (let s = 0; s < 6; s++) for (let h = 0; h <= s; h++) set(w - 24 + s, 14 - h, 'B');
  set(w - 10, 14, 'F');
  // reinforced ground ('G') at spawn and checkpoint: creepers can't blow it up, so respawns are always safe
  const protect = (a, b) => { for (let c = a; c <= b; c++) { set(c, 15, 'G'); set(c, 16, 'X'); for (let y = 12; y < 15; y++) if (g[y][c] !== 'o') g[y][c] = '.'; for (let y = 0; y < 15; y++) if (g[y][c] === 'z' || g[y][c] === 'c' || g[y][c] === 's') g[y][c] = '.'; } };
  const cp = Math.floor(w / 2);
  protect(0, 8); protect(cp - 2, cp + 2);
  set(3, 14, '1');
  return finalize(g, w, n);
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
function finalize(g, w, n) {
  const L = { n, w, g, mobs: [], items: [], flagX: -1, spawn: { x: 3 * T, y: 14 * T }, cpCol: Math.floor(w / 2) };
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < w; x++) {
    const c = g[y][x];
    if (c === 'z' || c === 'c' || c === 's') { L.mobs.push(makeMob({ z: 'zombie', c: 'creeper', s: 'skeleton' }[c], x * T + 5, y * T + 1)); g[y][x] = '.'; }
    else if (c === 'o') { L.items.push(makeItem('coin', x * T + 8, y * T + 6, true)); g[y][x] = '.'; }
    else if (c === 'S') { L.items.push(makeItem('shield', x * T + 6, y * T + 8, false)); g[y][x] = '.'; }
    else if (c === 'F') { L.flagX = x * T + 12; g[y][x] = '.'; }
    else if (c === '1') { L.spawn = { x: x * T + 5, y: y * T + 1 }; g[y][x] = '.'; }
  }
  if (n === 3) L.mobs.push(makeMob('boss', 14 * T, 3 * T));
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
  return base;
}
function makeItem(kind, x, y, fixed) { return { kind, x, y, w: kind === 'coin' ? 16 : 20, h: kind === 'coin' ? 20 : 20, vx: 0, vy: fixed ? 0 : -260, fixed, life: Infinity, t: 0 }; }

// ---------- game state ----------
const G = {
  state: 'title', players: 1, diffIdx: 1, diff: DIFF.normal, level: 1, lvl: null,
  p: [], coins: 0, lives: 3, sword: 0, cam: 0, shake: 0, proj: [], parts: [], texts: [], msg: null,
  timer: 0, time: 0, cp: null, overT: 0, best: store.get('bb_best', null), shopSel: 0,
};

function newGame() {
  G.diff = DIFF[DKEYS[G.diffIdx]];
  G.p = [makePlayer(0)]; if (G.players === 2) G.p.push(makePlayer(1));
  G.coins = 0; G.lives = G.diff.lives; G.sword = 0; G.time = 0; G.level = 1;
  loadLevel(1); G.state = 'play';
}
function loadLevel(n) {
  G.level = n; G.lvl = makeLevel(n); G.proj = []; G.parts = []; G.texts = []; G.cp = null; G.overT = 0;
  const boss = G.lvl.mobs.find(m => m.type === 'boss');
  if (boss) { boss.hp = boss.maxhp = G.diff.bossHp; }
  G.p.forEach((p, i) => {
    Object.assign(p, { x: G.lvl.spawn.x + i * 30, y: G.lvl.spawn.y, vx: 0, vy: 0, dead: false, respawn: 0, maxhp: Math.max(3, p.maxhp), inv: 1, kb: 0, atk: 0, star: 0 });
    p.hp = p.maxhp; unstick(p);
  });
  G.cam = 0;
  banner(n === 3 ? 'BOSS: THE GHOST MINER' : 'WORLD 1-' + n);
}
function banner(text, t = 2) { G.msg = { text, t }; }
function floatText(x, y, text, color = '#fff') { G.texts.push({ x, y, text, color, life: 1 }); }
function burst(x, y, color, n = 12, spd = 220, size = 4) {
  for (let i = 0; i < n && G.parts.length < MAX_PARTICLES; i++) {
    const a = rand(0, Math.PI * 2), s = rand(spd * 0.3, spd);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: rand(0.4, 0.9), color, size: rand(size * 0.6, size * 1.3) });
  }
}
const alive = () => G.p.filter(p => !p.dead);
function nearest(m) {
  let best = null, bd = Infinity;
  for (const p of G.p) { if (p.dead) continue; const d = Math.hypot(midX(p) - midX(m), midY(p) - midY(m)); if (d < bd) { bd = d; best = p; } }
  return best;
}

// ---------- player ----------
function headBump(p, ty) {
  let tx = Math.floor(midX(p) / T);
  if (!solidAt(tx, ty)) { const a = Math.floor(p.x / T); tx = solidAt(a, ty) ? a : Math.floor((p.x + p.w - 0.001) / T); }
  const c = tile(tx, ty);
  if (c === '?') { setTile(tx, ty, 'U'); blockItem(tx, ty); SFX.bump(); }
  else if (c === 'B') { setTile(tx, ty, '.'); debris(tx, ty, '#c4512c'); SFX.brk(); bonkAbove(tx, ty); }
  else SFX.bump();
}
function bonkAbove(tx, ty) {
  const zone = { x: tx * T, y: (ty - 1) * T, w: T, h: T };
  for (const m of G.lvl.mobs) if (!m.dead && m.type !== 'boss' && overlap(m, zone)) hurtMob(m, 2, 0);
}
function blockItem(tx, ty) {
  const r = Math.random(), x = tx * T + 6, y = ty * T - 22;
  if (r < 0.5) { G.coins++; SFX.coin(); floatText(tx * T + 16, ty * T - 10, '+1', '#ffd84a'); burst(tx * T + 16, ty * T, '#ffd84a', 6, 120, 3); }
  else { const kind = r < 0.7 ? 'mush' : r < 0.87 ? 'flower' : 'star'; G.lvl.items.push(makeItem(kind, x, y, false)); SFX.power(); }
}
function debris(tx, ty, color) { burst(tx * T + 16, ty * T + 16, color, 8, 260, 5); }

function updatePlayer(p, dt) {
  const k = CTRL[p.id];
  if (p.dead) {
    if (p.respawn > 0) { p.respawn -= dt; if (p.respawn <= 0) { if (G.lives > 0) { G.lives--; respawnPlayer(p); } else p.respawn = 0; } }
    return;
  }
  p.anim += dt; p.inv = Math.max(0, p.inv - dt); p.star = Math.max(0, p.star - dt);
  p.atkCd -= dt; p.fireCd -= dt; p.atk = Math.max(0, p.atk - dt);
  p.blocking = !!p.shield && held(k.s);
  const mv = (held(k.r) ? 1 : 0) - (held(k.l) ? 1 : 0);
  const speed = p.blocking ? 110 : 235;
  if (p.kb > 0) p.kb -= dt;
  else p.vx += (mv * speed - p.vx) * Math.min(1, dt * (p.onGround ? 14 : 7));
  if (mv && p.kb <= 0 && p.atk <= 0) p.face = mv;
  // jump with buffer + coyote time
  if (tapped(k.j)) p.jumpBuf = 0.12; else p.jumpBuf -= dt;
  p.coyote = p.onGround ? 0.1 : p.coyote - dt;
  if (p.jumpBuf > 0 && p.coyote > 0) { p.vy = -650; p.jumpBuf = 0; p.coyote = 0; SFX.jump(); }
  const g = (!held(k.j) && p.vy < 0) ? GRAV * 2.2 : GRAV;
  p.vy += g * dt;
  moveBody(p, dt);
  // attack
  if (tapped(k.a) && p.atkCd <= 0) { p.atk = 0.18; p.atkCd = 0.33; p.hitSet = new Set(); SFX.swing(); }
  if (p.atk > 0) swordHits(p);
  if (p.power === 'fire' && tapped(k.f) && p.fireCd <= 0) {
    p.fireCd = 0.45; SFX.fire();
    G.proj.push({ kind: 'fire', x: p.face > 0 ? p.x + p.w : p.x - 10, y: p.y + 8, w: 10, h: 10, vx: p.face * 430, vy: 0, life: 2.5, owner: p });
  }
  // coop: keep both players on screen
  if (alive().length > 1) { p.x = clamp(p.x, G.cam + 2, G.cam + W - p.w - 2); }
  p.x = clamp(p.x, 0.01, G.lvl.w * T - p.w - 0.01);
  if (p.y > ROWS * T + 60) killPlayer(p);
  // items
  for (const it of G.lvl.items) if (!it.taken && overlap(p, it)) pickup(p, it);
  // flag
  if (G.lvl.flagX > 0 && p.x + p.w > G.lvl.flagX && G.state === 'play') levelClear();
}
function swordHits(p) {
  const s = SWORDS[G.sword], box = { x: p.face > 0 ? p.x + p.w - 4 : p.x - s.reach + 4, y: p.y - 6, w: s.reach, h: p.h + 10 };
  for (const m of G.lvl.mobs) {
    if (m.dead || p.hitSet.has(m) || !overlap(box, m)) continue;
    if (m.type === 'boss' && m.fade > 0) continue;
    p.hitSet.add(m); hurtMob(m, s.dmg, p.face * 240);
  }
  for (const pr of G.proj) if (pr.kind !== 'fire' && overlap(box, pr)) { pr.life = 0; burst(midX(pr), midY(pr), '#ddd', 5, 120, 2); SFX.block(); }
}
function pickup(p, it) {
  if (it.kind === 'coin') { G.coins++; SFX.coin(); burst(midX(it), midY(it), '#ffd84a', 5, 100, 2); }
  else if (it.kind === 'shield') {
    const [a, b] = G.diff.wear, hp = 100 - (b > 0 ? irand(a, b) : 0);
    if (p.shield && p.shield.hp >= hp) return; // keep the better one, leave pickup for partner
    p.shield = { hp }; SFX.power(); floatText(midX(p), p.y - 10, 'SHIELD ' + hp + '%', '#9fd3ff');
  }
  else if (it.kind === 'mush') { p.maxhp = Math.min(5, p.maxhp + 1); p.hp = Math.min(p.maxhp, p.hp + 1); SFX.power(); floatText(midX(p), p.y - 10, '+HEART', '#ff6b6b'); }
  else if (it.kind === 'flower') { p.power = 'fire'; SFX.power(); floatText(midX(p), p.y - 10, 'FIRE!', '#ff9b3d'); }
  else if (it.kind === 'star') { p.star = 8; SFX.power(); floatText(midX(p), p.y - 10, 'STAR!', '#ffe94a'); }
  it.taken = true;
}
function hurtPlayer(p, amount, srcX, kbx, kby, kind) {
  if (p.dead || p.inv > 0 || p.star > 0) return false;
  const dir = Math.sign(midX(p) - srcX) || 1;
  if (p.blocking && p.shield) {
    p.shield.hp -= SHIELD_DMG[kind] || 20; p.vx = dir * kbx * 0.35; p.kb = 0.1; p.inv = 0.25;
    SFX.block(); burst(midX(p) + p.face * 12, midY(p), '#bfe3ff', 6, 140, 3);
    if (p.shield.hp <= 0) { p.shield = null; p.blocking = false; SFX.shieldBreak(); banner('SHIELD BROKE!', 1.2); burst(midX(p), midY(p), '#8a5a2b', 14, 240, 4); }
    return true;
  }
  p.hp -= amount; p.inv = 1.2; p.vx = dir * kbx; p.vy = -kby; p.kb = 0.28; G.shake = Math.max(G.shake, 0.15);
  SFX.hurt(); burst(midX(p), midY(p), '#ff4d4d', 8, 180, 3);
  if (p.hp <= 0) killPlayer(p);
  return true;
}
function killPlayer(p) {
  if (p.dead) return;
  p.dead = true; p.hp = 0; p.shield = null; p.power = null; p.star = 0; p.blocking = false; p.maxhp = 3;
  burst(midX(p), Math.min(midY(p), ROWS * T - 20), p.id ? '#3ddc5a' : '#ff3b3b', 20, 280, 5); SFX.die();
  p.respawn = 1.6;
}
function respawnPlayer(p) {
  // respawn next to a partner standing on solid ground; otherwise on the indestructible checkpoint/spawn pad
  const partner = G.p.find(q => q !== p && !q.dead && q.onGround);
  const spot = partner ? { x: partner.x, y: partner.y - 4 } : (G.cp ? { x: G.cp * T + 5, y: 15 * T - 31 } : { ...G.lvl.spawn });
  Object.assign(p, { x: spot.x, y: spot.y, vx: 0, vy: 0, dead: false, hp: 3, maxhp: 3, inv: 2, kb: 0 });
  unstick(p);
  burst(midX(p), midY(p), '#fff', 14, 160, 3);
}

// ---------- mobs ----------
function hurtMob(m, dmg, kbx) {
  if (m.dead) return;
  m.hp -= dmg; m.hurt = 0.2; SFX.hit();
  if (m.type !== 'boss') { m.vx = kbx; if (kbx) m.vy = -200; m.kb = 0.25; }
  burst(midX(m), midY(m), m.type === 'creeper' ? '#4caf50' : m.type === 'boss' ? '#b36bff' : '#ddd', 6, 160, 3);
  if (m.hp <= 0) killMob(m);
}
function killMob(m) {
  if (m.dead) return;
  m.dead = true;
  if (m.type === 'boss') { bossDefeated(m); return; }
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
  if (!m.active) { if (Math.abs(midX(m) - (G.cam + W / 2)) < W * 0.75) m.active = true; else return; }
  m.anim += dt; m.hurt = Math.max(0, m.hurt - dt); m.cd -= dt;
  if (m.type === 'boss') return updateBoss(m, dt);
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
  if (m.y > ROWS * T + 60) { m.dead = true; return; }
  // contact with players
  for (const p of G.p) {
    if (p.dead || !overlap(p, m) || m.dead) continue;
    if (p.vy > 60 && p.y + p.h - m.y < 16) { // stomp
      p.vy = -430; p.y = m.y - p.h - 0.5; SFX.bump();
      if (m.type === 'creeper') { if (m.fuse < 0) { m.fuse = 0.9; SFX.hiss(); } } else hurtMob(m, 2, 0);
      continue;
    }
    if (p.star > 0) { hurtMob(m, 99, 0); continue; }
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
    if (BREAKABLE.has(c)) { setTile(x, y, '.'); if (Math.random() < 0.5) debris(x, y, c === '#' ? '#8b5a2b' : '#c4512c'); }
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
    if (p.star > 0) { if (b.cd <= 0) { hurtMob(b, 2, 0); b.cd = 0.5; } } else hurtPlayer(p, 1, midX(b), 360, 300, 'boss');
  }
}
function bossDefeated(b) {
  for (let i = 0; i < 5; i++) burst(midX(b) + rand(-30, 30), midY(b) + rand(-30, 30), ['#b36bff', '#fff', '#ffd84a'][i % 3], 30, 400, 6);
  G.shake = 0.8; SFX.boom(); G.lvl.mobs.forEach(m => { if (m.type !== 'boss' && !m.dead) killMob(m); });
  G.proj = []; G.state = 'clear'; G.timer = 2.5; G.coins += 25; banner('GHOST MINER DEFEATED!', 2.5);
}

// ---------- projectiles & items ----------
function updateProj(dt) {
  for (const pr of G.proj) {
    pr.life -= dt;
    if (pr.kind === 'fire') {
      pr.vy += 1300 * dt; moveBody(pr, dt);
      if (pr.hitWall) pr.life = 0; if (pr.onGround) pr.vy = -360;
      for (const m of G.lvl.mobs) if (!m.dead && overlap(pr, m) && !(m.type === 'boss' && m.fade > 0)) { hurtMob(m, 2, Math.sign(pr.vx) * 200); pr.life = 0; break; }
      if (Math.random() < 0.5) G.parts.push({ x: midX(pr), y: midY(pr), vx: 0, vy: -30, life: 0.25, color: '#ff9b3d', size: 3 });
    } else {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (pr.kind === 'arrow' && solidAt(Math.floor(midX(pr) / T), Math.floor(midY(pr) / T))) pr.life = 0;
      for (const p of G.p) if (!p.dead && overlap(pr, p)) {
        const kb = pr.kind === 'arrow' ? 380 : 300;
        // arrows knock you back in the direction they travel (even mid-jump)
        if (hurtPlayer(p, 1, midX(p) - Math.sign(pr.vx || 1) * 10, kb, 220, pr.kind === 'arrow' ? 'arrow' : 'boss')) pr.life = 0;
      }
    }
    if (pr.x < G.cam - 200 || pr.x > G.cam + W + 200 || pr.y > H + 100 || pr.y < -200) pr.life = 0;
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
function levelClear() {
  if (G.state !== 'play') return;
  G.state = 'clear'; G.timer = 2.2; G.coins += 10; SFX.clear(); banner('LEVEL CLEAR! +10', 2.2);
}
const SHOP = [
  { id: 'sword', label: () => G.sword < 3 ? `UPGRADE SWORD -> ${SWORDS[G.sword + 1].n}` : 'SWORD MAXED', cost: () => G.sword < 3 ? SWORDS[G.sword + 1].cost : null },
  { id: 'heal', label: () => 'MEGA HEART (+1 MAX HEART, BOTH)', cost: () => 10 },
  { id: 'life', label: () => 'EXTRA LIFE', cost: () => 15 },
  { id: 'go', label: () => 'CONTINUE ->', cost: () => 0 },
];
function buy(i) {
  const o = SHOP[i], c = o.cost();
  if (o.id === 'go') { loadLevel(G.level + 1); G.state = 'play'; return; }
  if (c == null || G.coins < c) { SFX.deny(); return; }
  if (o.id === 'heal' && G.p.every(p => p.maxhp >= 5)) { SFX.deny(); return; }
  G.coins -= c; SFX.buy();
  if (o.id === 'sword') G.sword++;
  else if (o.id === 'heal') G.p.forEach(p => { p.maxhp = Math.min(5, p.maxhp + 1); p.hp = p.maxhp; });
  else if (o.id === 'life') G.lives++;
}

function update(dt) {
  if (hit1('KeyM')) { muted = !muted; store.set('bb_muted', muted); }
  if (G.msg) { G.msg.t -= dt; if (G.msg.t <= 0) G.msg = null; }
  if (G.state === 'title') {
    if (hit1('Digit1', 'Numpad1')) G.players = 1;
    if (hit1('Digit2', 'Numpad2')) G.players = 2;
    if (hit1('ArrowLeft', 'KeyA')) G.diffIdx = (G.diffIdx + 2) % 3;
    if (hit1('ArrowRight', 'KeyD')) G.diffIdx = (G.diffIdx + 1) % 3;
    if (hit1('Enter', 'Space', 'NumpadEnter')) newGame();
    return;
  }
  if (G.state === 'pause') { if (hit1('KeyP', 'Escape')) G.state = 'play'; if (hit1('KeyQ')) G.state = 'title'; return; }
  if (G.state === 'shop') {
    if (hit1('ArrowUp', 'KeyW')) G.shopSel = (G.shopSel + SHOP.length - 1) % SHOP.length;
    if (hit1('ArrowDown', 'KeyS')) G.shopSel = (G.shopSel + 1) % SHOP.length;
    for (let i = 0; i < SHOP.length; i++) if (hit1('Digit' + (i + 1))) { G.shopSel = i; buy(i); return; }
    if (hit1('Enter', 'Space')) buy(G.shopSel);
    return;
  }
  if (G.state === 'over' || G.state === 'win') { if (hit1('Enter', 'Space')) G.state = 'title'; return; }
  if (G.state === 'play' && hit1('KeyP', 'Escape')) { G.state = 'pause'; return; }

  // play / clear both simulate the world so the celebration looks alive
  if (G.state === 'play') G.time += dt;
  for (const p of G.p) updatePlayer(p, dt);
  for (const m of G.lvl.mobs) if (!m.dead) updateMob(m, dt);
  G.lvl.mobs = G.lvl.mobs.filter(m => !m.dead);
  updateProj(dt); updateItems(dt);
  for (const pt of G.parts) { pt.life -= dt; pt.vy += 900 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const t of G.texts) { t.life -= dt; t.y -= 40 * dt; }
  G.texts = G.texts.filter(t => t.life > 0);
  G.shake = Math.max(0, G.shake - dt);
  // checkpoint
  if (!G.cp && G.lvl.n !== 3 && alive().some(p => p.x / T > G.lvl.cpCol)) { G.cp = G.lvl.cpCol; banner('CHECKPOINT', 1.2); SFX.coin(); }
  // camera follows the players' midpoint
  const live = alive(), focus = live.length ? live : G.p;
  const tx = focus.reduce((s, p) => s + midX(p), 0) / focus.length - W / 2 + 60;
  G.cam += (clamp(tx, 0, G.lvl.w * T - W) - G.cam) * Math.min(1, dt * 6);
  G.cam = clamp(G.cam, 0, Math.max(0, G.lvl.w * T - W));
  // flow
  if (G.state === 'clear') {
    G.timer -= dt;
    if (G.timer <= 0) {
      if (G.level >= 3) { G.state = 'win'; if (G.best == null || G.time < G.best) { G.best = G.time; store.set('bb_best', G.best); } }
      else { G.state = 'shop'; G.shopSel = 0; }
    }
  } else if (G.p.every(p => p.dead) && G.lives <= 0 && G.p.every(p => p.respawn <= 0)) {
    G.overT += dt; if (G.overT > 1.2) G.state = 'over';
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
  } else if (c === 'T') {
    px(0, 0, T, T, '#2f9e44'); px(4, 0, 6, T, '#69db7c'); px(T - 6, 0, 4, T, '#1b6e2e');
  }
  return o;
}
const tileImg = c => tileCache[c] || (tileCache[c] = makeTile(c));

function rect(x, y, w, h, c) { cx.fillStyle = c; cx.fillRect(Math.round(x), Math.round(y), w, h); }
function drawHero(p, x, y) {
  const cap = p.id ? '#2fbf4a' : '#e53935', f = p.face, walk = Math.abs(p.vx) > 20 && p.onGround ? Math.floor(p.anim * 12) % 2 : 0;
  if (p.inv > 0 && Math.floor(p.inv * 20) % 2) return;
  rect(x + 3, y, 16, 6, cap); rect(f > 0 ? x + 12 : x, y + 4, 10, 3, cap);
  rect(x + 4, y + 6, 14, 8, '#ffcc99'); rect(f > 0 ? x + 13 : x + 7, y + 8, 2, 3, '#222');
  rect(f > 0 ? x + 4 : x + 16, y + 6, 2, 5, '#6b3a1a');
  rect(x + 3, y + 14, 16, 6, cap); rect(x + 5, y + 16, 12, 9, '#1e4fd6');
  rect(x + 6, y + 17, 2, 2, '#ffd84a'); rect(x + 14, y + 17, 2, 2, '#ffd84a');
  rect(x + 1, y + 16, 3, 5, '#ffcc99'); rect(x + 18, y + 16, 3, 5, '#ffcc99');
  rect(x + 5, y + 25 - walk, 5, 3, '#1e4fd6'); rect(x + 12, y + 25 - (1 - walk), 5, 3, '#1e4fd6');
  rect(x + 4, y + 28 - walk, 6, 2, '#5a3510'); rect(x + 12, y + 28 - (1 - walk), 6, 2, '#5a3510');
  if (p.star > 0) { cx.globalAlpha = 0.45; rect(x, y, p.w, p.h, `hsl(${(p.anim * 720) % 360},100%,60%)`); cx.globalAlpha = 1; }
  if (p.power === 'fire') rect(x + 3, y, 16, 2, '#ff9b3d');
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
  if (G.players === 2) { cx.fillStyle = cap; cx.font = 'bold 10px monospace'; cx.textAlign = 'center'; cx.fillText('P' + (p.id + 1), x + 11, y - 6); }
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
  }
  if (m.hurt > 0) { cx.globalAlpha = 0.6; rect(x, y, m.w, m.h, '#ff3b3b'); cx.globalAlpha = 1; }
}
function drawItem(it, x, y) {
  const bob = Math.sin(it.t * 4 + it.x) * 2;
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
  const night = G.lvl && G.lvl.n === 3;
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
  if (L.n !== 3) { // checkpoint beacon
    const bx = L.cpCol * T + 12, lit = G.cp != null;
    rect(bx, 12 * T, 6, 3 * T, '#6b4a2a'); rect(bx - 5, 12 * T - 14, 16, 14, lit ? '#ffd84a' : '#777');
    if (lit) { cx.globalAlpha = 0.3 + 0.2 * Math.sin(performance.now() / 150); rect(bx - 9, 12 * T - 18, 24, 22, '#fff6a0'); cx.globalAlpha = 1; }
  }
  for (const it of L.items) drawItem(it, it.x, it.y);
  for (const m of L.mobs) if (m.x > G.cam - 60 && m.x < G.cam + W + 60) drawMob(m, m.x, m.y);
  for (const p of G.p) if (!p.dead) drawHero(p, p.x, p.y);
  for (const pr of G.proj) {
    if (pr.kind === 'arrow') { cx.save(); cx.translate(midX(pr), midY(pr)); cx.rotate(Math.atan2(pr.vy, pr.vx)); rect(-7, -1, 14, 2, '#d8c8a8'); rect(5, -2, 3, 4, '#aaa'); rect(-8, -2, 3, 4, '#fff'); cx.restore(); }
    else if (pr.kind === 'fire') { rect(pr.x, pr.y, 10, 10, '#ff6b1a'); rect(pr.x + 2, pr.y + 2, 6, 6, '#ffe94a'); }
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
    text(p.id ? 'P2 GREEN' : 'P1 RED', bx, 16, 12, p.id ? '#5ef07a' : '#ff6b6b');
    if (p.dead) { text(p.respawn > 0 ? 'RESPAWNING...' : 'OUT', bx, 36, 14, '#aaa'); return; }
    for (let h = 0; h < p.maxhp; h++) heart(bx + h * 16, 22, h < p.hp);
    let ix = bx + p.maxhp * 16 + 8;
    if (p.shield) { rect(ix, 24, 40, 8, '#333'); rect(ix, 24, 40 * p.shield.hp / 100, 8, p.shield.hp > 50 ? '#9fd3ff' : p.shield.hp > 25 ? '#ffd84a' : '#ff6b6b'); text('SHLD', ix, 20, 9, '#9fd3ff'); ix += 46; }
    if (p.power === 'fire') { text('FIRE', ix, 34, 11, '#ff9b3d'); ix += 34; }
    if (p.star > 0) text('STAR ' + Math.ceil(p.star), ix, 34, 11, '#ffe94a');
  });
  const cxm = W / 2;
  text(`WORLD 1-${G.level}  ${G.diff.name}`, cxm, 16, 12, '#fff', 'center');
  text(`COINS ${G.coins}   LIVES ${G.lives}   SWORD ${SWORDS[G.sword].n}   ${fmtTime(G.time)}`, cxm, 36, 13, '#ffd84a', 'center');
  const boss = G.lvl.mobs.find(m => m.type === 'boss');
  if (boss) { rect(cxm - 200, 56, 400, 12, '#222'); rect(cxm - 200, 56, 400 * Math.max(0, boss.hp) / boss.maxhp, 12, '#b36bff'); text('GHOST MINER', cxm, 84, 12, '#d7b3ff', 'center'); }
  if (G.msg) { const a = Math.min(1, G.msg.t * 2); cx.globalAlpha = a; text(G.msg.text, cxm, 170, 34, '#fff', 'center'); cx.globalAlpha = 1; }
  text(muted ? 'M: SOUND OFF' : 'M: SOUND ON', W - 12, H - 10, 10, '#ddd', 'right');
  text('P: PAUSE', 12, H - 10, 10, '#ddd');
}
const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function panel(x, y, w, h) { rect(x, y, w, h, 'rgba(10,10,30,.88)'); cx.strokeStyle = '#ffd84a'; cx.lineWidth = 3; cx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); }
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
  panel(W / 2 - 250, 195, 500, 240);
  text(`PLAYERS:  ${G.players === 1 ? '[1]  2 ' : ' 1  [2]'}   (press 1 / 2)`, W / 2, 232, 16, '#fff', 'center');
  text(`DIFFICULTY:  < ${DIFF[DKEYS[G.diffIdx]].name} >   (left / right)`, W / 2, 262, 16, '#fff', 'center');
  text('P1: A/D move  W/Space jump  F sword  S shield  G fire', W / 2, 300, 12, '#ff9a9a', 'center');
  text('P2: arrows move  Up jump  Enter sword  Down shield  RShift fire', W / 2, 322, 12, '#9af0a9', 'center');
  text('Stomp mobs, buy swords with coins, find rare shields.', W / 2, 350, 12, '#ddd', 'center');
  text('Creepers blow up 6 blocks — even if you are above them!', W / 2, 370, 12, '#ddd', 'center');
  if (G.best != null) text('BEST TIME ' + fmtTime(G.best), W / 2, 398, 12, '#ffd84a', 'center');
  if (Math.floor(t * 2) % 2) text('PRESS ENTER TO START', W / 2, 424, 18, '#fff', 'center');
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
  drawBackground(); drawWorld(); drawHUD();
  if (G.state === 'pause') { panel(W / 2 - 180, 200, 360, 130); text('PAUSED', W / 2, 250, 32, '#ffd84a', 'center'); text('P / Esc resume   Q quit', W / 2, 295, 14, '#fff', 'center'); }
  if (G.state === 'shop') drawShop();
  if (G.state === 'over') { panel(W / 2 - 220, 190, 440, 150); text('GAME OVER', W / 2, 245, 40, '#ff3b3b', 'center'); text('Press Enter for title', W / 2, 300, 14, '#fff', 'center'); }
  if (G.state === 'win') {
    panel(W / 2 - 260, 170, 520, 200); text('YOU WIN!', W / 2, 225, 44, '#ffd84a', 'center');
    text(`TIME ${fmtTime(G.time)}   COINS ${G.coins}   ${G.diff.name}`, W / 2, 270, 16, '#fff', 'center');
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
