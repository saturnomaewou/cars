/* =========================================================================
   Drift City — Jogo completo
   ========================================================================= */
   'use strict';

   (function () {
     const TAU = Math.PI * 2;
     const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
     const rnd = (a, b) => a + Math.random() * (b - a);
   
     function roundRect(c, x, y, w, h, r) {
       c.beginPath();
       c.moveTo(x + r, y);
       c.lineTo(x + w - r, y);
       c.quadraticCurveTo(x + w, y, x + w, y + r);
       c.lineTo(x + w, y + h - r);
       c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
       c.lineTo(x + r, y + h);
       c.quadraticCurveTo(x, y + h, x, y + h - r);
       c.lineTo(x, y + r);
       c.quadraticCurveTo(x, y, x + r, y);
       c.closePath();
     }
     function shade(hex, amt) {
       const c = hex.replace('#', '');
       const r = clamp(parseInt(c.slice(0, 2), 16) + amt, 0, 255);
       const g = clamp(parseInt(c.slice(2, 4), 16) + amt, 0, 255);
       const b = clamp(parseInt(c.slice(4, 6), 16) + amt, 0, 255);
       return `rgb(${r},${g},${b})`;
     }
   
     /* ---------- Mundo ---------- */
     const WORLD = { w: 2600, h: 1900 };
     const SHW = 52;
   
     /* ---------- Gameplay ---------- */
     const RACE_DURATION = 150;
     const COUNTDOWN = 3.6;
     const DRIFT_MIN_SLIP = 62;
     const DRIFT_MIN_SPEED = 140;
     const DRIFT_BANK_TIMEOUT = 0.45;
     const COMBO_STEP = 1.15;
     const WALL_HIT_THRESHOLD = 55;
     const WALL_HIT_PENALTY = 150;
   
     /* ---------- Carros ---------- */
     const CARS = [
       { name: 'FALCÃO GT',  color: '#e63946', maxSpeed: 560, accel: 640, turn: 2.95, grip: 8.2, brake: 840 },
       { name: 'VORTEX RS',  color: '#2a9d8f', maxSpeed: 680, accel: 570, turn: 2.45, grip: 6.6, brake: 770 },
       { name: 'TROVÃO V8',  color: '#f4a261', maxSpeed: 595, accel: 800, turn: 2.40, grip: 7.0, brake: 810 },
       { name: 'NITRO X',    color: '#7b2cbf', maxSpeed: 520, accel: 860, turn: 3.20, grip: 8.8, brake: 910 },
       { name: 'DRIFT KING', color: '#eab308', maxSpeed: 545, accel: 610, turn: 3.35, grip: 5.8, brake: 890 },
       { name: 'FÊNIX EV',   color: '#2563eb', maxSpeed: 620, accel: 820, turn: 2.78, grip: 9.4, brake: 870 },
     ];
   
     /* ---------- Dificuldades ---------- */
     const DIFFS = [
       { name: 'NOVATO',       grip: 1.30, maxSpeed: 0.86, accel: 0.88, aiCount: 2, aiSkill: 0.62, scoreMult: 1.0 },
       { name: 'AMADOR',       grip: 1.15, maxSpeed: 0.94, accel: 0.95, aiCount: 3, aiSkill: 0.74, scoreMult: 1.3 },
       { name: 'PROFISSIONAL', grip: 1.00, maxSpeed: 1.00, accel: 1.00, aiCount: 4, aiSkill: 0.85, scoreMult: 1.7 },
       { name: 'MESTRE',       grip: 0.90, maxSpeed: 1.09, accel: 1.07, aiCount: 5, aiSkill: 0.93, scoreMult: 2.2 },
       { name: 'LENDA',        grip: 0.80, maxSpeed: 1.18, accel: 1.14, aiCount: 6, aiSkill: 1.00, scoreMult: 3.0 },
     ];
   
     /* ---------- Prédios ---------- */
     const BUILDINGS = [
       { x: 520,  y: 420,  w: 1560, h: 1060 },
       { x: 800,  y: 210,  w: 340,  h: 210  },
       { x: 1460, y: 1480, w: 340,  h: 210  },
     ];
   
     /* ---------- Waypoints (circuito horário) ---------- */
     const WAYPOINTS = [
       { x: 500,  y: 1760 }, { x: 1200, y: 1780 }, { x: 1630, y: 1760 },
       { x: 2100, y: 1750 }, { x: 2400, y: 1500 }, { x: 2400, y: 900  },
       { x: 2400, y: 350  }, { x: 2100, y: 130  }, { x: 1500, y: 130  },
       { x: 950,  y: 130  }, { x: 600,  y: 130  }, { x: 250,  y: 400  },
       { x: 250,  y: 900  }, { x: 250,  y: 1400 }, { x: 250,  y: 1750 },
     ];
   
     /* ---------- Grid de largada ---------- */
     const START_GRID = [
       { x: 200, y: 1700 }, { x: 200, y: 1780 },
       { x: 280, y: 1720 }, { x: 280, y: 1800 },
       { x: 360, y: 1680 }, { x: 360, y: 1760 },
       { x: 440, y: 1700 }, { x: 440, y: 1780 },
     ];
   
     /* ---------- Estado global ---------- */
     const state = {
       screen: 'menu',
       mode: 1,
       difficulty: 0,
       p1Car: 0,
       p2Car: 1,
       racers: [],
       particles: [],
       floaters: [],
       time: 0,
       raceTime: RACE_DURATION,
       countdown: 0,
       paused: false,
       shake: 0,
       diff: DIFFS[0],
       lastT: 0,
     };
     window.state = state;
   
     /* ---------- Canvas ---------- */
     const canvas = document.getElementById('game-canvas');
     const ctx = canvas.getContext('2d');
     let W = 0, H = 0, DPR = 1;
   
     function resize() {
       DPR = Math.min(2, window.devicePixelRatio || 1);
       W = canvas.clientWidth || window.innerWidth;
       H = canvas.clientHeight || window.innerHeight;
       canvas.width = Math.floor(W * DPR);
       canvas.height = Math.floor(H * DPR);
       ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
     }
     window.addEventListener('resize', resize);
     window.addEventListener('orientationchange', () => setTimeout(resize, 150));
   
     /* ---------- Pré-renderização do mundo ---------- */
     let worldCanvas, minimapCanvas;
   
     function buildWorld() {
       worldCanvas = document.createElement('canvas');
       worldCanvas.width = WORLD.w;
       worldCanvas.height = WORLD.h;
       const w = worldCanvas.getContext('2d');
   
       // Asfalto
       w.fillStyle = '#2a2d35';
       w.fillRect(0, 0, WORLD.w, WORLD.h);
   
       // Grão
       for (let i = 0; i < 9000; i++) {
         const x = Math.random() * WORLD.w, y = Math.random() * WORLD.h;
         w.fillStyle = `rgba(${rnd(38,58)|0},${rnd(40,60)|0},${rnd(50,70)|0},0.55)`;
         w.fillRect(x, y, 2, 2);
       }
   
       // Manchas
       for (let i = 0; i < 30; i++) {
         const x = Math.random() * WORLD.w, y = Math.random() * WORLD.h;
         const r = rnd(8, 26);
         w.fillStyle = `rgba(10,12,18,${rnd(0.15, 0.35)})`;
         w.beginPath(); w.arc(x, y, r, 0, TAU); w.fill();
       }
   
       // Bordas tracejadas
       w.strokeStyle = 'rgba(240, 240, 240, 0.28)';
       w.lineWidth = 3;
       w.setLineDash([26, 22]);
       w.strokeRect(SHW, SHW, WORLD.w - SHW * 2, WORLD.h - SHW * 2);
       for (const b of BUILDINGS) {
         w.strokeRect(b.x - SHW, b.y - SHW, b.w + SHW * 2, b.h + SHW * 2);
       }
       w.setLineDash([]);
   
       // Faixas centrais
       w.strokeStyle = 'rgba(240, 220, 100, 0.55)';
       w.lineWidth = 3;
       w.setLineDash([32, 22]);
       w.beginPath();
       w.moveTo(260, 0); w.lineTo(260, WORLD.h);
       w.moveTo(2340, 0); w.lineTo(2340, WORLD.h);
       w.moveTo(0, 210); w.lineTo(WORLD.w, 210);
       w.moveTo(0, 1690); w.lineTo(WORLD.w, 1690);
       w.stroke();
       w.setLineDash([]);
   
       // Prédios
       BUILDINGS.forEach(b => {
         w.fillStyle = '#4a4d58';
         w.fillRect(b.x - SHW, b.y - SHW, b.w + SHW * 2, b.h + SHW * 2);
   
         w.fillStyle = 'rgba(0,0,0,0.45)';
         w.fillRect(b.x + 8, b.y + 8, b.w, b.h);
   
         w.fillStyle = '#3a3d48';
         w.fillRect(b.x, b.y, b.w, b.h);
   
         w.fillStyle = '#4d5060';
         w.fillRect(b.x, b.y, b.w, 6);
   
         const winW = 22, winH = 30, gap = 14;
         for (let wx = b.x + gap; wx < b.x + b.w - winW; wx += winW + gap) {
           for (let wy = b.y + 18; wy < b.y + b.h - winH; wy += winH + gap) {
             const on = Math.random() < 0.65;
             if (on) w.fillStyle = Math.random() < 0.5 ? '#f5d76e' : '#7dd3fc';
             else w.fillStyle = '#22252c';
             w.fillRect(wx, wy, winW, winH);
           }
         }
       });
   
       // Árvores
       [[90, 90], [2510, 90], [90, 1810], [2510, 1810], [1300, 40], [1300, 1860]]
         .forEach(([tx, ty]) => {
           w.fillStyle = 'rgba(0,0,0,0.35)';
           w.beginPath(); w.arc(tx + 4, ty + 4, 26, 0, TAU); w.fill();
           w.fillStyle = '#2d4a2d';
           w.beginPath(); w.arc(tx, ty, 26, 0, TAU); w.fill();
           w.fillStyle = '#3d6a3d';
           w.beginPath(); w.arc(tx - 6, ty - 6, 16, 0, TAU); w.fill();
         });
   
       // Minimapa
       minimapCanvas = document.createElement('canvas');
       minimapCanvas.width = 220;
       minimapCanvas.height = Math.round(220 * WORLD.h / WORLD.w);
       minimapCanvas.getContext('2d').drawImage(worldCanvas, 0, 0, minimapCanvas.width, minimapCanvas.height);
     }
   
     /* ---------- Desenho do carro ---------- */
     function drawCarShape(c, r) {
       c.save();
       c.translate(r.x, r.y);
       c.rotate(r.angle);
   
       // Sombra
       c.fillStyle = 'rgba(0,0,0,0.45)';
       c.beginPath();
       c.ellipse(2, 4, 28, 18, 0, 0, TAU);
       c.fill();
   
       // Corpo
       c.fillStyle = r.color;
       roundRect(c, -28, -15, 56, 30, 7);
       c.fill();
   
       // Teto
       c.fillStyle = shade(r.color, -30);
       roundRect(c, -16, -11, 24, 22, 5);
       c.fill();
   
       // Para-brisa
       c.fillStyle = 'rgba(180, 220, 255, 0.6)';
       roundRect(c, 8, -10, 10, 20, 3);
       c.fill();
   
       // Traseira
       c.fillStyle = 'rgba(120, 160, 200, 0.4)';
       roundRect(c, -22, -9, 6, 18, 2);
       c.fill();
   
       // Faróis
       c.fillStyle = '#fff9d6';
       c.beginPath();
       c.ellipse(26, -8, 4, 3, 0, 0, TAU);
       c.ellipse(26, 8, 4, 3, 0, 0, TAU);
       c.fill();
   
       // Lanternas
       c.fillStyle = r.input.brake ? '#ff2a2a' : '#a81a1a';
       c.fillRect(-28, -13, 3, 6);
       c.fillRect(-28, 7, 3, 6);
   
       if (r.input.brake) {
         c.fillStyle = 'rgba(255,60,60,0.4)';
         c.beginPath();
         c.arc(-28, -10, 8, 0, TAU);
         c.arc(-28, 10, 8, 0, TAU);
         c.fill();
       }
   
       c.restore();
     }
   
     /* ---------- Entrada por teclado ---------- */
     const keys = {};
     window.addEventListener('keydown', e => {
       keys[e.key.toLowerCase()] = true;
       if (e.key === 'p' || e.key === 'P') togglePause();
     });
     window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
   
     function readKeyboard() {
       return {
         p1: {
           throttle: keys['w'] ? 1 : 0,
           brake: keys['s'] ? 1 : 0,
           steer: (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0),
           handbrake: keys[' '] ? 1 : 0,
         },
         p2: {
           throttle: keys['arrowup'] ? 1 : 0,
           brake: keys['arrowdown'] ? 1 : 0,
           steer: (keys['arrowright'] ? 1 : 0) - (keys['arrowleft'] ? 1 : 0),
           handbrake: (keys['shift'] || keys['/']) ? 1 : 0,
         },
       };
     }
   
     /* ---------- Criação de piloto ---------- */
     function makeRacer(opts) {
       return {
         model: opts.model,
         name: opts.name,
         color: opts.color,
         playerIndex: opts.playerIndex,
         isAI: opts.isAI,
         skill: opts.skill || 1,
         maxSpeed: opts.model.maxSpeed * state.diff.maxSpeed,
         accel: opts.model.accel * state.diff.accel,
         turn: opts.model.turn,
         grip: opts.model.grip,
         brake: opts.model.brake,
         x: 0, y: 0, angle: 0,
         vx: 0, vy: 0,
         speed: 0, slip: 0, vLong: 0, vLat: 0,
         input: { throttle: 0, brake: 0, steer: 0, handbrake: 0 },
         score: 0, driftBank: 0, combo: 1, driftTimer: 0,
         bestDrift: 0, lastDriftTime: 0,
         wallHits: 0, hitCooldown: 0, shoulderTimer: 0,
         onShoulder: false,
         wpIndex: 0, stuckTimer: 0,
       };
     }
   
     function placeRacer(r, index) {
       const g = START_GRID[index % START_GRID.length];
       r.x = g.x;
       r.y = g.y;
       r.angle = 0;
     }
   
     /* ---------- Física ---------- */
     function physics(r, dt) {
       const inp = r.input;
       const cos = Math.cos(r.angle), sin = Math.sin(r.angle);
       let vLong = r.vx * cos + r.vy * sin;
       let vLat = -r.vx * sin + r.vy * cos;
       const speed = Math.hypot(r.vx, r.vy);
   
       const auth = clamp(speed / 70, 0, 1) * (1 - clamp(speed / (r.maxSpeed * 2.55), 0, 0.62));
       r.angle += r.turn * auth * inp.steer * dt;
   
       let grip = r.grip * state.diff.grip;
       if (inp.handbrake) grip *= 0.16;
       if (inp.throttle && speed > r.maxSpeed * 0.7) grip *= 0.62;
       if (r.onShoulder) grip *= 0.55;
       vLat *= Math.exp(-grip * dt);
   
       if (inp.throttle) vLong += r.accel * dt;
       if (inp.brake) {
         if (vLong > 0) vLong = Math.max(0, vLong - r.brake * dt);
         else vLong -= r.accel * 0.5 * dt;
       }
       vLong *= (1 - 0.55 * dt);
       vLong = clamp(vLong, -r.maxSpeed * 0.3, r.maxSpeed);
   
       const c2 = Math.cos(r.angle), s2 = Math.sin(r.angle);
       r.vx = vLong * c2 - vLat * s2;
       r.vy = vLong * s2 + vLat * c2;
   
       r.x += r.vx * dt;
       r.y += r.vy * dt;
   
       r.speed = Math.hypot(r.vx, r.vy);
       r.slip = Math.abs(vLat);
       r.vLong = vLong;
       r.vLat = vLat;
   
       // Acostamento
       r.onShoulder = false;
       const m = 28;
       if (r.x < SHW + m || r.x > WORLD.w - SHW - m ||
           r.y < SHW + m || r.y > WORLD.h - SHW - m) r.onShoulder = true;
       for (const b of BUILDINGS) {
         const nx = clamp(r.x, b.x, b.x + b.w);
         const ny = clamp(r.y, b.y, b.y + b.h);
         if (Math.hypot(r.x - nx, r.y - ny) < m + 10) { r.onShoulder = true; break; }
       }
     }
   
     function pushRacer(r, dx, dy) {
       r.x += dx;
       r.y += dy;
       const imp = Math.hypot(r.vx, r.vy);
       if (imp > WALL_HIT_THRESHOLD && r.hitCooldown <= 0) {
         r.wallHits++;
         r.score = Math.max(0, r.score - WALL_HIT_PENALTY);
         r.combo = 1;
         r.driftBank = 0;
         r.driftTimer = 0;
         r.hitCooldown = 0.5;
         state.shake = 8;
         spawnSparks(r.x, r.y, 14);
       }
       const d = Math.hypot(dx, dy);
       if (d > 0) {
         const ux = dx / d, uy = dy / d;
         const dot = r.vx * ux + r.vy * uy;
         if (dot < 0) { r.vx -= ux * dot * 1.4; r.vy -= uy * dot * 1.4; }
       }
     }
   
     function collideRacer(r) {
       const rad = 22;
       const cos = Math.cos(r.angle), sin = Math.sin(r.angle);
       for (const off of [22, 0, -22]) {
         const cx = r.x + cos * off;
         const cy = r.y + sin * off;
         if (cx - rad < SHW)             pushRacer(r, SHW - (cx - rad), 0);
         if (cx + rad > WORLD.w - SHW)   pushRacer(r, -((cx + rad) - (WORLD.w - SHW)), 0);
         if (cy - rad < SHW)             pushRacer(r, 0, SHW - (cy - rad));
         if (cy + rad > WORLD.h - SHW)   pushRacer(r, 0, -((cy + rad) - (WORLD.h - SHW)));
         for (const b of BUILDINGS) {
           const nx = clamp(cx, b.x, b.x + b.w);
           const ny = clamp(cy, b.y, b.y + b.h);
           const dx = cx - nx, dy = cy - ny;
           const d = Math.hypot(dx, dy);
           if (d < rad) {
             const amt = rad - d;
             const ux = d > 0 ? dx / d : 0;
             const uy = d > 0 ? dy / d : 1;
             pushRacer(r, ux * amt, uy * amt);
           }
         }
       }
     }
   
     function carCollide(a, b) {
       const dx = b.x - a.x, dy = b.y - a.y;
       const d = Math.hypot(dx, dy);
       const min = 44;
       if (d < min && d > 0.1) {
         const ov = (min - d) / 2;
         const nx = dx / d, ny = dy / d;
         a.x -= nx * ov; a.y -= ny * ov;
         b.x += nx * ov; b.y += ny * ov;
         const va = a.vx * nx + a.vy * ny;
         const vb = b.vx * nx + b.vy * ny;
         const iv = va - vb;
         if (iv > 0) {
           a.vx -= nx * iv * 0.5; a.vy -= ny * iv * 0.5;
           b.vx += nx * iv * 0.5; b.vy += ny * iv * 0.5;
         }
       }
     }
   
     /* ---------- Pontuação ---------- */
     function updateDriftScore(r, dt) {
       r.hitCooldown = Math.max(0, r.hitCooldown - dt);
   
       const drifting = r.slip > DRIFT_MIN_SLIP && r.speed > DRIFT_MIN_SPEED && !r.onShoulder;
   
       if (drifting) {
         r.driftTimer += dt;
         r.combo = Math.min(9, 1 + Math.floor(r.driftTimer / COMBO_STEP));
         const slipAngle = Math.atan2(Math.abs(r.vLat), Math.abs(r.vLong) + 1);
         const quality = clamp(1 - Math.abs(slipAngle - 0.62) / 0.95, 0.15, 1);
         r.driftBank += r.slip * r.combo * quality * 0.30 * state.diff.scoreMult * dt;
         r.lastDriftTime = 0;
       } else {
         r.lastDriftTime = (r.lastDriftTime || 0) + dt;
         if (r.lastDriftTime > DRIFT_BANK_TIMEO