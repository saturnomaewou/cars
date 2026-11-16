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
   
     const CARS = [
       { name: 'FALCÃO GT',  color: '#e63946', maxSpeed: 560, accel: 640, turn: 2.95, grip: 8.2, brake: 840 },
       { name: 'VORTEX RS',  color: '#2a9d8f', maxSpeed: 680, accel: 570, turn: 2.45, grip: 6.6, brake: 770 },
       { name: 'TROVÃO V8',  color: '#f4a261', maxSpeed: 595, accel: 800, turn: 2.40, grip: 7.0, brake: 810 },
       { name: 'NITRO X',    color: '#7b2cbf', maxSpeed: 520, accel: 860, turn: 3.20, grip: 8.8, brake: 910 },
       { name: 'DRIFT KING', color: '#eab308', maxSpeed: 545, accel: 610, turn: 3.35, grip: 5.8, brake: 890 },
       { name: 'FÊNIX EV',   color: '#2563eb', maxSpeed: 620, accel: 820, turn: 2.78, grip: 9.4, brake: 870 },
     ];
   
     const DIFFS = [
       { name: 'NOVATO',       grip: 1.30, maxSpeed: 0.86, accel: 0.88, aiCount: 2, aiSkill: 0.62, scoreMult: 1.0 },
       { name: 'AMADOR',       grip: 1.15, maxSpeed: 0.94, accel: 0.95, aiCount: 3, aiSkill: 0.74, scoreMult: 1.3 },
       { name: 'PROFISSIONAL', grip: 1.00, maxSpeed: 1.00, accel: 1.00, aiCount: 4, aiSkill: 0.85, scoreMult: 1.7 },
       { name: 'MESTRE',       grip: 0.90, maxSpeed: 1.09, accel: 1.07, aiCount: 5, aiSkill: 0.93, scoreMult: 2.2 },
       { name: 'LENDA',        grip: 0.80, maxSpeed: 1.18, accel: 1.14, aiCount: 6, aiSkill: 1.00, scoreMult: 3.0 },
     ];
   
     const BUILDINGS = [
       { x: 520,  y: 420,  w: 1560, h: 1060 },
       { x: 800,  y: 210,  w: 340,  h: 210  },
       { x: 1460, y: 1480, w: 340,  h: 210  },
     ];
   
     const WAYPOINTS = [
       { x: 500,  y: 1760 }, { x: 1200, y: 1780 }, { x: 1630, y: 1760 },
       { x: 2100, y: 1750 }, { x: 2400, y: 1500 }, { x: 2400, y: 900  },
       { x: 2400, y: 350  }, { x: 2100, y: 130  }, { x: 1500, y: 130  },
       { x: 950,  y: 130  }, { x: 600,  y: 130  }, { x: 250,  y: 400  },
       { x: 250,  y: 900  }, { x: 250,  y: 1400 }, { x: 250,  y: 1750 },
     ];
   
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
       lastT: performance.now(),
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
       if (W === 0 || H === 0) return;
       canvas.width = Math.floor(W * DPR);
       canvas.height = Math.floor(H * DPR);
       ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
     }
     window.addEventListener('resize', resize);
     window.addEventListener('orientationchange', () => setTimeout(resize, 150));
   
     /* ---------- Mundo pré-renderizado ---------- */
     let worldCanvas, minimapCanvas;
   
     function buildWorld() {
       worldCanvas = document.createElement('canvas');
       worldCanvas.width = WORLD.w;
       worldCanvas.height = WORLD.h;
       const w = worldCanvas.getContext('2d');
   
       w.fillStyle = '#2a2d35';
       w.fillRect(0, 0, WORLD.w, WORLD.h);
   
       for (let i = 0; i < 9000; i++) {
         const x = Math.random() * WORLD.w, y = Math.random() * WORLD.h;
         w.fillStyle = `rgba(${rnd(38,58)|0},${rnd(40,60)|0},${rnd(50,70)|0},0.55)`;
         w.fillRect(x, y, 2, 2);
       }
   
       for (let i = 0; i < 30; i++) {
         const x = Math.random() * WORLD.w, y = Math.random() * WORLD.h;
         const r = rnd(8, 26);
         w.fillStyle = `rgba(10,12,18,${rnd(0.15, 0.35)})`;
         w.beginPath(); w.arc(x, y, r, 0, TAU); w.fill();
       }
   
       w.strokeStyle = 'rgba(240, 240, 240, 0.28)';
       w.lineWidth = 3;
       w.setLineDash([26, 22]);
       w.strokeRect(SHW, SHW, WORLD.w - SHW * 2, WORLD.h - SHW * 2);
       for (const b of BUILDINGS) {
         w.strokeRect(b.x - SHW, b.y - SHW, b.w + SHW * 2, b.h + SHW * 2);
       }
       w.setLineDash([]);
   
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
   
       [[90, 90], [2510, 90], [90, 1810], [2510, 1810], [1300, 40], [1300, 1860]]
         .forEach(([tx, ty]) => {
           w.fillStyle = 'rgba(0,0,0,0.35)';
           w.beginPath(); w.arc(tx + 4, ty + 4, 26, 0, TAU); w.fill();
           w.fillStyle = '#2d4a2d';
           w.beginPath(); w.arc(tx, ty, 26, 0, TAU); w.fill();
           w.fillStyle = '#3d6a3d';
           w.beginPath(); w.arc(tx - 6, ty - 6, 16, 0, TAU); w.fill();
         });
   
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
   
       c.fillStyle = 'rgba(0,0,0,0.45)';
       c.beginPath();
       c.ellipse(2, 4, 28, 18, 0, 0, TAU);
       c.fill();
   
       c.fillStyle = r.color;
       roundRect(c, -28, -15, 56, 30, 7);
       c.fill();
   
       c.fillStyle = shade(r.color, -30);
       roundRect(c, -16, -11, 24, 22, 5);
       c.fill();
   
       c.fillStyle = 'rgba(180, 220, 255, 0.6)';
       roundRect(c, 8, -10, 10, 20, 3);
       c.fill();
   
       c.fillStyle = 'rgba(120, 160, 200, 0.4)';
       roundRect(c, -22, -9, 6, 18, 2);
       c.fill();
   
       c.fillStyle = '#fff9d6';
       c.beginPath();
       c.ellipse(26, -8, 4, 3, 0, 0, TAU);
       c.ellipse(26, 8, 4, 3, 0, 0, TAU);
       c.fill();
   
       c.fillStyle = r.input.brake ? '#ff2a2a' : '#a81a1a';
       c.fillRect(-28, -13, 3, 6);
       c.fillRect(-28, 7, 3, 6);
   
       c.restore();
     }
   
     /* ---------- Teclado ---------- */
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
   
     /* ---------- Criação ---------- */
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
         if (r.lastDriftTime > DRIFT_BANK_TIMEOUT && r.driftBank > 0) {
           r.score += r.driftBank;
           if (r.driftBank > r.bestDrift) r.bestDrift = r.driftBank;
           if (!r.isAI) {
             state.floaters.push({
               x: r.x, y: r.y - 20,
               text: '+' + Math.floor(r.driftBank),
               life: 1.2, maxLife: 1.2,
             });
           }
           r.driftBank = 0; r.driftTimer = 0; r.combo = 1;
         }
       }
   
       r.score += r.speed * 0.045 * state.diff.scoreMult * dt;
   
       if (r.onShoulder) {
         r.shoulderTimer = (r.shoulderTimer || 0) + dt;
         if (r.shoulderTimer > 0.5) {
           r.score = Math.max(0, r.score - 8);
           r.shoulderTimer = 0;
         }
       } else r.shoulderTimer = 0;
     }
   
     /* ---------- IA ---------- */
     function aiInput(r, dt) {
       const wp = WAYPOINTS[r.wpIndex];
       const next = WAYPOINTS[(r.wpIndex + 1) % WAYPOINTS.length];
   
       const tx = wp.x * 0.68 + next.x * 0.32;
       const ty = wp.y * 0.68 + next.y * 0.32;
   
       const targetAngle = Math.atan2(ty - r.y, tx - r.x);
       let diff = targetAngle - r.angle;
       while (diff >  Math.PI) diff -= TAU;
       while (diff < -Math.PI) diff += TAU;
   
       r.input.steer = clamp(diff * 2.2, -1, 1);
   
       const turnSharp = Math.abs(diff);
       const targetSpeed = r.maxSpeed * (1 - clamp(turnSharp * 0.72, 0, 0.55));
   
       r.input.throttle  = r.speed < targetSpeed ? 1 : 0;
       r.input.brake     = r.speed > targetSpeed * 1.15 ? 1 : 0;
       r.input.handbrake = 0;
   
       if (r.skill > 0.85 && turnSharp > 0.65 && r.speed > 240) r.input.handbrake = 1;
   
       if (Math.hypot(wp.x - r.x, wp.y - r.y) < 190) {
         r.wpIndex = (r.wpIndex + 1) % WAYPOINTS.length;
       }
   
       if (r.speed < 32) {
         r.stuckTimer = (r.stuckTimer || 0) + dt;
         if (r.stuckTimer > 1) {
           r.input.throttle = 1;
           r.input.steer = r.input.steer || 0.6;
         }
       } else r.stuckTimer = 0;
     }
   
     /* ---------- Partículas ---------- */
     function spawnSparks(x, y, n) {
       for (let i = 0; i < n; i++) {
         state.particles.push({
           x, y,
           vx: rnd(-120, 120), vy: rnd(-120, 120),
           life: rnd(0.3, 0.7), maxLife: 0.7,
           color: Math.random() < 0.5 ? '#ffcc00' : '#ff8800',
           size: rnd(2, 4),
         });
       }
     }
   
     function updateParticles(dt) {
       for (let i = state.particles.length - 1; i >= 0; i--) {
         const p = state.particles[i];
         p.x += p.vx * dt;
         p.y += p.vy * dt;
         p.vx *= 0.96;
         p.vy *= 0.96;
         p.life -= dt;
         if (p.life <= 0) state.particles.splice(i, 1);
       }
       for (let i = state.floaters.length - 1; i >= 0; i--) {
         const f = state.floaters[i];
         f.y -= 40 * dt;
         f.life -= dt;
         if (f.life <= 0) state.floaters.splice(i, 1);
       }
     }
   
     /* =========================================================================
        MENU
        ========================================================================= */
     function buildCarGrid(slot, containerId) {
       const el = document.getElementById(containerId);
       if (!el) return;
       el.innerHTML = '';
       CARS.forEach((car, i) => {
         const card = document.createElement('div');
         card.className = 'car-card';
         card.innerHTML =
           '<div class="cc-name" style="color:' + car.color + '">' + car.name + '</div>' +
           '<div class="cc-bar"><div style="background:' + car.color + ';width:' + Math.round(car.maxSpeed / 700 * 100) + '%"></div></div>' +
           '<div class="cc-bar"><div style="background:' + car.color + ';width:' + Math.round(car.accel / 900 * 100) + '%"></div></div>' +
           '<div class="cc-bar"><div style="background:' + car.color + ';width:' + Math.round(car.turn / 3.5 * 100) + '%"></div></div>';
         card.addEventListener('click', () => {
           if (slot === 'p1') state.p1Car = i;
           else state.p2Car = i;
           el.querySelectorAll('.car-card').forEach(c => c.classList.remove('active'));
           card.classList.add('active');
         });
         el.appendChild(card);
       });
       const idx = slot === 'p1' ? state.p1Car : state.p2Car;
       if (el.children[idx]) el.children[idx].classList.add('active');
     }
   
     function initMenu() {
       // Dificuldades
       const diffBtns = document.getElementById('diff-btns');
       diffBtns.innerHTML = '';
       DIFFS.forEach((d, i) => {
         const btn = document.createElement('button');
         btn.className = 'btn' + (i === 0 ? ' active' : '');
         btn.textContent = d.name;
         btn.addEventListener('click', () => {
           state.difficulty = i;
           diffBtns.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
           btn.classList.add('active');
         });
         diffBtns.appendChild(btn);
       });
   
       // Carros
       buildCarGrid('p1', 'car-grid-p1');
       buildCarGrid('p2', 'car-grid-p2');
   
       // Modo
       document.querySelectorAll('#mode-btns .btn').forEach(btn => {
         btn.addEventListener('click', () => {
           state.mode = parseInt(btn.dataset.mode, 10);
           document.querySelectorAll('#mode-btns .btn').forEach(b => b.classList.remove('active'));
           btn.classList.add('active');
           document.getElementById('p2-section').hidden = state.mode === 1;
         });
       });
   
       // Ações
       document.getElementById('start-btn').addEventListener('click', startRace);
       document.getElementById('rematch-btn').addEventListener('click', startRace);
       document.getElementById('menu-btn').addEventListener('click', showMenu);
       document.getElementById('pause-btn').addEventListener('click', togglePause);
     }
   
     function showScreen(name) {
       state.screen = name;
       document.getElementById('menu-screen').hidden = name !== 'menu';
       document.getElementById('race-screen').hidden = name !== 'race';
       document.getElementById('results-screen').hidden = name !== 'results';
       document.documentElement.dataset.screen = name;
     }
   
     function showMenu() {
       showScreen('menu');
     }
   
     /* =========================================================================
        FLUXO DE CORRIDA
        ========================================================================= */
     function startRace() {
       state.diff = DIFFS[state.difficulty];
       state.racers = [];
       state.particles = [];
       state.floaters = [];
       state.time = 0;
       state.countdown = COUNTDOWN;
       state.paused = false;
       state.shake = 0;
   
       const p1Model = CARS[state.p1Car];
       const p1 = makeRacer({
         model: p1Model, name: 'P1', color: p1Model.color,
         playerIndex: 0, isAI: false, skill: 1,
       });
       placeRacer(p1, 0);
       state.racers.push(p1);
   
       if (state.mode === 2) {
         const p2Model = CARS[state.p2Car];
         const p2 = makeRacer({
           model: p2Model, name: 'P2', color: p2Model.color,
           playerIndex: 1, isAI: false, skill: 1,
         });
         placeRacer(p2, 1);
         state.racers.push(p2);
       }
   
       const aiStart = state.mode === 2 ? 2 : 1;
       for (let i = 0; i < state.diff.aiCount; i++) {
         const carIdx = Math.floor(rnd(0, CARS.length));
         const m = CARS[carIdx];
         const ai = makeRacer({
           model: m, name: 'CPU ' + (i + 1), color: m.color,
           playerIndex: -1, isAI: true, skill: state.diff.aiSkill,
         });
         placeRacer(ai, aiStart + i);
         state.racers.push(ai);
       }
   
       showScreen('race');
       requestAnimationFrame(() => {
         resize();
         state.lastT = performance.now();
       });
     }
   
     function endRace() {
       const sorted = [...state.racers].sort((a, b) => b.score - a.score);
       const list = document.getElementById('results-list');
       list.innerHTML = '';
       sorted.forEach((r, i) => {
         const row = document.createElement('div');
         row.className = 'result-row' + (i === 0 ? ' first' : '');
         row.innerHTML =
           '<div class="rk">' + (i + 1) + '</div>' +
           '<div class="info">' +
             '<div class="nm" style="color:' + r.color + '">' + r.name + '</div>' +
             '<div class="cr">' + r.model.name + ' · ' + r.wallHits + ' batida' + (r.wallHits !== 1 ? 's' : '') +
               ' · melhor drift ' + Math.floor(r.bestDrift) + '</div>' +
           '</div>' +
           '<div class="sc">' + Math.floor(r.score) + '</div>';
         list.appendChild(row);
       });
       showScreen('results');
     }
   
     function togglePause() {
       if (state.screen !== 'race') return;
       state.paused = !state.paused;
     }
   
     /* =========================================================================
        LOOP
        ========================================================================= */
     function update(dt) {
       if (state.countdown > 0) {
         state.countdown -= dt;
         state.racers.forEach(r => {
           r.input.throttle = 0; r.input.brake = 0;
           r.input.steer = 0; r.input.handbrake = 0;
         });
         return;
       }
   
       state.time += dt;
       if (state.time >= state.raceTime) { endRace(); return; }
   
       const kb = readKeyboard();
       state.racers.forEach(r => {
         if (r.isAI) {
           aiInput(r, dt);
         } else {
           const k = r.playerIndex === 0 ? kb.p1 : kb.p2;
           r.input.throttle  = k.throttle;
           r.input.brake     = k.brake;
           r.input.steer     = k.steer;
           r.input.handbrake = k.handbrake;
           if (window.MobileInput) window.MobileInput.apply(r, r.playerIndex);
         }
       });
   
       state.racers.forEach(r => {
         physics(r, dt);
         collideRacer(r);
         updateDriftScore(r, dt);
       });
   
       for (let i = 0; i < state.racers.length; i++) {
         for (let j = i + 1; j < state.racers.length; j++) {
           carCollide(state.racers[i], state.racers[j]);
         }
       }
   
       updateParticles(dt);
       state.shake = Math.max(0, state.shake - dt * 20);
     }
   
     function loop(t) {
       requestAnimationFrame(loop);
       const now = t || performance.now();
       let dt = (now - state.lastT) / 1000;
       state.lastT = now;
       if (dt > 0.05) dt = 0.05;
   
       if (state.screen === 'race' && !state.paused) update(dt);
       render();
     }
   
     /* =========================================================================
        RENDER
        ========================================================================= */
     function render() {
       if (state.screen !== 'race' || W === 0 || H === 0) return;
   
       ctx.fillStyle = '#0a0e16';
       ctx.fillRect(0, 0, W, H);
   
       if (state.mode === 2) {
         const half = H / 2;
         if (state.racers[0]) renderView(state.racers[0], 0, 0, W, half);
         if (state.racers[1]) renderView(state.racers[1], 0, half, W, half);
         ctx.fillStyle = '#0089a8';
         ctx.fillRect(0, half - 1, W, 2);
       } else {
         if (state.racers[0]) renderView(state.racers[0], 0, 0, W, H);
       }
   
       if (state.countdown > 0) drawCountdown();
       if (state.paused) drawPausedOverlay();
     }
   
     function drawCountdown() {
       ctx.fillStyle = 'rgba(0,0,0,0.45)';
       ctx.fillRect(0, 0, W, H);
       ctx.save();
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       const n = Math.ceil(state.countdown);
       const t = 1 - (state.countdown - Math.floor(state.countdown));
       const scale = 1 + (1 - t) * 0.4;
       const grad = ctx.createLinearGradient(W / 2 - 120, H / 2, W / 2 + 120, H / 2);
       grad.addColorStop(0, '#0089a8');
       grad.addColorStop(0.5, '#5b3fc9');
       grad.addColorStop(1, '#c4145b');
       ctx.font = '800 ' + Math.floor(Math.min(W, H) * 0.22 * scale) + 'px Helvetica, Arial, sans-serif';
       ctx.fillStyle = grad;
       ctx.fillText(n > 0 ? String(n) : 'GO!', W / 2, H / 2);
       ctx.restore();
     }
   
     function drawPausedOverlay() {
       ctx.fillStyle = 'rgba(0,0,0,0.72)';
       ctx.fillRect(0, 0, W, H);
       ctx.fillStyle = '#fff';
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       ctx.font = '800 36px Helvetica, Arial, sans-serif';
       ctx.fillText('PAUSADO', W / 2, H / 2 - 20);
       ctx.font = '14px Helvetica, Arial, sans-serif';
       ctx.fillStyle = '#8899aa';
       ctx.fillText('Toque em ⏸ ou pressione P para continuar', W / 2, H / 2 + 30);
     }
   
     function renderView(player, vx, vy, vw, vh) {
       ctx.save();
       ctx.beginPath();
       ctx.rect(vx, vy, vw, vh);
       ctx.clip();
   
       const shakeX = (Math.random() - 0.5) * state.shake;
       const shakeY = (Math.random() - 0.5) * state.shake;
       const zoom = 0.85;
       const camX = player.x - (vw / 2) / zoom + shakeX;
       const camY = player.y - (vh / 2) / zoom + shakeY;
   
       ctx.translate(vx, vy);
       ctx.scale(zoom, zoom);
       ctx.translate(-camX, -camY);
   
       if (worldCanvas) ctx.drawImage(worldCanvas, 0, 0);
   
       // Outros carros
       for (const r of state.racers) {
         if (r === player) continue;
         drawCarShape(ctx, r);
       }
   
       // Jogador
       drawCarShape(ctx, player);
   
       // Partículas
       for (const p of state.particles) {
         ctx.globalAlpha = p.life / p.maxLife;
         ctx.fillStyle = p.color;
         ctx.beginPath();
         ctx.arc(p.x, p.y, p.size, 0, TAU);
         ctx.fill();
       }
       ctx.globalAlpha = 1;
   
       // Floaters
       for (const f of state.floaters) {
         ctx.globalAlpha = f.life / f.maxLife;
         ctx.fillStyle = '#00d4ff';
         ctx.font = 'bold 24px Helvetica, Arial, sans-serif';
         ctx.textAlign = 'center';
         ctx.fillText(f.text, f.x, f.y);
       }
       ctx.globalAlpha = 1;
   
       ctx.restore();
   
       // HUD
       drawHUD(player, vx, vy, vw, vh);
   
       // Setas para carros fora da tela
       drawOffscreenArrows(player, vx, vy, vw, vh, zoom, camX, camY);
     }
   
     function drawOffscreenArrows(player, vx, vy, vw, vh, zoom, camX, camY) {
       ctx.save();
       ctx.translate(vx, vy);
       for (const r of state.racers) {
         if (r === player) continue;
         const sx = (r.x - camX) * zoom;
         const sy = (r.y - camY) * zoom;
         if (sx < 0 || sx > vw || sy < 0 || sy > vh) {
           const ang = Math.atan2(r.y - player.y, r.x - player.x);
           const margin = 34;
           let ax = vw / 2 + Math.cos(ang) * (vw / 2 - margin);
           let ay = vh / 2 + Math.sin(ang) * (vh / 2 - margin);
           ax = clamp(ax, margin, vw - margin);
           ay = clamp(ay, margin, vh - margin);
           ctx.fillStyle = r.color;
           ctx.beginPath();
           ctx.arc(ax, ay, 7, 0, TAU);
           ctx.fill();
           ctx.strokeStyle = 'rgba(0,0,0,0.5)';
           ctx.lineWidth = 2;
           ctx.stroke();
         }
       }
       ctx.restore();
     }
   
     function drawHUD(player, vx, vy, vw, vh) {
       ctx.save();
       ctx.translate(vx, vy);
   
       const pad = 12;
   
       // Nome
       ctx.fillStyle = player.playerIndex === 0 ? '#0089a8' : (player.playerIndex === 1 ? '#f4a261' : '#8899aa');
       ctx.fillRect(pad, pad, 4, 22);
       ctx.fillStyle = '#fff';
       ctx.font = 'bold 14px Helvetica, Arial, sans-serif';
       ctx.textAlign = 'left';
       ctx.textBaseline = 'top';
       ctx.fillText(player.name, pad + 12, pad + 3);
   
       // Score
       ctx.textAlign = 'right';
       ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
       ctx.fillStyle = '#fff';
       ctx.fillText(String(Math.floor(player.score)), vw - pad - 50, pad + 2);
   
       // Drift bar
       const driftY = pad + 32;
       const driftW = Math.min(200, vw - pad * 2 - 60);
       ctx.fillStyle = 'rgba(255,255,255,0.15)';
       ctx.fillRect(pad, driftY, driftW, 6);
       if (player.driftBank > 0) {
         ctx.fillStyle = '#00d4ff';
         ctx.fillRect(pad, driftY, Math.min(driftW, player.driftBank / 6), 6);
       }
   
       // Combo
       if (player.combo > 1) {
         ctx.fillStyle = '#ffcc00';
         ctx.font = 'bold 16px Helvetica, Arial, sans-serif';
         ctx.textAlign = 'left';
         ctx.fillText('x' + player.combo, pad, driftY + 12);
       }
   
       // Velocímetro
       const kmh = Math.floor(player.speed * 0.62);
       ctx.fillStyle = '#fff';
       ctx.font = 'bold 30px Helvetica, Arial, sans-serif';
       ctx.textAlign = 'left';
       ctx.textBaseline = 'bottom';
       ctx.fillText(String(kmh), pad, vh - pad - 26);
       ctx.font = '11px Helvetica, Arial, sans-serif';
       ctx.fillStyle = '#8899aa';
       ctx.fillText('km/h', pad + 50, vh - pad - 26);
   
       // Tempo
       const remaining = Math.max(0, state.raceTime - state.time);
       ctx.fillStyle = remaining < 15 ? '#ff3366' : '#fff';
       ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
       ctx.textAlign = 'right';
       ctx.textBaseline = 'bottom';
       ctx.fillText(Math.floor(remaining) + 's', vw - pad - 130, vh - pad - 26);
   
       // Minimapa
       drawMinimap(player, vw, vh);
   
       ctx.restore();
     }
   
     function drawMinimap(player, vw, vh) {
       if (!minimapCanvas) return;
       const mmW = Math.min(110, vw * 0.22);
       const mmH = Math.round(mmW * WORLD.h / WORLD.w);
       const mmX = vw - mmW - 12;
       const mmY = 12;
   
       ctx.save();
       ctx.globalAlpha = 0.9;
       ctx.drawImage(minimapCanvas, mmX, mmY, mmW, mmH);
       ctx.strokeStyle = 'rgba(255,255,255,0.35)';
       ctx.lineWidth = 1;
       ctx.strokeRect(mmX, mmY, mmW, mmH);
   
       for (const r of state.racers) {
         const px = mmX + (r.x / WORLD.w) * mmW;
         const py = mmY + (r.y / WORLD.h) * mmH;
         ctx.fillStyle = r === player ? '#00ffff' : r.color;
         ctx.beginPath();
         ctx.arc(px, py, r === player ? 3.5 : 2.5, 0, TAU);
         ctx.fill();
       }
       ctx.restore();
     }
   
     /* =========================================================================
        INIT
        ========================================================================= */
     function init() {
       buildWorld();
       initMenu();
       resize();
       state.lastT = performance.now();
       requestAnimationFrame(loop);
     }
   
     if (document.readyState === 'loading') {
       document.addEventListener('DOMContentLoaded', init);
     } else {
       init();
     }
   })();