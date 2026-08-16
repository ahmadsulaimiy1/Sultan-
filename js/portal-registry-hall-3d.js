// Registry Hall — the Registrar's Office companion to the Certificate
// Centre's Certificate Forge (js/portal-cert-forge-3d.js): a real
// Three.js scene, not a CSS trick, self-hosted from
// js/vendor/three/three.module.min.js (already vendored for the Forge;
// no second download, no CDN). Same engineering discipline as that
// file — see its header comment for the honesty/perf contract this
// mirrors (WebGL-missing fallback, prefers-reduced-motion still frame,
// visibility-gated animation, disposed geometry/material each cycle) —
// this file repeats it rather than importing it, since the two scenes
// share almost no scene-graph code, only the same *shape* of harness.
//
// The scene: a student record card flips onto the desk, an
// institutional seal descends and presses an emboss into it — "one
// honest source per student," made physical — then the card flips
// away for the next one.
import * as THREE from '/js/vendor/three/three.module.min.js';

(function () {
  var mount = document.querySelector('[data-registry-hall]');
  var canvas = document.querySelector('[data-registry-hall-canvas]');
  if (!mount || !canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Console readouts ----
  var serialEl = document.querySelector('[data-registry-hall-serial]');
  var stageEl = document.querySelector('[data-registry-hall-stage]');
  var progressEl = document.querySelector('[data-registry-hall-progress]');
  var countEl = document.querySelector('[data-registry-hall-count]');
  var leds = document.querySelectorAll('[data-registry-hall-led]');
  var STAGES = ['Identifying Student', 'Verifying Standing', 'Applying Official Seal', 'Writing to the Register'];
  function setStageDisplay(t) {
    if (stageEl) stageEl.textContent = t >= 0.85 ? 'Archived' : STAGES[Math.min(3, Math.floor(t * 4))];
    if (progressEl) progressEl.textContent = Math.round(Math.min(t, 1) * 100) + '%';
    var activeLed = Math.min(3, Math.floor(t * 4));
    leds.forEach(function (led, i) {
      led.classList.toggle('is-active', i <= activeLed);
    });
  }

  var RECORDS = [
    { name: 'Abdul Samod A. Jimoh', no: 'SHRS-STU-000198', institution: "Royal College", cls: "I'dādiyyah 1", status: 'Active' },
    { name: 'Aisha Bello', no: 'SHRS-STU-000214', institution: "Qur'an College", cls: "Ibtidā'iyyah 3", status: 'Active' },
    { name: 'Ibrahim Suleiman', no: 'SHRS-STU-000241', institution: 'Royal College', cls: 'Thanawiyyah 2', status: 'Active' },
    { name: 'Zainab Yusuf', no: 'SHRS-STU-000276', institution: 'Islamic & Arabic Studies', cls: "I'dādiyyah 3", status: 'Active' },
  ];

  // ---- Record card texture, drawn procedurally (no image asset) ----
  function drawRecordFace(rec) {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 700;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#F7EEDF';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#C6A15B'; ctx.lineWidth = 10;
    ctx.strokeRect(28, 28, c.width - 56, c.height - 56);
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, c.width - 96, c.height - 96);
    ctx.textAlign = 'center'; ctx.fillStyle = '#3B2A1D';
    ctx.font = '600 30px Georgia, serif';
    ctx.fillText('STUDENT REGISTRY — OFFICIAL RECORD', c.width / 2, 118);
    ctx.strokeStyle = 'rgba(59,42,29,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(120, 150); ctx.lineTo(c.width - 120, 150); ctx.stroke();

    var fields = [
      ['Full Name', rec.name], ['Institutional Student No.', rec.no],
      ['Institution', rec.institution], ['Class', rec.cls],
      ['Status', rec.status], ['Record Source', 'Registrar’s Office'],
    ];
    ctx.textAlign = 'left';
    var colX = [140, 560], rowY = 220, rowH = 92;
    fields.forEach(function (f, i) {
      var x = colX[i % 2], y = rowY + Math.floor(i / 2) * rowH;
      ctx.font = '600 16px Georgia, serif'; ctx.fillStyle = '#7C5430';
      ctx.fillText(f[0].toUpperCase(), x, y);
      ctx.font = '26px Georgia, serif'; ctx.fillStyle = '#221709';
      ctx.fillText(f[1], x, y + 32);
    });
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { texture: tex, canvas: c, ctx: ctx };
  }

  // Bakes the seal's emboss into an already-drawn record face, once
  // the stamp actually makes contact — a mark that persists on the
  // card for the rest of its time on screen, not just a 3D prop
  // floating near it.
  function embossSeal(face) {
    var ctx = face.ctx, sx = face.canvas.width - 190, sy = face.canvas.height - 150;
    var grad = ctx.createRadialGradient(sx, sy, 4, sx, sy, 50);
    grad.addColorStop(0, 'rgba(233,206,138,0.55)'); grad.addColorStop(1, 'rgba(156,122,60,0.35)');
    ctx.save();
    ctx.beginPath(); ctx.arc(sx, sy, 50, 0, Math.PI * 2);
    ctx.strokeStyle = '#9C7A3C'; ctx.lineWidth = 3; ctx.fillStyle = grad; ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#3B2A1D'; ctx.font = '700 13px Georgia, serif';
    ctx.fillText('OFFICIAL', sx, sy - 4);
    ctx.fillText('RECORD', sx, sy + 12);
    ctx.restore();
    face.texture.needsUpdate = true;
  }

  // ---- Scene ----
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (err) {
    return; // No WebGL — the section's own CSS background carries it.
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.6, 8.6);

  scene.add(new THREE.AmbientLight(0xE9CE8A, 0.55));
  var key = new THREE.DirectionalLight(0xFFF3DE, 1.05);
  key.position.set(3, 5, 4);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x41618C, 0.35); // a hint of the Registrar's own atmosphere colour
  rim.position.set(-4, 1, -3);
  scene.add(rim);

  // The desk — a simple dark surface the record card lies on.
  var desk = new THREE.Mesh(
    new THREE.BoxGeometry(6.6, 0.35, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x241708, metalness: 0.2, roughness: 0.75 })
  );
  desk.position.set(0, -1.55, 0);
  desk.rotation.x = -0.06;
  scene.add(desk);

  // The seal — a squat cylinder on a thin handle, hanging above the
  // desk until its cycle to descend.
  var seal = new THREE.Group();
  var sealHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.46, 0.28, 28),
    new THREE.MeshStandardMaterial({ color: 0xC6A15B, metalness: 0.75, roughness: 0.28 })
  );
  var sealHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 1.1, 16),
    new THREE.MeshStandardMaterial({ color: 0x3B2A1D, metalness: 0.2, roughness: 0.7 })
  );
  sealHandle.position.y = 0.68;
  seal.add(sealHead); seal.add(sealHandle);
  seal.position.set(1.05, 2.7, 0.75);
  scene.add(seal);

  // Dust motes drifting in the light — an archival-room mood in place
  // of the Forge's gold sparkle.
  var moteCount = 30;
  var motePos = new Float32Array(moteCount * 3);
  for (var m = 0; m < moteCount; m++) {
    motePos[m * 3] = (Math.random() - 0.5) * 5.4;
    motePos[m * 3 + 1] = -0.6 + Math.random() * 2.6;
    motePos[m * 3 + 2] = (Math.random() - 0.5) * 2.4 + 0.6;
  }
  var moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  var motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ color: 0xE9CE8A, size: 0.022, transparent: true, opacity: 0.5 }));
  scene.add(motes);

  function resize() {
    var w = mount.clientWidth, h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);
  }
  var ro = ('ResizeObserver' in window) ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(mount); else window.addEventListener('resize', resize);
  resize();

  // ---- The record cycle: card flips in, seal presses, card flips out ----
  var CYCLE = 4600; // ms per record — adjustable by the "View" control below
  var swayAmplitude = 0.3; // also adjustable by "View" — how far the camera drifts
  var cur = null, curFace = null, recIdx = 0, sealed = false, sessionCount = 0;
  // An institutional-record-number-shaped identifier for this
  // demonstration — illustrative, the same way the names on the card
  // are, not a real record number (the Student Registry above issues
  // those for real, tied to an actual student).
  function nextRecordNo() {
    sessionCount++;
    if (countEl) countEl.textContent = String(sessionCount).padStart(4, '0');
    return 'SHRS-REG-2026-' + String(80 + sessionCount).padStart(6, '0');
  }
  function spawnRecord() {
    if (curFace) curFace.texture.dispose();
    curFace = drawRecordFace(RECORDS[recIdx % RECORDS.length]);
    recIdx++;
    sealed = false;
    if (serialEl) serialEl.textContent = nextRecordNo();
    var geo = new THREE.PlaneGeometry(3.6, 2.46);
    var mat = new THREE.MeshStandardMaterial({ map: curFace.texture, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.04 });
    if (cur) { scene.remove(cur); cur.geometry.dispose(); cur.material.dispose(); }
    cur = new THREE.Mesh(geo, mat);
    cur.position.set(0, 0.15, 0.55);
    cur.rotation.y = -Math.PI / 2;
    scene.add(cur);
    return cur;
  }
  function playSound() { if (window.__registryHallThud) window.__registryHallThud(); }

  var cycleStart = 0;
  function animateCycle(now) {
    if (!cur || now - cycleStart > CYCLE) {
      cycleStart = now;
      spawnRecord();
    }
    var t = Math.min((now - cycleStart) / CYCLE, 1);
    setStageDisplay(t);

    // 0 - 0.22: card flips onto the desk.
    var flipIn = Math.min(t / 0.22, 1);
    var eased = 1 - Math.pow(1 - flipIn, 3);
    cur.rotation.y = -Math.PI / 2 * (1 - eased);

    // 0.3 - 0.5: the seal descends, presses, lifts.
    var pressStart = 0.3, pressEnd = 0.5;
    if (t >= pressStart && t <= pressEnd) {
      var p = (t - pressStart) / (pressEnd - pressStart);
      var down = p < 0.5 ? p * 2 : (1 - p) * 2;
      seal.position.y = 2.7 - down * 2.55;
      if (!sealed && p >= 0.48) { sealed = true; embossSeal(curFace); playSound(); }
    } else {
      seal.position.y = 2.7;
    }

    // 0.78 - 1: card flips away.
    if (t > 0.78) {
      var out = (t - 0.78) / 0.22;
      cur.rotation.y = Math.PI / 2 * out;
    }
  }

  var raf = null, running = false, userPaused = false;
  function frame(ts) {
    if (!running) return;
    animateCycle(ts);
    motes.rotation.y += 0.0004;
    camera.position.x = Math.sin(ts / 10000) * swayAmplitude;
    camera.lookAt(0, 0.15, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || userPaused) return; running = true; raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); }

  if (reduceMotion) {
    var still = spawnRecord();
    still.rotation.y = 0;
    seal.position.y = 0.15;
    embossSeal(curFace);
    setStageDisplay(1);
    camera.lookAt(0, 0.15, 0);
    resize();
    renderer.render(scene, camera);
  } else {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
      }, { threshold: 0.1 });
      io.observe(mount);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (!reduceMotion) start();
    });
  }

  // ---- Optional stamp thud, synthesised (no audio file to import) ----
  var audioCtx = null, soundOn = false;
  function ensureAudioCtx() {
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }
  window.__registryHallThud = function () {
    if (!soundOn) return;
    var ctx = ensureAudioCtx();
    if (!ctx) return;
    var t0 = ctx.currentTime;
    var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(140, t0);
    osc.frequency.exponentialRampToValueAtTime(60, t0 + 0.22);
    var gain = ctx.createGain(); gain.gain.setValueAtTime(0.16, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + 0.32);
  };

  var soundBtn = document.querySelector('[data-registry-hall-sound]');
  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      soundOn = !soundOn;
      soundBtn.setAttribute('aria-pressed', String(soundOn));
      soundBtn.textContent = soundOn ? '🔊 Sound: On' : '🔈 Sound: Off';
      if (soundOn) { ensureAudioCtx(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }
    });
  }

  // ---- Pause: a real control — stops the loop outright rather than
  // just muting it, and overrides the IntersectionObserver so scrolling
  // the hero back into view doesn't silently un-pause it. ----
  var pauseBtn = document.querySelector('[data-registry-hall-pause]');
  if (pauseBtn && !reduceMotion) {
    pauseBtn.addEventListener('click', function () {
      userPaused = !userPaused;
      pauseBtn.setAttribute('aria-pressed', String(userPaused));
      pauseBtn.textContent = userPaused ? '▶ Resume' : '⏸ Pause';
      if (userPaused) { stop(); if (stageEl) stageEl.textContent = 'Paused'; }
      else { start(); }
    });
  } else if (pauseBtn) {
    pauseBtn.disabled = true;
    pauseBtn.textContent = 'Reduced Motion';
    pauseBtn.title = 'Animation is already stopped — this browser/OS requested reduced motion.';
  }

  // ---- View: a real control that changes the pace of this
  // demonstration only — never the real registry, which this scene
  // does not touch. ----
  var QUALITY_TIERS = [
    { label: 'View: Standard', cycle: 5800, sway: 0.18, moteOpacity: 0.35 },
    { label: 'View: Professional', cycle: 4600, sway: 0.3, moteOpacity: 0.5 },
    { label: 'View: Prestige', cycle: 3600, sway: 0.44, moteOpacity: 0.7 },
  ];
  var qualityIdx = 1;
  var qualityBtn = document.querySelector('[data-registry-hall-quality]');
  if (qualityBtn) {
    qualityBtn.addEventListener('click', function () {
      qualityIdx = (qualityIdx + 1) % QUALITY_TIERS.length;
      var tier = QUALITY_TIERS[qualityIdx];
      CYCLE = tier.cycle;
      swayAmplitude = tier.sway;
      motes.material.opacity = tier.moteOpacity;
      qualityBtn.textContent = tier.label;
    });
  }
})();
