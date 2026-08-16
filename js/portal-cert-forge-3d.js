// Certificate Forge — the Certificate Generation Centre's industrial
// credential press, recreated faithfully from the uploaded master
// reference (Executive Creative Direction, 2026-08-16): a dark
// chamfered press body with a glowing gold platen mouth, the sheet
// feeding out flat onto a slatted output conveyor toward the camera,
// an angled six-stage finishing panel on the right shoulder (UV Print,
// Laser Seal, Emboss, QR Engrave, Signature, Encryption) whose lamps
// light in sequence as the work passes through them, a crest
// nameplate, gold trim lines, and — behind it — the certification
// laboratory: two idle robot arms and a lit backdrop over a dark
// reflective floor. The reference DEFINES this machine; this file's
// job is only realism, lighting, materials, motion and interaction,
// never a different machine.
//
// Mechanical honesty: the press obeys believable motion. The motor
// spins up before anything moves and spins down after; the feed
// rollers and the media roll turn only while paper is actually
// feeding, at the feed rate; ink exists only where the press has
// printed (the sheet emerges band by band, blank paper beyond the
// printed edge); the finishing beats (laser seal sweep, QR engrave
// flash, signature glint) happen ON the sheet, in order, where those
// features actually sit on the school's real certificate sheets.
//
// System honesty: while a real batch runs, every certificate shown is
// a real row streamed from
// /api/portal/staff/registrar/stage-certificates (see
// js/portal-staff-certificate-centre.js) — the student's actual name,
// their actual SHRS-CERT serial, at the moment the server confirmed
// it. The LCD's stage labels during live work name the server's real
// pipeline for that row. When no batch is in flight the press runs an
// honestly-labelled demonstration loop, exactly as before.
//
// Every interactive piece of the console is a visual skin on a real,
// native, hidden <input> — see js/portal-forge-controls.js. Degrades
// honestly: no WebGL leaves the CSS background; prefers-reduced-motion
// gets a single finished still; the engine switch is a true
// performance mode — off, the scene halts entirely while generation
// itself keeps working at full speed with instant text results.
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
  // What the server genuinely does for each streamed row, in order — see
  // functions/api/portal/staff/registrar/stage-certificates.js's
  // generate_batch loop: matchStudent, ensureStudentIdentityNo,
  // generateStageCertificateSerial (an HMAC-keyed serial), INSERT INTO
  // stage_certificates. A row event arrives after its row has fully
  // completed server-side, so these labels replay the real pipeline of a
  // finished issuance — a description of work done, not an invention of
  // work that never happened.
  var LIVE_STAGES = ['Matching Student Record', 'Assigning Student ID', 'Cryptographic Serial', 'Recorded in Register'];
  // The press's own finishing stations, as named on its shoulder panel
  // in the master reference. These are the SIMULATION's beats — the
  // LCD keeps reporting the real backend pipeline during live batches.
  var FINISH_STAGES = ['UV Print', 'Laser Seal', 'Emboss', 'QR Engrave', 'Signature', 'Encryption'];
  var FINISH_STARTS = [0.10, 0.36, 0.50, 0.62, 0.72, 0.80];
  var lastAnnouncedStage = '';
  var sessionCount = 0;
  var lcd = null; // assigned once the scene builds below

  function setStageDisplay(t, serial, statusOverride, caption, live) {
    var pct = Math.round(Math.min(t, 1) * 100);
    var stageSet = live ? LIVE_STAGES : STAGES;
    var stage = statusOverride || (t >= 0.85 ? (live ? 'Issued' : 'Archived') : stageSet[Math.min(3, Math.floor(t * 4))]);
    if (lcd) {
      lcd.setLines([
        { text: stage, size: 30 },
        { text: serial || '—', size: 26 },
        { text: (caption || 'Session ' + String(sessionCount).padStart(4, '0')) + '   ' + pct + '%', size: 22, caption: true },
      ]);
    }
    if (leds) leds.setActive(Math.min(3, Math.floor(t * 4)));
    if (vu) vu.setLevel(pct / 100);
    if (liveEl && stage !== lastAnnouncedStage) {
      lastAnnouncedStage = stage;
      liveEl.textContent = stage + ', ' + pct + ' percent complete.';
    }
  }

  // ---- Certificate face texture, drawn procedurally (no image asset).
  // The real serial is printed on the sheet itself when one exists. ----
  function drawFaceCanvas(seedName, serial) {
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
    ctx.fillText('SULTAN HANAFI ROYAL SCHOOLS', c.width / 2, 130);
    ctx.font = 'italic 20px Georgia, serif'; ctx.fillStyle = '#7C5430';
    ctx.fillText('This is to certify that', c.width / 2, 215);
    ctx.font = '700 46px Georgia, serif'; ctx.fillStyle = '#221709';
    ctx.fillText(seedName, c.width / 2, 295);
    ctx.font = '18px Georgia, serif'; ctx.fillStyle = '#5A4A38';
    ctx.fillText('has fulfilled every requirement of this institution', c.width / 2, 350);
    ctx.fillText('and is hereby awarded this certificate.', c.width / 2, 380);
    if (serial) {
      ctx.font = '600 20px "Courier New", monospace'; ctx.fillStyle = '#6B4E22';
      ctx.fillText(serial, c.width / 2, 640);
    }
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
    return c;
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
  camera.position.set(0, -0.4, 11.5);

  scene.add(new THREE.AmbientLight(0xE9CE8A, 0.5));
  var key = new THREE.DirectionalLight(0xFFF3DE, 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0xC6A15B, 0.6);
  rim.position.set(-4, 1, -3);
  scene.add(rim);
  var panelLight = new THREE.PointLight(0xE9CE8A, 0.9, 8);
  panelLight.position.set(0, -3.1, 2);
  scene.add(panelLight);
  // The platen mouth's own light, spilling onto the conveyor the way
  // the reference's gold lamp bar does.
  var mouthLight = new THREE.PointLight(0xE9CE8A, 0.7, 5);
  mouthLight.position.set(0, -1.1, 1.4);
  scene.add(mouthLight);

  // A brass plaque in place of what used to be a plain DOM caption.
  var plaque = buildPlaque(THREE, "Where the Institution's Credentials Are Made", 4.4, 0.5);
  plaque.mesh.position.set(0, 2.35, 0);
  scene.add(plaque.mesh);

  // ================= THE LABORATORY =================
  // Dark reflective floor, a lit backdrop, and two idle robot arms —
  // the room the reference places the press inside.
  var floor = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 7),
    new THREE.MeshStandardMaterial({ color: 0x120C05, metalness: 0.75, roughness: 0.35 })
  );
  floor.rotation.x = -Math.PI / 2;
  // The floor ends before the console's station so the console (which
  // sits lower and nearer the camera) is never occluded by it.
  floor.position.set(0, -2.45, -2.4);
  scene.add(floor);

  function drawBackdrop() {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 400;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, '#170E04'); g.addColorStop(1, '#0C0702');
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    // Vertical gold light strips and faint machinery bokeh, as in the
    // reference's out-of-focus laboratory behind the press.
    for (var i = 0; i < 26; i++) {
      var x = 20 + Math.pow((i * 61) % 97 / 97, 1.2) * (c.width - 40);
      var h = 60 + ((i * 37) % 53) * 4;
      var y = 30 + ((i * 29) % 41) * 5;
      ctx.fillStyle = 'rgba(233,206,138,' + (0.05 + ((i * 13) % 7) * 0.02) + ')';
      ctx.fillRect(x, y, 3 + (i % 3), h);
    }
    for (var b = 0; b < 40; b++) {
      var bx = ((b * 211) % 101) / 101 * c.width;
      var by = ((b * 137) % 89) / 89 * c.height;
      ctx.beginPath(); ctx.arc(bx, by, 2 + (b % 4), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(233,206,138,' + (0.03 + (b % 5) * 0.015) + ')';
      ctx.fill();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  var backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 9.5),
    new THREE.MeshBasicMaterial({ map: drawBackdrop(), toneMapped: false, transparent: true, opacity: 0.9 })
  );
  backdrop.position.set(0, 0.6, -4.2);
  scene.add(backdrop);

  function buildRobotArm(side) {
    var group = new THREE.Group();
    var metal = new THREE.MeshStandardMaterial({ color: 0x2A1E0E, metalness: 0.8, roughness: 0.35 });
    var brass = new THREE.MeshStandardMaterial({ color: 0xC6A15B, metalness: 0.85, roughness: 0.3 });
    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.5, 20), metal);
    base.position.y = 0.25;
    group.add(base);
    var shoulder = new THREE.Group();
    shoulder.position.y = 0.5;
    group.add(shoulder);
    var seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.3, 0.22), brass);
    seg1.position.y = 0.65;
    shoulder.add(seg1);
    var elbow = new THREE.Group();
    elbow.position.y = 1.3;
    shoulder.add(elbow);
    var seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), metal);
    seg2.position.y = 0.5;
    elbow.add(seg2);
    var wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.28, 14), brass);
    wrist.position.y = 1.05;
    elbow.add(wrist);
    group.userData.shoulder = shoulder;
    group.userData.elbow = elbow;
    group.userData.phase = side > 0 ? 0 : Math.PI * 0.7;
    shoulder.rotation.z = side * -0.35;
    elbow.rotation.z = side * 0.75;
    return group;
  }
  var armL = buildRobotArm(1); armL.position.set(-4.3, -2.45, -2.2); scene.add(armL);
  var armR = buildRobotArm(-1); armR.position.set(4.3, -2.45, -2.2); scene.add(armR);

  // ================= THE PRESS =================
  // Recreated from the master reference: chamfered dark body, gold
  // trim, crest nameplate, glowing platen mouth with feed rollers, the
  // six-station shoulder panel, and the slatted output conveyor.
  var press = new THREE.Group();
  press.position.set(0, 0, -0.3);
  scene.add(press);

  var bodyMat = new THREE.MeshStandardMaterial({ color: 0x1A1109, metalness: 0.6, roughness: 0.42 });
  var bodyDarkMat = new THREE.MeshStandardMaterial({ color: 0x0F0A04, metalness: 0.55, roughness: 0.5 });
  var trimMat = new THREE.MeshStandardMaterial({ color: 0xE9CE8A, emissive: 0xC6A15B, emissiveIntensity: 0.55, metalness: 0.7, roughness: 0.3 });

  var bodyLower = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.35, 2.2), bodyMat);
  bodyLower.position.set(0, -1.6, 0);
  press.add(bodyLower);
  var bodyUpper = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.15, 1.9), bodyMat);
  bodyUpper.position.set(0, -0.35, -0.15);
  press.add(bodyUpper);
  // The chamfered top-front slab that gives the reference press its
  // angled brow.
  var brow = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.95, 0.14), bodyDarkMat);
  brow.position.set(0, -0.02, 0.78);
  brow.rotation.x = -0.42;
  press.add(brow);
  var lid = new THREE.Mesh(new THREE.BoxGeometry(5.62, 0.1, 1.92), bodyDarkMat);
  lid.position.set(0, 0.27, -0.15);
  press.add(lid);

  // Gold trim lines on the brow edges, as the reference wears them.
  [[-2.7, 0], [2.7, 0]].forEach(function (p) {
    var strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.92, 0.16), trimMat);
    strip.position.set(p[0], -0.02, 0.79);
    strip.rotation.x = -0.42;
    press.add(strip);
  });
  var topStrip = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.045, 0.05), trimMat);
  topStrip.position.set(0, 0.44, 0.6);
  press.add(topStrip);

  // Crest nameplate on the brow — the school's mark and the engine's
  // name, exactly where the reference carries its plate.
  function drawNameplate() {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 176;
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#E9CE8A';
    ctx.font = '700 58px Georgia, serif';
    ctx.fillText('SULTAN HANAFI ROYAL SCHOOLS', 40, 78);
    ctx.font = '400 30px Georgia, serif';
    ctx.fillStyle = 'rgba(233,206,138,0.75)';
    ctx.fillText('INDUSTRIAL CREDENTIAL PRESS · STROMEX ENGINE MK-7', 40, 130);
    // The crest, reduced to a stroke — shield and star.
    ctx.strokeStyle = '#E9CE8A'; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(940, 24); ctx.lineTo(992, 42); ctx.lineTo(992, 96);
    ctx.quadraticCurveTo(992, 136, 940, 152);
    ctx.quadraticCurveTo(888, 136, 888, 96);
    ctx.lineTo(888, 42); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(940, 88, 22, 0, Math.PI * 2); ctx.stroke();
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  var namePlate = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 0.5),
    new THREE.MeshBasicMaterial({ map: drawNameplate(), transparent: true, toneMapped: false })
  );
  namePlate.position.set(-0.85, 0.02, 0.87);
  namePlate.rotation.x = -0.42;
  press.add(namePlate);

  // ---- The platen mouth: recessed throat, gold lamp bar, feed rollers ----
  var throat = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.55, 0.5), new THREE.MeshStandardMaterial({ color: 0x060402, metalness: 0.3, roughness: 0.8 }));
  throat.position.set(0, -1.02, 0.95);
  press.add(throat);
  // The lamp bar — the master reference's single strongest light. Kept
  // as `slotMat` so live-row status tinting keeps working unchanged.
  var slotMat = new THREE.MeshStandardMaterial({ color: 0xE9CE8A, emissive: 0xC6A15B, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.3 });
  var lampBar = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.09, 0.1), slotMat);
  lampBar.position.set(0, -0.86, 1.05);
  press.add(lampBar);
  var rollerMat = new THREE.MeshStandardMaterial({ color: 0x14100A, metalness: 0.75, roughness: 0.3 });
  var rollers = [];
  [[-0.99, 1.02], [-1.18, 0.92]].forEach(function (p) {
    var roller = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 4.0, 18), rollerMat);
    roller.rotation.z = Math.PI / 2;
    roller.position.set(0, p[0], p[1]);
    press.add(roller);
    rollers.push(roller);
  });
  // Roller end collars in brass.
  [-1.95, 1.95].forEach(function (x) {
    rollers.forEach(function (r) {
      var collar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14), trimMat);
      collar.rotation.z = Math.PI / 2;
      collar.position.set(x, r.position.y, r.position.z);
      press.add(collar);
    });
  });

  // The media roll low in the body — the paper the press actually
  // draws from, turning only while feeding.
  var mediaRoll = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 3.8, 22),
    new THREE.MeshStandardMaterial({ color: 0xEDE4D2, roughness: 0.85 })
  );
  mediaRoll.rotation.z = Math.PI / 2;
  mediaRoll.position.set(0, -1.95, 0.55);
  press.add(mediaRoll);
  [-1.95, 1.95].forEach(function (x) {
    var flange = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 20), bodyDarkMat);
    flange.rotation.z = Math.PI / 2;
    flange.position.set(x, -1.95, 0.55);
    press.add(flange);
  });

  // ---- The six-station shoulder panel, angled on the right, lamps
  // lighting as the work passes each station (master reference's
  // right-hand panel). ----
  var stagePanelCanvas = document.createElement('canvas');
  stagePanelCanvas.width = 300; stagePanelCanvas.height = 560;
  var stagePanelTex = new THREE.CanvasTexture(stagePanelCanvas);
  stagePanelTex.colorSpace = THREE.SRGBColorSpace;
  var stagePanelActive = -1;
  function drawStagePanel(activeIdx) {
    var ctx = stagePanelCanvas.getContext('2d');
    ctx.fillStyle = '#0D0803';
    ctx.fillRect(0, 0, 300, 560);
    ctx.strokeStyle = 'rgba(233,206,138,0.4)'; ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, 284, 544);
    for (var i = 0; i < FINISH_STAGES.length; i++) {
      var y = 70 + i * 82;
      var on = i === activeIdx;
      var done = activeIdx > i;
      ctx.beginPath(); ctx.arc(44, y - 10, 13, 0, Math.PI * 2);
      ctx.fillStyle = on ? '#FFE9A8' : (done ? '#8C6834' : '#241A0E');
      ctx.fill();
      ctx.strokeStyle = 'rgba(233,206,138,0.55)'; ctx.lineWidth = 2; ctx.stroke();
      if (on) {
        ctx.beginPath(); ctx.arc(44, y - 10, 20, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,233,168,0.45)'; ctx.stroke();
      }
      ctx.font = '600 27px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = on ? '#FFF6DF' : (done ? '#C6A15B' : 'rgba(233,206,138,0.42)');
      ctx.fillText(FINISH_STAGES[i].toUpperCase(), 76, y);
    }
    stagePanelTex.needsUpdate = true;
  }
  drawStagePanel(-1);
  // Plate and face share one group so the face's lift off the plate is
  // along the panel's own normal — offsetting them separately in world
  // z made the face's edges sink into the plate once rotated.
  var stagePanelGroup = new THREE.Group();
  stagePanelGroup.position.set(2.42, -0.75, 1.0);
  stagePanelGroup.rotation.y = -0.3;
  press.add(stagePanelGroup);
  var stagePanelPlate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.05, 0.08), bodyDarkMat);
  stagePanelGroup.add(stagePanelPlate);
  var stagePanelFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.08, 1.95),
    new THREE.MeshBasicMaterial({ map: stagePanelTex, toneMapped: false })
  );
  stagePanelFace.position.set(0, 0, 0.045);
  stagePanelGroup.add(stagePanelFace);

  // ---- The output conveyor: slatted tray with brass side rails,
  // running from the mouth toward the camera, tilted gently down. ----
  var conveyor = new THREE.Group();
  conveyor.position.set(0, -1.28, 1.1);
  conveyor.rotation.x = 0.32;
  press.add(conveyor);
  var SLATS = 9;
  for (var s = 0; s < SLATS; s++) {
    var slat = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.035, 0.16), s % 2 ? bodyDarkMat : rollerMat);
    slat.position.set(0, 0, 0.18 + s * 0.24);
    conveyor.add(slat);
  }
  [-2.08, 2.08].forEach(function (x) {
    var rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 2.35), trimMat);
    rail.position.set(x, 0.02, 1.2);
    conveyor.add(rail);
  });

  // Ambient dust motes in the mouth light.
  var particleCount = 26;
  var positions = new Float32Array(particleCount * 3);
  for (var p = 0; p < particleCount; p++) {
    positions[p * 3] = (Math.random() - 0.5) * 4.4;
    positions[p * 3 + 1] = -1.6 + Math.random() * 2.4;
    positions[p * 3 + 2] = (Math.random() - 0.5) * 1.6 + 0.8;
  }
  var particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  var particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0xE9CE8A, size: 0.035, transparent: true, opacity: 0.75 }));
  scene.add(particles);

  // ---- Finishing apparatus: the seal laser and the completion burst ----
  var laserMat = new THREE.MeshBasicMaterial({ color: 0x9FE8FF, transparent: true, opacity: 0, toneMapped: false });
  var laser = new THREE.Mesh(new THREE.PlaneGeometry(3.55, 0.05), laserMat);
  scene.add(laser);
  var laserGlowMat = new THREE.MeshBasicMaterial({ color: 0x9FE8FF, transparent: true, opacity: 0, toneMapped: false });
  var laserGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.55, 0.22), laserGlowMat);
  scene.add(laserGlow);
  // The QR engraver's spark point.
  var qrSparkMat = new THREE.MeshBasicMaterial({ color: 0xFFF6DF, transparent: true, opacity: 0, toneMapped: false });
  var qrSpark = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), qrSparkMat);
  scene.add(qrSpark);

  var BURST_N = 42;
  var burstPos = new Float32Array(BURST_N * 3);
  var burstVel = new Float32Array(BURST_N * 3);
  var burstGeo = new THREE.BufferGeometry();
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
  var burstMat = new THREE.PointsMaterial({ color: 0xFFE9A8, size: 0.06, transparent: true, opacity: 0, toneMapped: false });
  var burst = new THREE.Points(burstGeo, burstMat);
  scene.add(burst);
  var burstStart = -1;
  function fireBurst(cx, cy, cz) {
    for (var b = 0; b < BURST_N; b++) {
      burstPos[b * 3] = cx + (Math.random() - 0.5) * 0.4;
      burstPos[b * 3 + 1] = cy + (Math.random() - 0.5) * 0.3;
      burstPos[b * 3 + 2] = cz;
      var ang = Math.random() * Math.PI * 2;
      var speed = 0.4 + Math.random() * 1.4;
      burstVel[b * 3] = Math.cos(ang) * speed;
      burstVel[b * 3 + 1] = Math.abs(Math.sin(ang)) * speed * 0.9 + 0.3;
      burstVel[b * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    burstGeo.attributes.position.needsUpdate = true;
    burstStart = performance.now();
  }
  function updateBurst(now, dtMs) {
    if (burstStart < 0) { burstMat.opacity = 0; return; }
    var age = (now - burstStart) / 900;
    if (age >= 1) { burstStart = -1; burstMat.opacity = 0; return; }
    var dt = Math.min(dtMs, 50) / 1000;
    for (var b = 0; b < BURST_N; b++) {
      burstVel[b * 3 + 1] -= 2.2 * dt; // gravity
      burstPos[b * 3] += burstVel[b * 3] * dt;
      burstPos[b * 3 + 1] += burstVel[b * 3 + 1] * dt;
      burstPos[b * 3 + 2] += burstVel[b * 3 + 2] * dt;
    }
    burstGeo.attributes.position.needsUpdate = true;
    burstMat.opacity = 0.95 * (1 - age);
  }

  // Stage-keyed rim lighting.
  var STAGE_TINTS = [0x8FB4E8, 0xE9CE8A, 0xFFD9A0, 0xB9E7CB];
  var rimTarget = new THREE.Color(0xC6A15B);
  var lastStageIdx = -1;
  var keyPulse = 0;

  // ---- The instrument console — unchanged construction, still the
  // accessible skin over the page's real hidden inputs. ----
  var consoleGroup = new THREE.Group();
  consoleGroup.position.set(0, -3.42, 1.15);
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

  // ================= THE SHEET & ITS MECHANICS =================
  // One certificate per cycle. The sheet's origin is its TOP edge (the
  // edge held in the press's rollers); it extends outward along the
  // conveyor as it feeds, and only the printed portion carries ink —
  // the display canvas is blank paper until the press reaches each band.
  var BANDS = 8;
  var SHEET_W = 3.4, SHEET_H = 2.32;
  var CYCLE = 9000; // ms per certificate — adjustable by the View dial
  var swayAmplitude = 0.35;
  var cur = null, curTex = null, curFull = null, curDisp = null, curBands = -1;
  var nameIdx = 0, curSerial = '—';
  // Mouth grip point in world space (press at z=-0.3; throat front ~z 1.05+(-0.3)).
  var MOUTH = { x: 0, y: -0.98, z: 0.86 };
  var FEED_TILT = -1.22; // lying along the conveyor, face up toward camera
  var PRESENT = { x: 0, y: 1.72, z: 2.0, tilt: -0.1 };

  function nextSerial() {
    sessionCount++;
    return 'SHR-CERT-2026-' + String(40 + sessionCount).padStart(6, '0');
  }
  function spawnCertificate(overrideName, overrideSerial) {
    if (curTex) curTex.dispose();
    var name = overrideName || NAMES[nameIdx % NAMES.length];
    if (!overrideName) nameIdx++;
    curSerial = overrideSerial || nextSerial();
    curFull = drawFaceCanvas(name, overrideSerial || null);
    curDisp = document.createElement('canvas');
    curDisp.width = curFull.width; curDisp.height = curFull.height;
    var dctx = curDisp.getContext('2d');
    dctx.fillStyle = '#F3EBDC';
    dctx.fillRect(0, 0, curDisp.width, curDisp.height);
    curTex = new THREE.CanvasTexture(curDisp);
    curTex.colorSpace = THREE.SRGBColorSpace;
    curBands = -1;
    var geo = new THREE.PlaneGeometry(SHEET_W, SHEET_H, 24, 1);
    geo.translate(0, -SHEET_H / 2, 0); // origin at the top (gripped) edge
    var mat = new THREE.MeshStandardMaterial({ map: curTex, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.05, emissive: 0x000000 });
    if (cur) { scene.remove(cur); cur.geometry.dispose(); cur.material.dispose(); }
    cur = new THREE.Mesh(geo, mat);
    cur.position.set(MOUTH.x, MOUTH.y, MOUTH.z);
    cur.rotation.x = FEED_TILT;
    cur.scale.y = 0.02;
    scene.add(cur);
    return cur;
  }
  function revealBands(n) {
    if (n <= curBands || !curFull) return;
    curBands = Math.min(n, BANDS);
    var h = Math.round(curFull.height * (curBands / BANDS));
    if (h > 0) {
      curDisp.getContext('2d').drawImage(curFull, 0, 0, curFull.width, h, 0, 0, curFull.width, h);
      curTex.needsUpdate = true;
    }
    if (feedTickWanted()) playFeedTick();
  }
  function playSound() { if (window.__certForgeChime) window.__certForgeChime(); }

  // ---- Live generation — driven by the REAL batch this staff member
  // just started, not this scene's own clock. See the header note. ----
  var liveActive = false, liveEnded = false, liveQueue = [], liveCurrent = null, liveCycleMs = CYCLE;
  var LIVE_SHOW_BUDGET_MS = 16000;
  var LIVE_MIN_ROW_MS = 180;
  document.addEventListener('sultan:cert-generate-start', function (e) {
    liveActive = true; liveEnded = false; liveQueue = []; liveCurrent = null;
    var total = (e.detail && e.detail.total) || 1;
    liveCycleMs = Math.max(LIVE_MIN_ROW_MS, Math.min(CYCLE, LIVE_SHOW_BUDGET_MS / total));
    cycleStart = 0; // interrupt the demonstration cycle immediately
    if (userPaused) { userPaused = false; if (engineInput) engineInput.checked = true; }
    start();
  });
  document.addEventListener('sultan:cert-generate-progress', function (e) {
    var d = e.detail;
    if (d && d.type === 'row') liveQueue.push(d);
  });
  document.addEventListener('sultan:cert-generate-end', function () {
    liveEnded = true; // drain the queue, then fall back to idle
  });

  // ================= THE CYCLE =================
  // Phase map (fractions of the cycle):
  //  0.00–0.10  spin-up: motor ramps, lamp brightens, rollers reach speed
  //  0.10–0.62  feed & print: sheet advances band by band out of the mouth
  //  0.62–0.72  QR engrave: the engraver's spark works the QR corner
  //  0.72–0.86  lift & finish: sheet rises to presentation; signature glint
  //  0.80–0.88  seal laser sweep across the presented face
  //  0.86–1.00  present, burst, spin-down; fade at the very end
  var cycleStart = 0;
  var burstFiredThisCycle = false;
  var motorLevel = 0; // 0..1, eased — drives rollers, roll, hum
  function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

  function animateCycle(now, dtMs) {
    var span = liveActive ? liveCycleMs : CYCLE;
    var needNext = !cur || now - cycleStart > span;
    if (needNext) {
      if (liveActive && liveQueue.length) {
        cycleStart = now;
        burstFiredThisCycle = false;
        liveCurrent = liveQueue.shift();
        var shownName = liveCurrent.fullName || liveCurrent.studentFullName || 'Student';
        spawnCertificate(shownName, liveCurrent.serialNo || null);
        var goodTone = liveCurrent.status === 'issued' ? 0xC6A15B : (liveCurrent.status === 'skipped' ? 0x8C6834 : 0x8A3A2E);
        slotMat.emissive.setHex(goodTone);
      } else if (liveActive && liveEnded && !liveQueue.length) {
        liveActive = false; liveCurrent = null;
        slotMat.emissive.setHex(0xC6A15B);
        cycleStart = now;
        burstFiredThisCycle = false;
        spawnCertificate();
      } else if (!liveActive) {
        cycleStart = now;
        burstFiredThisCycle = false;
        spawnCertificate();
      }
      // else: a real batch is running but the next row hasn't arrived yet
      // (network latency) — hold on the last certificate rather than
      // conjure a fake one to fill the gap.
      span = liveActive ? liveCycleMs : CYCLE;
    }
    var t = Math.min((now - cycleStart) / span, 1);
    var statusLabel = liveCurrent && liveCurrent.status !== 'issued'
      ? (liveCurrent.status === 'skipped' ? 'Skipped — already issued' : 'Failed — ' + (liveCurrent.problem || 'see register'))
      : null;
    var caption = liveCurrent
      ? 'Certificate ' + (liveCurrent.index + 1) + ' of ' + liveCurrent.total
      : null;
    setStageDisplay(t, curSerial, statusLabel, caption, !!liveCurrent);

    // ---- Motor: spin up, hold, spin down — nothing moves without it ----
    var motorTarget = t < 0.08 ? t / 0.08 : (t < 0.88 ? 1 : Math.max(0, 1 - (t - 0.88) / 0.1));
    motorLevel += (motorTarget - motorLevel) * Math.min(1, dtMs / 160);
    var feeding = t >= 0.1 && t < 0.62;
    var spin = motorLevel * (feeding ? 1 : 0.25) * dtMs * 0.012;
    rollers.forEach(function (r) { r.rotation.x -= spin; });
    mediaRoll.rotation.x -= feeding ? spin * 0.45 : 0;
    motorUpdate(motorLevel);

    // ---- The lamp works hardest while printing ----
    slotMat.emissiveIntensity = feeding ? 1.1 + Math.sin(now / 50) * 0.3 : 0.6 + motorLevel * 0.3;
    mouthLight.intensity = 0.35 + motorLevel * 0.35 + (feeding ? Math.sin(now / 50) * 0.08 : 0);

    // ---- Sheet mechanics per phase ----
    if (cur) {
      if (t < 0.62) {
        // Feed & print: pinned at the mouth, extending along the conveyor.
        var fp = Math.max(0, (t - 0.1) / 0.52);
        var emerged = 0.02 + easeInOut(fp) * 0.98;
        cur.position.set(MOUTH.x, MOUTH.y, MOUTH.z);
        cur.rotation.x = FEED_TILT;
        cur.scale.y = emerged;
        curTex.repeat.y = emerged;
        curTex.offset.y = 1 - emerged;
        // Ink only where the press has printed: reveal leads emergence
        // by less than one band (the leading margin leaves the mouth
        // blank, as real sheets do).
        revealBands(Math.ceil(Math.min(1, emerged + 0.06) * BANDS));
        cur.material.opacity = 1;
        cur.material.transparent = false;
      } else {
        // Fully fed. Lift from the conveyor to presentation.
        cur.scale.y = 1;
        curTex.repeat.y = 1;
        curTex.offset.y = 0;
        revealBands(BANDS);
        var lp = Math.min(1, (t - 0.62) / 0.16);
        var e = easeOutCubic(lp);
        cur.position.set(
          MOUTH.x + (PRESENT.x - MOUTH.x) * e,
          MOUTH.y + (PRESENT.y - MOUTH.y) * e,
          MOUTH.z + (PRESENT.z - MOUTH.z) * e
        );
        cur.rotation.x = FEED_TILT + (PRESENT.tilt - FEED_TILT) * e;
        cur.material.transparent = t > 0.95;
        cur.material.opacity = t > 0.95 ? 1 - (t - 0.95) / 0.05 : 1;
      }
    }

    // ---- The shoulder panel's stations, in order ----
    var finishIdx = -1;
    for (var fi = FINISH_STARTS.length - 1; fi >= 0; fi--) {
      if (t >= FINISH_STARTS[fi]) { finishIdx = fi; break; }
    }
    if (t >= 0.97) finishIdx = -1; // reset between sheets
    if (finishIdx !== stagePanelActive) {
      stagePanelActive = finishIdx;
      drawStagePanel(finishIdx);
      if (finishIdx >= 0 && spanLongEnough()) playServo();
    }

    // ---- QR engrave beat: the spark works the QR corner of the sheet ----
    if (cur && t >= 0.62 && t < 0.72 && sheetOk()) {
      // The QR sits at the sheet's lower-right (see drawFaceCanvas:
      // ~81% across, ~81% down) — resolved through the sheet's own
      // transform rather than re-derived trigonometry, so the spark
      // stays on the code wherever the sheet is on its lift path.
      cur.updateMatrixWorld();
      var qrLocal = new THREE.Vector3(SHEET_W * 0.31, -SHEET_H * 0.81, 0.03);
      var qrWorld = cur.localToWorld(qrLocal);
      qrSpark.position.copy(qrWorld);
      qrSpark.rotation.x = cur.rotation.x;
      qrSparkMat.opacity = (Math.sin(now / 28) * 0.5 + 0.5) * 0.9;
    } else {
      qrSparkMat.opacity = 0;
    }

    // ---- Seal laser: one sweep down the presented face ----
    var scanPhase = (t - 0.8) / 0.08;
    if (cur && scanPhase > 0 && scanPhase < 1 && sheetOk()) {
      var top = cur.position.y;
      var bottom = cur.position.y - SHEET_H;
      laser.position.set(cur.position.x, top - (top - bottom) * scanPhase, cur.position.z + 0.04);
      laser.rotation.x = cur.rotation.x;
      laserGlow.position.copy(laser.position);
      laserGlow.rotation.x = cur.rotation.x;
      laserMat.opacity = 0.85;
      laserGlowMat.opacity = 0.18;
    } else {
      laserMat.opacity = 0;
      laserGlowMat.opacity = 0;
    }

    // ---- The spark of completion — real issuance only ----
    if (cur && t >= 0.9 && !burstFiredThisCycle && sheetOk()) {
      burstFiredThisCycle = true;
      fireBurst(cur.position.x, cur.position.y - SHEET_H / 2 + 0.3, cur.position.z + 0.1);
      playSound();
    }

    // ---- Stage-cast light on the rim ----
    var stageIdx = Math.min(3, Math.floor(t * 4));
    if (stageIdx !== lastStageIdx) {
      lastStageIdx = stageIdx;
      rimTarget.setHex(STAGE_TINTS[stageIdx]);
      keyPulse = 1;
    }
    rim.color.lerp(rimTarget, 0.06);
    keyPulse *= 0.94;
    key.intensity = 1.1 + keyPulse * 0.35;
  }
  function sheetOk() { return !liveCurrent || liveCurrent.status === 'issued'; }
  function spanLongEnough() { return (liveActive ? liveCycleMs : CYCLE) > 900; }
  function feedTickWanted() { return soundOn && spanLongEnough(); }

  var raf = null, running = false, userPaused = false;
  var lastTs = 0, camZ = 11.5;
  function frame(ts) {
    if (!running) return;
    var dtMs = lastTs ? ts - lastTs : 16;
    lastTs = ts;
    animateCycle(ts, dtMs);
    updateBurst(ts, dtMs);
    particles.rotation.y += 0.0008;
    // The laboratory keeps living: the arms drift through a slow idle.
    [armL, armR].forEach(function (arm) {
      var ph = ts / 5200 + arm.userData.phase;
      arm.userData.shoulder.rotation.y = Math.sin(ph) * 0.4;
      arm.userData.elbow.rotation.z = (arm === armL ? 1 : -1) * (0.75 + Math.sin(ph * 1.3) * 0.12);
    });
    // The camera never sits still: lateral sway, a breathing dolly, a
    // push-in while a real batch runs.
    var camZTarget = (liveActive ? 10.3 : 11.5) + Math.sin(ts / 13000) * 0.18;
    camZ += (camZTarget - camZ) * 0.02;
    camera.position.z = camZ;
    camera.position.x = Math.sin(ts / 9000) * swayAmplitude;
    camera.position.y = -0.4 + Math.sin(ts / 11000) * 0.08;
    camera.lookAt(0, -0.65, 0.4);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || userPaused) return;
    running = true;
    lastTs = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    motorUpdate(0);
  }

  if (reduceMotion) {
    var still = spawnCertificate();
    still.position.set(PRESENT.x, PRESENT.y, PRESENT.z);
    still.rotation.x = PRESENT.tilt;
    still.scale.y = 1;
    revealBands(BANDS);
    drawStagePanel(FINISH_STAGES.length - 1);
    setStageDisplay(1, curSerial);
    camera.lookAt(0, -0.65, 0.4);
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

  // ================= SOUND =================
  // All synthesised — no audio files — and all gated behind the
  // console's opt-in sound switch. The motor is a sustained hum whose
  // level follows the simulation's real motor state; the servo and
  // feed ticks mark station changes and band advances; the chime
  // marks completion.
  var audioCtx = null, soundOn = false;
  function ensureAudioCtx() {
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }
  var motorNodes = null;
  function motorUpdate(level) {
    if (!soundOn || !running) level = 0;
    if (level > 0.02 && !motorNodes) {
      var ctx = ensureAudioCtx();
      if (!ctx) return;
      var osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 62;
      var osc2 = ctx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.value = 124;
      var filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 260; filter.Q.value = 0.8;
      var gain = ctx.createGain(); gain.gain.value = 0;
      osc.connect(filter); osc2.connect(filter); filter.connect(gain).connect(ctx.destination);
      osc.start(); osc2.start();
      motorNodes = { osc: osc, osc2: osc2, gain: gain, filter: filter };
    }
    if (motorNodes) {
      var ctx2 = audioCtx;
      var target = Math.max(0, Math.min(1, level)) * 0.035;
      motorNodes.gain.gain.setTargetAtTime(target, ctx2.currentTime, 0.12);
      motorNodes.osc.frequency.setTargetAtTime(58 + level * 26, ctx2.currentTime, 0.2);
      if (level <= 0.02) {
        var nodes = motorNodes; motorNodes = null;
        window.setTimeout(function () {
          try { nodes.osc.stop(); nodes.osc2.stop(); } catch (err) { /* already stopped */ }
        }, 600);
      }
    }
  }
  function playServo() {
    if (!soundOn) return;
    var ctx = ensureAudioCtx();
    if (!ctx) return;
    var t0 = ctx.currentTime;
    var len = 0.22;
    var buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
    bp.frequency.setValueAtTime(600, t0);
    bp.frequency.linearRampToValueAtTime(1500, t0 + len * 0.6);
    bp.frequency.linearRampToValueAtTime(700, t0 + len);
    var g = ctx.createGain(); g.gain.value = 0.03;
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t0);
  }
  function playFeedTick() {
    var ctx = ensureAudioCtx();
    if (!ctx) return;
    var t0 = ctx.currentTime;
    var osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = 1350;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.016, t0);
    g.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.035);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + 0.04);
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
  // Kept for compatibility with anything already calling it — the
  // press's own sounds now come from the motor/servo/tick set above.
  window.__certForgePrintWhirr = playServo;

  if (soundInput) {
    soundInput.addEventListener('change', function () {
      soundOn = soundInput.checked;
      if (soundOn) { ensureAudioCtx(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }
      else motorUpdate(0);
    });
  }

  // ---- Engine input: the true Performance Mode switch — off halts
  // the whole simulation (instant, animation-free working; generation
  // itself is untouched and results render as plain text immediately),
  // on restores the full cinematic press. Overrides the
  // IntersectionObserver so scrolling back into view doesn't silently
  // un-pause a deliberate stop. ----
  if (engineInput) {
    if (reduceMotion) {
      engineInput.checked = false;
      engineInput.disabled = true;
      engineInput.title = 'Animation is already stopped — this browser/OS requested reduced motion.';
    } else {
      engineInput.addEventListener('change', function () {
        userPaused = !engineInput.checked;
        if (userPaused) { stop(); if (liveEl) liveEl.textContent = 'Paused — performance mode. Generation still runs at full speed.'; }
        else { start(); }
      });
    }
  }

  // ---- View dial: pace/atmosphere of this demonstration only — never
  // the real certificate-generation engine, which this scene does not
  // touch. ----
  var QUALITY_TIERS = [
    { cycle: 11000, sway: 0.2, particleOpacity: 0.55 },
    { cycle: 9000, sway: 0.35, particleOpacity: 0.75 },
    { cycle: 7200, sway: 0.5, particleOpacity: 0.95 },
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
