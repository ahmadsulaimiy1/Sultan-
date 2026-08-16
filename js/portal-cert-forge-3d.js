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
    // NOTE deliberately absent: no aria-live writes here. The idle
    // demonstration used to narrate itself into the live region five
    // times per cycle, forever — perpetual screen-reader interruption
    // from decorative motion (confirmed in adversarial review). Real
    // batches announce per ROW, throttled, where the row is consumed;
    // the demonstration is silent to assistive tech.
  }

  // ---- Certificate face texture, drawn procedurally (no image asset).
  // The face is CONSTRUCTED in stages, exactly as the finishing
  // stations claim: the press prints the base (border, wording, name,
  // serial); the Emboss station stamps the seal; the QR Engrave
  // station burns the code; the Signature station applies the hand.
  // Until a station has run, its element does not exist on the sheet —
  // the registrar watches the document being built, layer by layer. ----
  function drawFaceCanvas(seedName, serial, built) {
    built = built || {};
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
    if (built.qr) {
      var qx = c.width - 190, qy = c.height - 190, cell = 8;
      for (var i = 0; i < 14; i++) {
        for (var j = 0; j < 14; j++) {
          if ((i * 7 + j * 13) % 5 === 0) { ctx.fillStyle = '#221709'; ctx.fillRect(qx + i * cell, qy + j * cell, cell - 1, cell - 1); }
        }
      }
    }
    if (built.seal) {
      var sx = 190, sy = c.height - 150;
      var grad = ctx.createRadialGradient(sx, sy, 4, sx, sy, 46);
      grad.addColorStop(0, '#E9CE8A'); grad.addColorStop(1, '#9C7A3C');
      ctx.beginPath(); ctx.arc(sx, sy, 46, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = '#3B2A1D'; ctx.lineWidth = 2; ctx.stroke();
      // The embossed ring the press's die leaves around the wax.
      ctx.beginPath(); ctx.arc(sx, sy, 58, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(156,122,60,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    }
    if (built.signature) {
      // The registrar's hand — a drawn stroke, not a font.
      var bx = c.width / 2 - 110, by = 560;
      ctx.strokeStyle = '#2A1C10'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.bezierCurveTo(bx + 40, by - 46, bx + 62, by + 18, bx + 96, by - 14);
      ctx.bezierCurveTo(bx + 126, by - 40, bx + 150, by + 12, bx + 186, by - 6);
      ctx.quadraticCurveTo(bx + 208, by - 16, bx + 222, by - 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(59,42,29,0.65)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(c.width / 2 - 140, 580); ctx.lineTo(c.width / 2 + 140, 580); ctx.stroke();
      ctx.font = '15px Georgia, serif'; ctx.fillStyle = '#5A4A38';
      ctx.fillText('Registrar', c.width / 2, 602);
    }
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

  // ---- The emboss station: a gantry astride the conveyor whose
  // hydraulic die descends onto the sheet as it passes — the moment
  // the wax seal comes into existence on the face. Heavy motion:
  // the die accelerates down, lands with a thud and a camera shudder,
  // dwells, and withdraws. ----
  var emboss = new THREE.Group();
  emboss.position.set(0, 0, 2.05);
  scene.add(emboss);
  [-2.35, 2.35].forEach(function (x) {
    var post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 0.16), bodyDarkMat);
    post.position.set(x, -1.15, 0);
    emboss.add(post);
  });
  var crossbar = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.22, 0.3), bodyMat);
  crossbar.position.set(0, -0.35, 0);
  emboss.add(crossbar);
  var crossTrim = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.035, 0.31), trimMat);
  crossTrim.position.set(0, -0.24, 0);
  emboss.add(crossTrim);
  // A fixed guide rod descends from the crossbar; the die travels
  // along it — the rod never moves, the die does, as a real press's.
  var guideRod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.15, 12), rollerMat);
  guideRod.position.set(-1.06, -0.98, 0);
  emboss.add(guideRod);
  var piston = new THREE.Group();
  var pistonCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 14), bodyDarkMat);
  pistonCollar.position.y = 0.14;
  piston.add(pistonCollar);
  var pistonHead = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 18), trimMat);
  piston.add(pistonHead);
  // The die hangs over the seal's own printed position on the sheet.
  piston.position.set(-1.06, -0.62, 0);
  emboss.add(piston);
  var PISTON_REST = -0.62, PISTON_STRIKE = -1.36;

  // Status lamps on the body — alive even at idle.
  var idleLamps = [];
  [1.55, 1.8, 2.05].forEach(function (x, i) {
    var lampMat = new THREE.MeshBasicMaterial({ color: i === 2 ? 0xB9E7CB : 0xE9CE8A, transparent: true, opacity: 0.6, toneMapped: false });
    var lamp = new THREE.Mesh(new THREE.CircleGeometry(0.035, 10), lampMat);
    lamp.position.set(x, -1.35, 1.06);
    press.add(lamp);
    idleLamps.push({ mat: lampMat, phase: i * 2.1 });
  });

  // ---- Steam at the mouth as a finished sheet clears — slow, soft,
  // rising, nothing like the sparks. ----
  var STEAM_N = 22;
  var steamPos = new Float32Array(STEAM_N * 3);
  var steamGeo = new THREE.BufferGeometry();
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
  var steamMat = new THREE.PointsMaterial({ color: 0xF7EEDF, size: 0.11, transparent: true, opacity: 0, toneMapped: false });
  var steam = new THREE.Points(steamGeo, steamMat);
  scene.add(steam);
  var steamStart = -1;
  function fireSteam() {
    for (var s2 = 0; s2 < STEAM_N; s2++) {
      steamPos[s2 * 3] = (Math.random() - 0.5) * 3.2;
      steamPos[s2 * 3 + 1] = -1.0 + (Math.random() - 0.5) * 0.2;
      steamPos[s2 * 3 + 2] = 0.9 + Math.random() * 0.5;
    }
    steamGeo.attributes.position.needsUpdate = true;
    steamStart = performance.now();
  }
  function updateSteam(now, dtMs) {
    if (steamStart < 0) { steamMat.opacity = 0; return; }
    var age = (now - steamStart) / 1700;
    if (age >= 1) { steamStart = -1; steamMat.opacity = 0; return; }
    var dt = Math.min(dtMs, 50) / 1000;
    for (var s3 = 0; s3 < STEAM_N; s3++) {
      steamPos[s3 * 3 + 1] += (0.35 + (s3 % 5) * 0.06) * dt;
      steamPos[s3 * 3] += Math.sin(now / 700 + s3) * 0.04 * dt;
    }
    steamGeo.attributes.position.needsUpdate = true;
    steamMat.opacity = 0.4 * Math.sin(Math.min(age * Math.PI, Math.PI));
  }

  // ---- The archival folder: the finished certificate is packaged,
  // not merely faded — a crested folder rises to receive the sheet,
  // then carries it away to the register. The folder's destination
  // line is real: every issued certificate IS recorded in the
  // Certificate Register below this hero. ----
  function drawFolderFace() {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 360;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#171008';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = 'rgba(233,206,138,0.85)'; ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, c.width - 28, c.height - 28);
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, c.width - 52, c.height - 52);
    // Ribbon band.
    ctx.fillStyle = 'rgba(198,161,91,0.9)';
    ctx.fillRect(0, c.height / 2 - 14, c.width, 28);
    // Crest ring over the ribbon.
    ctx.beginPath(); ctx.arc(c.width / 2, c.height / 2, 52, 0, Math.PI * 2);
    ctx.fillStyle = '#171008'; ctx.fill();
    ctx.strokeStyle = '#E9CE8A'; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.arc(c.width / 2, c.height / 2, 38, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#E9CE8A';
    ctx.font = '700 26px Georgia, serif';
    ctx.fillText('SHRS', c.width / 2, c.height / 2 + 9);
    ctx.font = '600 17px Georgia, serif';
    ctx.fillStyle = 'rgba(233,206,138,0.8)';
    ctx.fillText('OFFICIAL ACADEMIC RECORD', c.width / 2, c.height - 44);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  var folderFrontMat = new THREE.MeshStandardMaterial({ map: drawFolderFace(), roughness: 0.5, metalness: 0.25, transparent: true });
  var folderBackMat = new THREE.MeshStandardMaterial({ color: 0x171008, roughness: 0.55, metalness: 0.2, transparent: true });
  var folder = new THREE.Group();
  var folderFront = new THREE.Mesh(new THREE.PlaneGeometry(3.72, 2.6), folderFrontMat);
  folderFront.position.z = 0.05;
  folder.add(folderFront);
  var folderBack = new THREE.Mesh(new THREE.PlaneGeometry(3.72, 2.6), folderBackMat);
  folderBack.position.z = -0.05;
  folder.add(folderBack);
  folder.visible = false;
  scene.add(folder);

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

  // Each console control exists only when its source-of-truth input
  // does — the rest of this file already treats these inputs as
  // optional, so their binds must too (a missing input previously
  // threw during construction and killed the whole scene).
  var raycastTargets = [];
  if (qualityInput) {
    var dial = bindDial(THREE, qualityInput);
    dial.group.position.set(-2.3, -0.45, plateFrontZ + 0.02);
    consoleGroup.add(dial.group);
    raycastTargets.push({ mesh: dial.hitMesh, onHit: dial.advance });
  }
  if (engineInput) {
    var engineSwitch = bindSwitch(THREE, engineInput);
    engineSwitch.group.position.set(-0.85, -0.5, plateFrontZ);
    consoleGroup.add(engineSwitch.group);
    raycastTargets.push({ mesh: engineSwitch.hitMesh, onHit: engineSwitch.flip });
  }
  if (soundInput) {
    var soundSwitch = bindSwitch(THREE, soundInput);
    soundSwitch.group.position.set(-0.15, -0.5, plateFrontZ);
    consoleGroup.add(soundSwitch.group);
    raycastTargets.push({ mesh: soundSwitch.hitMesh, onHit: soundSwitch.flip });
  }
  var guarded = buildGuardedSwitch(THREE);
  guarded.group.position.set(0.65, -0.5, plateFrontZ);
  consoleGroup.add(guarded.group);

  if (raycastTargets.length) wireRaycast(THREE, canvas, camera, raycastTargets);

  // The hidden inputs ship disabled in the markup so that keyboard and
  // screen-reader users never meet live-sounding controls for a scene
  // that failed to exist (no WebGL, module load failure). Only a
  // successfully-built scene switches them on.
  [soundInput, engineInput, qualityInput].forEach(function (el) {
    if (el) el.disabled = false;
  });

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
  var curName = '', curSerialPrint = null, curBuilt = null;
  function spawnCertificate(overrideName, overrideSerial) {
    if (curTex) curTex.dispose();
    var name = overrideName || NAMES[nameIdx % NAMES.length];
    if (!overrideName) nameIdx++;
    // A REAL row with no serial (a failed row never received one) must
    // show none — inventing a demonstration serial under a real
    // student's failure line would put a number on the LCD that exists
    // in no register (confirmed in adversarial review).
    curSerial = overrideSerial || (overrideName ? '—' : nextSerial());
    curName = name;
    curSerialPrint = overrideSerial || null;
    curBuilt = {}; // no seal, no QR, no signature — the stations add them
    curFull = drawFaceCanvas(curName, curSerialPrint, curBuilt);
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
  // A station has altered the face — rebuild the master art and re-blit
  // whatever the press has already revealed, so the new element appears
  // exactly where the station worked.
  function stationBuild(flag) {
    if (!curBuilt || curBuilt[flag]) return;
    curBuilt[flag] = true;
    curFull = drawFaceCanvas(curName, curSerialPrint, curBuilt);
    var h = Math.round(curFull.height * (Math.max(curBands, 0) / BANDS));
    if (h > 0) {
      curDisp.getContext('2d').drawImage(curFull, 0, 0, curFull.width, h, 0, 0, curFull.width, h);
      curTex.needsUpdate = true;
    }
  }
  function playSound() { if (window.__certForgeChime) window.__certForgeChime(); }

  // ---- Live generation — driven by the REAL batch this staff member
  // just started, not this scene's own clock. See the header note. ----
  var liveActive = false, liveEnded = false, liveQueue = [], liveCurrent = null, liveCycleMs = CYCLE;
  var LIVE_SHOW_BUDGET_MS = 16000;
  var LIVE_MIN_ROW_MS = 180;
  // Under prefers-reduced-motion the press must NEVER animate — not
  // even for a real batch (that is precisely the motion the user asked
  // not to see; confirmed as a real defect in adversarial review). The
  // real progress still reaches them: the aria-live region reports each
  // row's actual outcome, the Generate button counts, and the results
  // table renders in full — only the cinematography is withheld.
  document.addEventListener('sultan:cert-generate-start', function (e) {
    var total = (e.detail && e.detail.total) || 1;
    if (reduceMotion) {
      if (liveEl) liveEl.textContent = 'Credential production started: ' + total + ' certificate' + (total === 1 ? '' : 's') + ' queued.';
      return;
    }
    liveActive = true; liveEnded = false; liveQueue = []; liveCurrent = null;
    liveCycleMs = Math.max(LIVE_MIN_ROW_MS, Math.min(CYCLE, LIVE_SHOW_BUDGET_MS / total));
    cycleStart = 0; // interrupt the demonstration cycle immediately
    announce('Credential production initiated. ' + total + ' certificate' + (total === 1 ? '' : 's') + ' queued.');
    // Performance mode is the user's explicit choice and it HOLDS: a
    // batch never force-restarts a press the user switched off (the
    // label promises exactly that). The button counter and results
    // table carry the progress; the queue simply drains unshown.
    if (!userPaused) start();
  });
  var lastRowAnnounce = 0;
  document.addEventListener('sultan:cert-generate-progress', function (e) {
    var d = e.detail;
    if (!d) return;
    if (d.type === 'row') {
      if (reduceMotion) {
        // Real per-row progress for reduced-motion users, throttled so a
        // fast batch cannot flood a screen reader — the final row always
        // lands because batch_done follows it.
        var nowMs = Date.now();
        if (liveEl && (nowMs - lastRowAnnounce > 1500 || d.index + 1 === d.total)) {
          lastRowAnnounce = nowMs;
          liveEl.textContent = 'Certificate ' + (d.index + 1) + ' of ' + d.total + ' — ' + (d.fullName || 'student') + ': ' + d.status + '.';
        }
        return;
      }
      liveQueue.push(d);
    }
    if (d.type === 'batch_done') {
      var parts = ['Batch complete.', d.issued + ' issued.'];
      if (d.skipped) parts.push(d.skipped + ' skipped.');
      if (d.failed) parts.push(d.failed + ' failed.');
      if (reduceMotion) { if (liveEl) liveEl.textContent = parts.join(' '); }
      else announce(parts.join(' '));
    }
  });
  document.addEventListener('sultan:cert-generate-end', function () {
    if (reduceMotion) return;
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
  var pistonStruck = false, steamFired = false;
  var shakeAmp = 0, lastCycleT = 0;
  var motorLevel = 0; // 0..1, eased — drives rollers, roll, hum
  function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInCubic(x) { return x * x * x; }
  function resetCycleApparatus() {
    burstFiredThisCycle = false;
    pistonStruck = false;
    steamFired = false;
    folder.visible = false;
    folderFrontMat.opacity = 1;
    folderBackMat.opacity = 1;
  }

  function animateCycle(now, dtMs) {
    var span = liveActive ? liveCycleMs : CYCLE;
    var needNext = !cur || now - cycleStart > span;
    if (needNext) {
      if (liveActive && liveQueue.length) {
        cycleStart = now;
        resetCycleApparatus();
        liveCurrent = liveQueue.shift();
        var shownName = liveCurrent.fullName || liveCurrent.studentFullName || 'Student';
        spawnCertificate(shownName, liveCurrent.serialNo || null);
        var goodTone = liveCurrent.status === 'issued' ? 0xC6A15B : (liveCurrent.status === 'skipped' ? 0x8C6834 : 0x8A3A2E);
        slotMat.emissive.setHex(goodTone);
        // Real progress to assistive tech, one write per row, throttled
        // so compressed batches cannot flood a screen reader.
        var rowNow = Date.now();
        if (liveEl && (rowNow - lastRowAnnounce > 1500 || liveCurrent.index + 1 === liveCurrent.total)) {
          lastRowAnnounce = rowNow;
          liveEl.textContent = 'Certificate ' + (liveCurrent.index + 1) + ' of ' + liveCurrent.total + ' — ' + shownName + ': ' + liveCurrent.status + '.';
        }
      } else if (liveActive && liveEnded && !liveQueue.length) {
        liveActive = false; liveCurrent = null;
        slotMat.emissive.setHex(0xC6A15B);
        cycleStart = now;
        resetCycleApparatus();
        spawnCertificate();
        // A batch begun while the hero was scrolled out of view kept the
        // loop alive past the IntersectionObserver's last word — once the
        // real work drains, the visibility rule resumes (confirmed leak
        // in adversarial review).
        if (!heroVisible) stop();
      } else if (!liveActive) {
        cycleStart = now;
        resetCycleApparatus();
        spawnCertificate();
      }
      // else: a real batch is running but the next row hasn't arrived yet
      // (network latency) — hold on the last certificate rather than
      // conjure a fake one to fill the gap.
      span = liveActive ? liveCycleMs : CYCLE;
    }
    var t = Math.min((now - cycleStart) / span, 1);
    // Holding for the network: freeze BEFORE the fade/packaging beats,
    // so the held sheet stays visible at presentation instead of
    // fading to an empty conveyor (t clamped to 1 used to walk it
    // straight through opacity 0 — confirmed in adversarial review).
    if (liveActive && !liveQueue.length && !liveEnded && needNext) t = Math.min(t, 0.88);
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

        // The remaining stations work the lifted sheet in order.
        if (t >= 0.62 && sheetOk()) stationBuild('qr');
        if (t >= 0.72 && sheetOk()) { if (!curBuilt.signature && spanLongEnough()) playServo(); stationBuild('signature'); }

        if (PACKAGING && sheetOk()) {
          // Packaging: the crested folder rises to receive the sheet,
          // then carries it away toward the register.
          if (t >= 0.9) {
            folder.visible = true;
            var fp2 = Math.min(1, (t - 0.9) / 0.055);
            var fy = -2.7 + (PRESENT.y - SHEET_H / 2 - (-2.7)) * easeOutCubic(fp2);
            var slide = t >= 0.965 ? (t - 0.965) / 0.035 : 0;
            var offX = easeInCubic(slide) * 3.4;
            folder.position.set(PRESENT.x + offX, fy, PRESENT.z + 0.02);
            folder.rotation.x = PRESENT.tilt;
            cur.position.x = PRESENT.x + offX;
            var gone = slide > 0 ? 1 - slide : 1;
            folderFrontMat.opacity = gone;
            folderBackMat.opacity = gone;
            cur.material.transparent = slide > 0;
            cur.material.opacity = gone;
          }
        } else {
          cur.material.transparent = t > 0.95;
          cur.material.opacity = t > 0.95 ? 1 - (t - 0.95) / 0.05 : 1;
        }
      }
    }

    // ---- The emboss die: accelerate down, land with weight, dwell,
    // withdraw — the seal exists on the face only after the strike. ----
    if (t >= 0.5 && t < 0.62 && cur && sheetOk()) {
      var ep = (t - 0.5) / 0.12;
      var py;
      if (ep < 0.3) py = PISTON_REST + (PISTON_STRIKE - PISTON_REST) * easeInCubic(ep / 0.3);
      else if (ep < 0.5) {
        py = PISTON_STRIKE;
        if (!pistonStruck) {
          pistonStruck = true;
          stationBuild('seal');
          shakeAmp = 1;
          if (soundOn && spanLongEnough()) playThud();
        }
      } else py = PISTON_STRIKE + (PISTON_REST - PISTON_STRIKE) * easeOutCubic((ep - 0.5) / 0.5);
      piston.position.y = py;
    } else {
      // At rest the hydraulics still breathe — tiny idle adjustments.
      piston.position.y = PISTON_REST + Math.sin(now / 2600) * 0.012;
    }

    // ---- Steam clears as the finished sheet is presented ----
    if (t >= 0.88 && !steamFired && sheetOk()) {
      steamFired = true;
      fireSteam();
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

    // ---- Seal laser: one sweep down the presented face — resolved
    // through the sheet's own transform (as the QR spark is), so the
    // beam rides the tilted surface instead of sinking behind it and
    // losing the depth test for most of the sweep (confirmed in
    // adversarial review). ----
    var scanPhase = (t - 0.8) / 0.08;
    if (cur && scanPhase > 0 && scanPhase < 1 && sheetOk()) {
      cur.updateMatrixWorld();
      var beamWorld = cur.localToWorld(new THREE.Vector3(0, -SHEET_H * scanPhase, 0.04));
      laser.position.copy(beamWorld);
      laser.rotation.x = cur.rotation.x;
      laserGlow.position.copy(beamWorld);
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
    lastCycleT = t;
  }
  function sheetOk() { return !liveCurrent || liveCurrent.status === 'issued'; }
  function spanLongEnough() { return (liveActive ? liveCycleMs : CYCLE) > 900; }
  function feedTickWanted() { return soundOn && spanLongEnough(); }

  var raf = null, running = false, userPaused = false, heroVisible = true;
  var lastTs = 0, camZ = 11.5;
  function frame(ts) {
    if (!running) return;
    var dtMs = lastTs ? ts - lastTs : 16;
    lastTs = ts;
    animateCycle(ts, dtMs);
    updateBurst(ts, dtMs);
    updateSteam(ts, dtMs);
    particles.rotation.y += 0.0008;
    // The laboratory keeps living: the arms drift through a slow idle,
    // the status lamps breathe.
    [armL, armR].forEach(function (arm) {
      var ph = ts / 5200 + arm.userData.phase;
      arm.userData.shoulder.rotation.y = Math.sin(ph) * 0.4;
      arm.userData.elbow.rotation.z = (arm === armL ? 1 : -1) * (0.75 + Math.sin(ph * 1.3) * 0.12);
    });
    idleLamps.forEach(function (l) {
      l.mat.opacity = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(ts / 700 + l.phase));
    });
    // The camera never sits still: lateral sway, a breathing dolly, a
    // push-in while a real batch runs, a slow arc around the presented
    // sheet, and — when the die lands — a shudder with real decay.
    var camZTarget = (liveActive ? 9.7 : 10.7) + Math.sin(ts / 13000) * 0.18;
    camZ += (camZTarget - camZ) * 0.02;
    var orbitX = 0;
    if (lastCycleT >= 0.72 && lastCycleT < 0.92) {
      orbitX = Math.sin(((lastCycleT - 0.72) / 0.2) * Math.PI) * ORBIT;
    }
    camera.position.z = camZ;
    camera.position.x = Math.sin(ts / 9000) * swayAmplitude + orbitX + (Math.random() - 0.5) * shakeAmp * 0.1;
    camera.position.y = -0.4 + Math.sin(ts / 11000) * 0.08 + (Math.random() - 0.5) * shakeAmp * 0.07;
    shakeAmp *= 0.88;
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
    stationBuild('seal');
    stationBuild('qr');
    stationBuild('signature');
    revealBands(BANDS);
    drawStagePanel(FINISH_STAGES.length - 1);
    setStageDisplay(1, curSerial);
    camera.lookAt(0, -0.65, 0.4);
    resize();
    renderer.render(scene, camera);
  } else {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          heroVisible = e.isIntersecting;
          if (e.isIntersecting) start(); else stop();
        });
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
  // The emboss die landing: a deep, weighted thud — low sine body with
  // a short mechanical click on top.
  function playThud() {
    var ctx = ensureAudioCtx();
    if (!ctx) return;
    var t0 = ctx.currentTime;
    var osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(85, t0);
    osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.22);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.11, t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.3);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + 0.32);
    var click = ctx.createOscillator(); click.type = 'square'; click.frequency.value = 700;
    var cg = ctx.createGain();
    cg.gain.setValueAtTime(0.025, t0);
    cg.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.05);
    click.connect(cg).connect(ctx.destination);
    click.start(t0); click.stop(t0 + 0.06);
  }
  // The production announcer — the browser's own speech synthesis, no
  // recordings, gated behind the same opt-in sound switch, and speaking
  // only real facts (queued counts, issued counts) from the stream.
  function announce(text) {
    if (!soundOn) return;
    if (!('speechSynthesis' in window)) return;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.pitch = 0.85; u.volume = 0.55;
      window.speechSynthesis.speak(u);
    } catch (err) { /* speech unavailable — the LCD already says it */ }
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
      // The 3D lever renders from the checkbox on 'change' — dispatch
      // one and re-render the still so the lever agrees with the state
      // it now reports, instead of frozen mid-ON from construction.
      engineInput.dispatchEvent(new Event('change', { bubbles: false }));
      renderer.render(scene, camera);
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
  // Standard runs a brisk sequence with no packaging ceremony;
  // Professional adds the folder and a gentle presentation arc;
  // Prestige runs the full ceremony with the widest camera work. All
  // of it is this workstation's own display preference — the real
  // generation engine is identical at every setting.
  var QUALITY_TIERS = [
    { cycle: 11000, sway: 0.2, particleOpacity: 0.55, packaging: false, orbit: 0 },
    { cycle: 9000, sway: 0.35, particleOpacity: 0.75, packaging: true, orbit: 0.45 },
    { cycle: 7200, sway: 0.5, particleOpacity: 0.95, packaging: true, orbit: 0.9 },
  ];
  var PACKAGING = QUALITY_TIERS[1].packaging;
  var ORBIT = QUALITY_TIERS[1].orbit;
  if (qualityInput) {
    var TIER_NAMES = ['Standard', 'Professional', 'Prestige'];
    var applyTier = function () {
      var idx = Number(qualityInput.value);
      var tier = QUALITY_TIERS[idx] || QUALITY_TIERS[1];
      CYCLE = tier.cycle;
      swayAmplitude = tier.sway;
      particles.material.opacity = tier.particleOpacity;
      PACKAGING = tier.packaging;
      ORBIT = tier.orbit;
      // The label teaches tier NAMES; the slider must speak them too,
      // not bare numbers (confirmed in adversarial review).
      qualityInput.setAttribute('aria-valuetext', TIER_NAMES[idx] || TIER_NAMES[1]);
    };
    qualityInput.addEventListener('input', applyTier);
    applyTier();
  }
})();
