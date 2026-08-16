// Certificate Forge — a real, running Three.js scene for the Certificate
// Generation Centre hero: a stylised certificate lifting from a print
// slot, gold-bordered and text-bearing, on a loop. This is genuine 3D
// (real depth, real lighting, a real material response on the gold
// trim) rendered live in the browser — not a photorealistic pre-rendered
// film, which real-time WebGL cannot produce, and not a video file,
// which this static site has no pipeline to author. Self-hosted
// (js/vendor/three/three.module.min.js, MIT-licensed, no CDN
// dependency) so the page never depends on a third party being up.
//
// Degrades honestly: no WebGL, a failed module load, or
// prefers-reduced-motion all fall back to a single still frame (reduced
// motion) or the plain CSS background (no WebGL) — never a blank box.
import * as THREE from '/js/vendor/three/three.module.min.js';

(function () {
  var mount = document.querySelector('[data-cert-forge]');
  var canvas = document.querySelector('[data-cert-forge-canvas]');
  if (!mount || !canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Certificate face texture, drawn procedurally (no image asset) ----
  function drawCertificateFace(seedName) {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 700;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#F7EEDF';
    ctx.fillRect(0, 0, c.width, c.height);
    // Gold double-rule border
    ctx.strokeStyle = '#C6A15B'; ctx.lineWidth = 10;
    ctx.strokeRect(28, 28, c.width - 56, c.height - 56);
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, c.width - 96, c.height - 96);
    // Corner marks
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
    // A small QR-like grid, drawn not decoded — a mark, not a real code
    var qx = c.width - 190, qy = c.height - 190, cell = 8;
    for (var i = 0; i < 14; i++) {
      for (var j = 0; j < 14; j++) {
        if ((i * 7 + j * 13) % 5 === 0) { ctx.fillStyle = '#221709'; ctx.fillRect(qx + i * cell, qy + j * cell, cell - 1, cell - 1); }
      }
    }
    // Wax-seal medallion
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
  var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.4, 7.5);

  scene.add(new THREE.AmbientLight(0xE9CE8A, 0.55));
  var key = new THREE.DirectionalLight(0xFFF3DE, 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0xC6A15B, 0.6);
  rim.position.set(-4, 1, -3);
  scene.add(rim);

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

  // Gold sparkle particles near the slot.
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

  function resize() {
    var w = mount.clientWidth, h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // The hero starts inside [data-portal-content], which is `hidden`
    // until sign-in resolves — this element has zero size until then,
    // so the first real resize() happens later, via this same
    // ResizeObserver callback. Outside the running animation loop
    // (reduced motion, or not yet started) nothing else will repaint
    // the new size, so do it here.
    if (!running) renderer.render(scene, camera);
  }
  var ro = ('ResizeObserver' in window) ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(mount); else window.addEventListener('resize', resize);
  resize();

  // ---- The certificate emergence cycle ----
  var CYCLE = 4200; // ms per certificate
  var cur = null, curTex = null, nameIdx = 0;
  function spawnCertificate() {
    if (curTex) curTex.dispose();
    curTex = drawCertificateFace(NAMES[nameIdx % NAMES.length]);
    nameIdx++;
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

  var cycleStart = 0;
  function animateCycle(now) {
    if (!cur || now - cycleStart > CYCLE) {
      cycleStart = now;
      spawnCertificate();
      playSound();
    }
    var t = Math.min((now - cycleStart) / CYCLE, 1);
    // Ease out for the rise, hold, then a gentle fade/slide-away in the last 20%.
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

  var raf = null, running = false;
  function frame(ts) {
    if (!running) return;
    animateCycle(ts);
    particles.rotation.y += 0.0008;
    camera.position.x = Math.sin(ts / 9000) * 0.35;
    camera.lookAt(0, -0.4, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  }

  if (reduceMotion) {
    // A single, finished frame: the certificate fully emerged, nothing moving.
    var still = spawnCertificate();
    still.position.y = 0.6; still.scale.y = 1; still.rotation.x = 0;
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
    // A soft paper-riffle: filtered noise burst.
    var bufferSize = ctx.sampleRate * 0.18;
    var buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    var noise = ctx.createBufferSource(); noise.buffer = buf;
    var noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'highpass'; noiseFilter.frequency.value = 1800;
    var noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(0.06, t0); noiseGain.gain.linearRampToValueAtTime(0, t0 + 0.18);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
    noise.start(t0);
    // A short gold chime.
    var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(880, t0 + 0.1);
    var oscGain = ctx.createGain(); oscGain.gain.setValueAtTime(0, t0 + 0.1);
    oscGain.gain.linearRampToValueAtTime(0.05, t0 + 0.13);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(t0 + 0.1); osc.stop(t0 + 0.75);
  };

  var soundBtn = document.querySelector('[data-cert-forge-sound]');
  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      soundOn = !soundOn;
      soundBtn.setAttribute('aria-pressed', String(soundOn));
      soundBtn.textContent = soundOn ? '🔊 Sound: On' : '🔈 Sound: Off';
      if (soundOn) { ensureAudioCtx(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }
    });
  }
})();
