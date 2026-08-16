// Certificate Forge — a real, running Three.js scene for the Certificate
// Generation Centre hero: a stylised certificate lifting from a print
// slot, gold-bordered and text-bearing, on a loop, above a real 3D
// instrument console — a rotating dial, physical switch levers, an
// emissive VU meter, and LCD readouts, all built from actual geometry
// and lit by the scene's own lights. This is genuine 3D (real depth,
// real lighting, a real material response on the gold trim) rendered
// live in the browser — not a photorealistic pre-rendered film, which
// real-time WebGL cannot produce, and not a video file, which this
// static site has no pipeline to author, and not a DOM control panel
// standing in for one with CSS gradients. Self-hosted (js/vendor/
// three/three.module.min.js, MIT-licensed, no CDN dependency) so the
// page never depends on a third party being up.
//
// Every interactive piece of the console is a visual skin on a real,
// native, hidden <input> (a checkbox per switch, a range for the
// dial) — see js/portal-forge-controls.js's header for why: the input
// is the single source of truth, keyboard/screen-reader operable, and
// a raycast hit on a 3D mesh does nothing but set that input's value
// and dispatch the same event a real interaction would.
//
// Degrades honestly: no WebGL, a failed module load, or
// prefers-reduced-motion all fall back to a single still frame (reduced
// motion) or the plain CSS background (no WebGL) — never a blank box.
import * as THREE from '/js/vendor/three/three.module.min.js';
import { buildLCDPlane, buildVUStrip, buildLEDRow, bindDial, bindSwitch, buildGuardedSwitch, buildPlaque, wireRaycast } from '/js/portal-forge-controls.js';

