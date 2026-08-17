// Registry Hall — the Registrar's Office companion to the Certificate
// Centre's Certificate Forge (js/portal-cert-forge-3d.js): a real
// Three.js scene with a real 3D instrument console beneath it — a
// rotating dial, physical switch levers, an emissive VU meter, LCD
// readouts — self-hosted from js/vendor/three/three.module.min.js
// (already vendored for the Forge; no second download, no CDN). Same
// engineering discipline as that file — see its header comment for
// the honesty/perf contract this mirrors (WebGL-missing fallback,
// prefers-reduced-motion still frame, visibility-gated animation,
// disposed geometry/material each cycle, native hidden <input>s as the
// single source of truth behind every 3D control) — this file repeats
// it rather than importing it, since the two scenes share almost no
// scene-graph code, only the same *shape* of harness (and the console
// builders in js/portal-forge-controls.js, which both do share).
//
// The scene: a student record card flips onto the desk, an
// institutional seal descends and presses an emboss into it — "one
// honest source per student," made physical — then the card flips
// away for the next one.
import * as THREE from '/js/vendor/three/three.module.min.js';
import { buildLCDPlane, buildVUStrip, buildLEDRow, bindDial, bindSwitch, buildGuardedSwitch, buildPlaque, wireRaycast } from '/js/portal-forge-controls.js';

