/* =========================================================================
   mobile-controls.js — Toque + Giroscópio para Drift City
   ========================================================================= */
   (function () {
    'use strict';
  
    const CFG = {
      gyro: {
        sensitivity: 1.0,
        deadzoneDeg: 2.5,
        maxTiltDeg: 28,
        invert: false,
        smoothing: 0.30,
      },
    };
  
    const isMobile =
      matchMedia('(pointer: coarse)').matches ||
      /Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (!isMobile) return;
  
    const html = document.documentElement;
    html.classList.add('is-mobile');
    html.dataset.screen = 'menu';
    html.dataset.gyro = 'off';
  
    const makePlayer = () => ({
      tThrottle: 0, tBrake: 0, tHandbrake: 0, tSteerL: 0, tSteerR: 0,
      gyroOn: false, gyroZero: null, gyroLastRaw: null,
      gyroTilt: 0, gyroSteer: 0,
    });
    const players = [makePlayer(), makePlayer()];
  
    const MobileInput = {
      cfg: CFG,
      players,
      isMobile: true,
  
      getInput(i = 0) {
        const p = players[i] || players[0];
        return {
          throttle: p.tThrottle,
          brake: p.tBrake,
          handbrake: p.tHandbrake,
          steer: p.gyroOn ? p.gyroSteer : (p.tSteerR - p.tSteerL),
        };
      },
  
      apply(racer, playerIndex = 0) {
        if (!racer || !racer.input) return;
        const inp = this.getInput(playerIndex);
        if (inp.throttle > 0) racer.input.throttle = Math.max(racer.input.throttle || 0, inp.throttle);
        if (inp.brake > 0) racer.input.brake = Math.max(racer.input.brake || 0, inp.brake);
        if (inp.handbrake > 0) racer.input.handbrake = 1;
        if (inp.steer !== 0) racer.input.steer = inp.steer;
      },
  
      calibrate(i = 0) {
        const p = players[i] || players[0];
        if (p.gyroLastRaw == null) return;
        p.gyroZero = p.gyroLastRaw;
        p.gyroTilt = 0;
        p.gyroSteer = 0;
        this._toast('Giroscópio calibrado');
      },
  
      async requestGyro() {
        if (typeof DeviceOrientationEvent === 'undefined') return false;
        try {
          if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            const res = await DeviceOrientationEvent.requestPermission();
            if (res !== 'granted') return false;
          }
          this._startSensor();
          players[0].gyroOn = true;
          html.dataset.gyro = 'on';
          this._toast('Giroscópio ativo — incline para virar');
          return true;
        } catch (e) {
          console.warn('[MobileInput] permissão gyro:', e);
          return false;
        }
      },
  
      disableGyro(i = 0) {
        players[i].gyroOn = false;
        html.dataset.gyro = 'off';
      },
  
      _started: false,
      _startSensor() {
        if (this._started) return;
        this._started = true;
  
        window.addEventListener('deviceorientation', (e) => {
          if (e.beta == null || e.gamma == null) return;
          const angle = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
          let tilt;
          switch (angle) {
            case 0:            tilt = e.gamma;  break;
            case 90:           tilt = -e.beta;  break;
            case 180:          tilt = -e.gamma; break;
            case -90:
            case 270:          tilt = e.beta;   break;
            default:           tilt = e.gamma;
          }
          if (CFG.gyro.invert) tilt = -tilt;
  
          for (const p of players) {
            if (!p.gyroOn) continue;
            p.gyroLastRaw = tilt;
            if (p.gyroZero === null) p.gyroZero = tilt;
  
            const rel = tilt - p.gyroZero;
            p.gyroTilt += (rel - p.gyroTilt) * CFG.gyro.smoothing;
  
            const abs = Math.abs(p.gyroTilt);
            const d = CFG.gyro.deadzoneDeg;
            const m = CFG.gyro.maxTiltDeg;
  
            let s = 0;
            if (abs > d) {
              const mag = Math.min(1, (abs - d) / (m - d));
              s = Math.sign(p.gyroTilt) * mag;
            }
            p.gyroSteer = Math.max(-1, Math.min(1, s * CFG.gyro.sensitivity));
          }
        }, true);
      },
  
      _toast(msg) {
        const el = document.getElementById('gyro-hint');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(this._toastT);
        this._toastT = setTimeout(() => el.classList.remove('show'), 1800);
      },
    };
    window.MobileInput = MobileInput;
  
    /* ---------- Botões touch ---------- */
    document.querySelectorAll('#mobile-controls .mbtn').forEach((btn) => {
      const act = btn.dataset.act;
      const p = players[0];
  
      const setActive = (on) => {
        btn.classList.toggle('active', on);
        switch (act) {
          case 'throttle':  p.tThrottle  = on ? 1 : 0; break;
          case 'brake':     p.tBrake     = on ? 1 : 0; break;
          case 'handbrake': p.tHandbrake = on ? 1 : 0; break;
          case 'steerL':    p.tSteerL    = on ? 1 : 0; break;
          case 'steerR':    p.tSteerR    = on ? 1 : 0; break;
        }
        if (on && navigator.vibrate) navigator.vibrate(8);
      };
  
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); setActive(true); }, { passive: false });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); setActive(false); }, { passive: false });
      btn.addEventListener('touchcancel', (e) => { e.preventDefault(); setActive(false); }, { passive: false });
      btn.addEventListener('mousedown', () => setActive(true));
      btn.addEventListener('mouseup', () => setActive(false));
      btn.addEventListener('mouseleave', () => setActive(false));
    });
  
    /* ---------- Fullscreen + orientação no primeiro toque ---------- */
    async function goFullscreenLandscape() {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        }
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (_) {}
    }
  
    document.addEventListener('touchstart', async function firstTap() {
      document.removeEventListener('touchstart', firstTap);
      goFullscreenLandscape();
      await MobileInput.requestGyro();
    }, { once: true, passive: true });
  
    /* ---------- Watcher de tela ---------- */
    let lastScreen = null;
    setInterval(() => {
      const st = window.state;
      if (!st) return;
      if (st.screen !== lastScreen) {
        const prev = lastScreen;
        lastScreen = st.screen;
        html.dataset.screen = st.screen;
  
        if (st.screen === 'race' && prev !== 'race') {
          players.forEach((p, i) => {
            if (p.gyroOn) setTimeout(() => MobileInput.calibrate(i), 100);
          });
        }
      }
    }, 120);
  })();