(function () {
  var mount = document.querySelector('[data-cert-forge]');
  var canvas = document.querySelector('[data-cert-forge-canvas]');
  if (!mount || !canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Accessible source-of-truth inputs (visually hidden — see
  // .pr-sr in css/prestige.css — the 3D console is a skin on these) ----
  var soundInput = document.querySelector('[data-cert-forge-sound]');
  var engineInput = document.querySelector('[data-cert-forge-pause]');
  var qualityInput = document.querySelector('[data-cert-forge-quality]');
  var liveEl = document.querySelector('[data-cert-forge-live]');

  var STAGES = ['Validating Identity', 'Cryptographic Signing', 'Embossing Seal', 'Publishing Verification'];
  var lastAnnouncedStage = '';
  var sessionCount = 0;
  var lcd = null; // assigned once the scene builds below

  function setStageDisplay(t, serial, statusOverride) {
    var pct = Math.round(Math.min(t, 1) * 100);
    var stage = statusOverride || (t >= 0.85 ? 'Archived' : STAGES[Math.min(3, Math.floor(t * 4))]);
    if (lcd) {
      lcd.setLines([
        { text: stage, size: 30 },
        { text: serial || '—', size: 26 },
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

  // ---- Certificate face texture, drawn procedurally (no image asset) ----
  function drawCertificateFace(seedName) {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 700;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#F7EEDF';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#C6A15B'; ctx.lineWidth = 10;
    ctx.strokeRect(28, 28, c.width - 56, c.height - 56);
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, c.width - 96, c.height - 96);
    [[70, 70], [c.width - 70, 70], [70, c.height - 70], [c.width - 70, c.height - 70]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, Math.PI * 2); ctx.fillStyle = '#C6A15B'; ctx.fill();
    });
    ctx.textAlign = 'center'; ctx.fillStyle = '#3B2A1D';
    ctx.font = '600 26px Georgia, serif';
    ctx.fillText('SULTAN HANAFI ROYAL SCHOOLS', c.width / 2, 140);
    ctx.font = 'italic 20px Georgia, serif'; ctx.fillStyle = '#7C5430';
    ctx.fillText('This is to certify that', c.width / 2, 230);
    ctx.font = '700 46px Georgia, serif'; ctx.fillStyle = '#221709';
    ctx.fillText(seedName, c.width / 2, 310);
    ctx.font = '18px Georgia, serif'; ctx.fillStyle = '#5A4A38';
    ctx.fillText('has fulfilled every requirement of this institution', c.width / 2, 370);
    ctx.fillText('and is hereby awarded this certificate.', c.width / 2, 400);
    var qx = c.width - 190, qy = c.height - 190, cell = 8;
    for (var i = 0; i < 14; i++) {
      for (var j = 0; j < 14; j++) {
        if ((i * 7 + j * 13) % 5 === 0) { ctx.fillStyle = '#221709'; ctx.fillRect(qx + i * cell, qy + j * cell, cell - 1, cell - 1); }
      }
    }
    var sx = 190, sy = c.height - 150;
    var grad = ctx.createRadialGradient(sx, sy, 4, sx, sy, 46);
    grad.addColorStop(0, '#E9CE8A'); grad.addColorStop(1, '#9C7A3C');
    ctx.beginPath(); ctx.arc(sx, sy, 46, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = '#3B2A1D'; ctx.lineWidth = 2; ctx.stroke();
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  var NAMES = ['Abdul Samod A. Jimoh', 'Aisha Bello', 'Ibrahim Suleiman', 'Zainab Yusuf', 'Ahmad Olawale'];

  // ---- Scene ----
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (err) {
    return; // No WebGL — the plain CSS background under the canvas carries the section.
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  camera.position.set(0, -0.5, 11.5);

  scene.add(new THREE.AmbientLight(0xE9CE8A, 0.55));
  var key = new THREE.DirectionalLight(0xFFF3DE, 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0xC6A15B, 0.6);
  rim.position.set(-4, 1, -3);
  scene.add(rim);
  var panelLight = new THREE.PointLight(0xE9CE8A, 0.9, 8);
  panelLight.position.set(0, -3.1, 2);
  scene.add(panelLight);

  // A brass plaque in place of what used to be a plain DOM caption.
  var plaque = buildPlaque(THREE, "Where the Institution's Credentials Are Made", 4.4, 0.5);
  plaque.mesh.position.set(0, 2.2, 0);
  scene.add(plaque.mesh);

  // The printer housing — a simple dark plate with a lit slot, just
  // enough geometry to read as "an apparatus," not a literal printer
  // model.
  var housingMat = new THREE.MeshStandardMaterial({ color: 0x241708, metalness: 0.3, roughness: 0.6 });
  var housing = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.5, 2), housingMat);
  housing.position.set(0, -2.05, 0);
  scene.add(housing);
  var slotMat = new THREE.MeshStandardMaterial({ color: 0xE9CE8A, emissive: 0xC6A15B, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 });
  var slot = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.05, 0.4), slotMat);
  slot.position.set(0, -1.79, 0.4);
  scene.add(slot);

  var particleCount = 26;
  var positions = new Float32Array(particleCount * 3);
  for (var p = 0; p < particleCount; p++) {
    positions[p * 3] = (Math.random() - 0.5) * 4.4;
    positions[p * 3 + 1] = -1.7 + Math.random() * 2.2;
    positions[p * 3 + 2] = (Math.random() - 0.5) * 1.6 + 0.3;
  }
  var particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  var particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0xE9CE8A, size: 0.035, transparent: true, opacity: 0.75 }));
  scene.add(particles);

  // ---- The instrument console — a tilted metal plate below the
  // housing, holding every control that used to be a DOM element. ----
  var consoleGroup = new THREE.Group();
  consoleGroup.position.set(0, -3.35, 0.35);
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

  // ---- The certificate emergence cycle ----
  var CYCLE = 4200; // ms per certificate — adjustable by the View dial
  var swayAmplitude = 0.35; // also adjustable by View — how far the camera drifts
  var cur = null, curTex = null, nameIdx = 0, curSerial = '—';
  // A realistic-looking serial in the format used elsewhere on this
  // site (SHR-XXX-YYYY-000001) — illustrative for this demonstration,
  // the same way the names on the certificate are, not a real issued
  // number (the Certificate Register below issues those for real).
  function nextSerial() {
    sessionCount++;
    return 'SHR-CERT-2026-' + String(40 + sessionCount).padStart(6, '0');
  }
  function spawnCertificate(overrideName, overrideSerial) {
    if (curTex) curTex.dispose();
    var name = overrideName || NAMES[nameIdx % NAMES.length];
    curTex = drawCertificateFace(name);
    if (!overrideName) nameIdx++;
    curSerial = overrideSerial || nextSerial();
    var geo = new THREE.PlaneGeometry(3.4, 2.32, 24, 1);
    var mat = new THREE.MeshStandardMaterial({ map: curTex, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.05 });
    if (cur) { scene.remove(cur); cur.geometry.dispose(); cur.material.dispose(); }
    cur = new THREE.Mesh(geo, mat);
    cur.position.set(0, -1.9, 0.4);
    cur.rotation.x = -0.15;
    scene.add(cur);
    return cur;
  }
  function playSound() { if (window.__certForgeChime) window.__certForgeChime(); }

  // ---- Live generation — driven by the REAL batch this staff member
  // just started, not this scene's own clock.
  // js/portal-staff-certificate-centre.js's postGenerateBatch() streams
  // one 'sultan:cert-generate-progress' CustomEvent per student as the
  // server actually issues them (see that file, and functions/api/
  // portal/staff/registrar/stage-certificates.js's generate_batch
  // action) — plain document-level events, not a module import, so this
  // scene has no hard dependency on that page's script existing, and the
  // reverse is equally true: certificate generation works with WebGL
  // unavailable, this scene simply never receives the events.
  //   The ambient loop above (spawnCertificate() with no arguments,
  // nextSerial()'s fabricated number) is unchanged and keeps running
  // whenever no real batch is in flight — it was always honestly labelled
  // as illustrative, and stays that way. Only while liveActive is true
  // does this scene stop inventing names and serials and start drawing
  // the ones actually returned by the server.
  var liveActive = false, liveEnded = false, liveQueue = [], liveCurrent = null, liveCycleMs = CYCLE;
  var LIVE_SHOW_BUDGET_MS = 16000; // a 500-row batch should not take 35 real minutes to finish watching
  var LIVE_MIN_ROW_MS = 180;
  document.addEventListener('sultan:cert-generate-start', function (e) {
    liveActive = true; liveEnded = false; liveQueue = []; liveCurrent = null;
    var total = (e.detail && e.detail.total) || 1;
    liveCycleMs = Math.max(LIVE_MIN_ROW_MS, Math.min(CYCLE, LIVE_SHOW_BUDGET_MS / total));
    // Interrupt the ambient cycle NOW rather than letting the current
    // illustrative sheet finish its 4-second rise while real issuance is
    // already underway — zeroing the clock makes the next frame spawn
    // from the live queue the moment its first row lands.
    cycleStart = 0;
    if (userPaused) { userPaused = false; if (engineInput) engineInput.checked = true; }
    start();
  });
  document.addEventListener('sultan:cert-generate-progress', function (e) {
    var d = e.detail;
    if (d && d.type === 'row') liveQueue.push(d);
  });
  document.addEventListener('sultan:cert-generate-end', function () {
    liveEnded = true; // the queue may still hold un-shown rows — drain it, then fall back to idle
  });

  var cycleStart = 0;
  function animateCycle(now) {
    var needNext = !cur || now - cycleStart > (liveActive ? liveCycleMs : CYCLE);
    if (needNext) {
      if (liveActive && liveQueue.length) {
        cycleStart = now;
        liveCurrent = liveQueue.shift();
        var shownName = liveCurrent.fullName || liveCurrent.studentFullName || 'Student';
        spawnCertificate(shownName, liveCurrent.serialNo || null);
        var goodTone = liveCurrent.status === 'issued' ? 0xC6A15B : (liveCurrent.status === 'skipped' ? 0x8C6834 : 0x8A3A2E);
        slotMat.emissive.setHex(goodTone);
        playSound();
      } else if (liveActive && liveEnded && !liveQueue.length) {
        liveActive = false; liveCurrent = null;
        slotMat.emissive.setHex(0xC6A15B);
        cycleStart = now;
        spawnCertificate();
        playSound();
      } else if (!liveActive) {
        cycleStart = now;
        spawnCertificate();
        playSound();
      }
      // else: a real batch is running but the next row hasn't arrived yet
      // (network latency) — hold on the last certificate rather than
      // conjure a fake one to fill the gap.
    }
    var span = liveActive ? liveCycleMs : CYCLE;
    var t = Math.min((now - cycleStart) / span, 1);
    var statusLabel = liveCurrent && liveCurrent.status !== 'issued'
      ? (liveCurrent.status === 'skipped' ? 'Skipped — already issued' : 'Failed — ' + (liveCurrent.problem || 'see register'))
      : null;
    setStageDisplay(t, curSerial, statusLabel);
    var rise = Math.min(t / 0.55, 1);
    var eased = 1 - Math.pow(1 - rise, 3);
    var y = -1.9 + eased * 2.5;
    var unfurl = Math.min(0.15 + eased * 0.85, 1);
    cur.position.y = y;
    cur.scale.y = unfurl;
    cur.rotation.x = -0.15 * (1 - eased);
    cur.material.opacity = 1;
    cur.material.transparent = t > 0.82;
    if (t > 0.82) cur.material.opacity = 1 - (t - 0.82) / 0.18;
  }

  var raf = null, running = false, userPaused = false;
  function frame(ts) {
    if (!running) return;
    animateCycle(ts);
    particles.rotation.y += 0.0008;
    camera.position.x = Math.sin(ts / 9000) * swayAmplitude;
    camera.lookAt(0, -0.9, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || userPaused) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  }

  if (reduceMotion) {
    var still = spawnCertificate();
    still.position.y = 0.6; still.scale.y = 1; still.rotation.x = 0;
    setStageDisplay(1, curSerial);
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

  // ---- Optional chime, synthesised (no audio file to import) ----
  var audioCtx = null, soundOn = false;
  function ensureAudioCtx() {
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }
  window.__certForgeChime = function () {
    if (!soundOn) return;
    var ctx = ensureAudioCtx();
    if (!ctx) return;
    var t0 = ctx.currentTime;
    var bufferSize = ctx.sampleRate * 0.18;
    var buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    var noise = ctx.createBufferSource(); noise.buffer = buf;
    var noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'highpass'; noiseFilter.frequency.value = 1800;
    var noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(0.06, t0); noiseGain.gain.linearRampToValueAtTime(0, t0 + 0.18);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
    noise.start(t0);
    var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(880, t0 + 0.1);
    var oscGain = ctx.createGain(); oscGain.gain.setValueAtTime(0, t0 + 0.1);
    oscGain.gain.linearRampToValueAtTime(0.05, t0 + 0.13);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(t0 + 0.1); osc.stop(t0 + 0.75);
  };

  if (soundInput) {
    soundInput.addEventListener('change', function () {
      soundOn = soundInput.checked;
      if (soundOn) { ensureAudioCtx(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }
    });
  }

  // ---- Engine input: a real control, not decorative — stops the loop
  // outright rather than just muting it, and overrides the
  // IntersectionObserver so scrolling the hero back into view doesn't
  // silently un-pause a deliberate stop. ----
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
  // demonstration only — never the real certificate-generation engine,
  // which this scene does not touch. ----
  var QUALITY_TIERS = [
    { cycle: 5200, sway: 0.2, particleOpacity: 0.55 },
    { cycle: 4200, sway: 0.35, particleOpacity: 0.75 },
    { cycle: 3400, sway: 0.5, particleOpacity: 0.95 },
  ];
  if (qualityInput) {
    qualityInput.addEventListener('input', function () {
      var tier = QUALITY_TIERS[Number(qualityInput.value)];
      CYCLE = tier.cycle;
      swayAmplitude = tier.sway;
      particles.material.opacity = tier.particleOpacity;
    });
  }
})();