(function () {
  var mount = document.querySelector('[data-registry-hall]');
  var canvas = document.querySelector('[data-registry-hall-canvas]');
  if (!mount || !canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Accessible source-of-truth inputs (visually hidden — see
  // .pr-sr in css/prestige.css — the 3D console is a skin on these) ----
  var soundInput = document.querySelector('[data-registry-hall-sound]');
  var engineInput = document.querySelector('[data-registry-hall-pause]');
  var qualityInput = document.querySelector('[data-registry-hall-quality]');
  var liveEl = document.querySelector('[data-registry-hall-live]');

  var STAGES = ['Identifying Student', 'Verifying Standing', 'Applying Official Seal', 'Writing to the Register'];
  var lastAnnouncedStage = '';
  var sessionCount = 0;
  var lcd = null;

  function setStageDisplay(t, recordNo) {
    var pct = Math.round(Math.min(t, 1) * 100);
    var stage = t >= 0.85 ? 'Archived' : STAGES[Math.min(3, Math.floor(t * 4))];
    if (lcd) {
      lcd.setLines([
        { text: stage, size: 30 },
        { text: recordNo || '—', size: 26 },
        { text: 'Session ' + String(sessionCount).padStart(4, '0') + '   ' + pct + '%', size: 22, caption: true },
      ]);
    }
    if (leds) leds.setActive(Math.min(3, Math.floor(t * 4)));
    if (vu) vu.setLevel(pct / 100);
    if (liveEl && stage !== lastAnnouncedStage) {
      lastAnnouncedStage = stage;
      liveEl.textContent = stage + ', ' + pct + ' percent complete.';
    }
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
  var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  camera.position.set(0, -0.6, 12.2);

  scene.add(new THREE.AmbientLight(0xE9CE8A, 0.55));
  var key = new THREE.DirectionalLight(0xFFF3DE, 1.05);
  key.position.set(3, 5, 4);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x41618C, 0.35); // a hint of the Registrar's own atmosphere colour
  rim.position.set(-4, 1, -3);
  scene.add(rim);
  var panelLight = new THREE.PointLight(0xE9CE8A, 0.9, 8);
  panelLight.position.set(0, -2.9, 2);
  scene.add(panelLight);

  var plaque = buildPlaque(THREE, 'One Honest Source Per Student', 4.4, 0.5);
  plaque.mesh.position.set(0, 2.3, 0);
  scene.add(plaque.mesh);

  // The desk — a simple dark surface the record card lies on.
  var desk = new THREE.Mesh(
    new THREE.BoxGeometry(6.6, 0.35, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x241708, metalness: 0.2, roughness: 0.75 })
  );
  desk.position.set(0, -1.55, 0);
  desk.rotation.x = -0.06;
  scene.add(desk);

  // The seal — a squat cylinder on a shortened handle, hanging above
  // the desk until its cycle to descend.
  var seal = new THREE.Group();
  var sealHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.46, 0.28, 28),
    new THREE.MeshStandardMaterial({ color: 0xC6A15B, metalness: 0.75, roughness: 0.28 })
  );
  var sealHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.7, 16),
    new THREE.MeshStandardMaterial({ color: 0x3B2A1D, metalness: 0.2, roughness: 0.7 })
  );
  sealHandle.position.y = 0.45;
  seal.add(sealHead); seal.add(sealHandle);
  var SEAL_REST_Y = 1.75, SEAL_PRESS_Y = -0.2;
  seal.position.set(1.05, SEAL_REST_Y, 0.75);
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

  // ---- The instrument console — a tilted metal plate below the desk,
  // holding every control that used to be a DOM element. ----
  var consoleGroup = new THREE.Group();
  consoleGroup.position.set(0, -2.85, 0.35);
  consoleGroup.rotation.x = -0.22;
  scene.add(consoleGroup);

  var plate = new THREE.Mesh(
    new THREE.BoxGeometry(6.3, 1.75, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x1C1207, metalness: 0.45, roughness: 0.5 })
  );
  consoleGroup.add(plate);
  var plateFrontZ = 0.08 + 0.03;

  var leds = buildLEDRow(THREE, 4, { gap: 0.17 });
  leds.group.position.set(-2.75, 0.55, plateFrontZ);
  consoleGroup.add(leds.group);

  lcd = buildLCDPlane(THREE, 2.2, 0.62, { texH: 176 });
  lcd.group.position.set(-1.15, 0.4, plateFrontZ);
  consoleGroup.add(lcd.group);

  var vu = buildVUStrip(THREE, 10, { maxHeight: 0.55 });
  vu.group.position.set(1.55, 0.15, plateFrontZ);
  consoleGroup.add(vu.group);

  var dial = bindDial(THREE, qualityInput);
  dial.group.position.set(-2.3, -0.45, plateFrontZ + 0.02);
  consoleGroup.add(dial.group);

  var engineSwitch = bindSwitch(THREE, engineInput);
  engineSwitch.group.position.set(-0.85, -0.5, plateFrontZ);
  consoleGroup.add(engineSwitch.group);

  var soundSwitch = bindSwitch(THREE, soundInput);
  soundSwitch.group.position.set(-0.15, -0.5, plateFrontZ);
  consoleGroup.add(soundSwitch.group);

  var guarded = buildGuardedSwitch(THREE);
  guarded.group.position.set(0.65, -0.5, plateFrontZ);
  consoleGroup.add(guarded.group);

  wireRaycast(THREE, canvas, camera, [
    { mesh: dial.hitMesh, onHit: dial.advance },
    { mesh: engineSwitch.hitMesh, onHit: engineSwitch.flip },
    { mesh: soundSwitch.hitMesh, onHit: soundSwitch.flip },
  ]);

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
  var CYCLE = 4600; // ms per record — adjustable by the View dial
  var swayAmplitude = 0.3; // also adjustable by View — how far the camera drifts
  var cur = null, curFace = null, recIdx = 0, sealed = false, curRecordNo = '—';
  // An institutional-record-number-shaped identifier for this
  // demonstration — illustrative, the same way the names on the card
  // are, not a real record number (the Student Registry above issues
  // those for real, tied to an actual student).
  function nextRecordNo() {
    sessionCount++;
    return 'SHRS-REG-2026-' + String(80 + sessionCount).padStart(6, '0');
  }
  function spawnRecord() {
    if (curFace) curFace.texture.dispose();
    curFace = drawRecordFace(RECORDS[recIdx % RECORDS.length]);
    recIdx++;
    sealed = false;
    curRecordNo = nextRecordNo();
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
    setStageDisplay(t, curRecordNo);

    // 0 - 0.22: card flips onto the desk.
    var flipIn = Math.min(t / 0.22, 1);
    var eased = 1 - Math.pow(1 - flipIn, 3);
    cur.rotation.y = -Math.PI / 2 * (1 - eased);

    // 0.3 - 0.5: the seal descends, presses, lifts.
    var pressStart = 0.3, pressEnd = 0.5;
    if (t >= pressStart && t <= pressEnd) {
      var p = (t - pressStart) / (pressEnd - pressStart);
      var down = p < 0.5 ? p * 2 : (1 - p) * 2;
      seal.position.y = SEAL_REST_Y - down * (SEAL_REST_Y - SEAL_PRESS_Y);
      if (!sealed && p >= 0.48) { sealed = true; embossSeal(curFace); playSound(); }
    } else {
      seal.position.y = SEAL_REST_Y;
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
    camera.lookAt(0, -0.9, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || userPaused) return; running = true; raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); }

  if (reduceMotion) {
    var still = spawnRecord();
    still.rotation.y = 0;
    seal.position.y = SEAL_PRESS_Y;
    embossSeal(curFace);
    setStageDisplay(1, curRecordNo);
    camera.lookAt(0, -0.9, 0);
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

  if (soundInput) {
    soundInput.addEventListener('change', function () {
      soundOn = soundInput.checked;
      if (soundOn) { ensureAudioCtx(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }
    });
  }

  // ---- Engine input: a real control — stops the loop outright rather
  // than just muting it, and overrides the IntersectionObserver so
  // scrolling the hero back into view doesn't silently un-pause a
  // deliberate stop. ----
  if (engineInput) {
    if (reduceMotion) {
      engineInput.checked = false;
      engineInput.disabled = true;
      engineInput.title = 'Animation is already stopped — this browser/OS requested reduced motion.';
    } else {
      engineInput.addEventListener('change', function () {
        userPaused = !engineInput.checked;
        if (userPaused) { stop(); if (liveEl) liveEl.textContent = 'Paused.'; }
        else { start(); }
      });
    }
  }

  // ---- View dial: a real control that changes the pace of this
  // demonstration only — never the real registry, which this scene
  // does not touch. ----
  var QUALITY_TIERS = [
    { cycle: 5800, sway: 0.18, moteOpacity: 0.35 },
    { cycle: 4600, sway: 0.3, moteOpacity: 0.5 },
    { cycle: 3600, sway: 0.44, moteOpacity: 0.7 },
  ];
  if (qualityInput) {
    qualityInput.addEventListener('input', function () {
      var tier = QUALITY_TIERS[Number(qualityInput.value)];
      CYCLE = tier.cycle;
      swayAmplitude = tier.sway;
      motes.material.opacity = tier.moteOpacity;
    });
  }
})();
