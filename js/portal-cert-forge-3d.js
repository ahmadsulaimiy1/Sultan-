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
  // In true production order along the line — the shoulder panel lights
  // each lamp as the sheet reaches that station.
  var FINISH_STAGES = ['UV Print', 'Emboss Seal', 'QR Engrave', 'Signature', 'Laser Inspect', 'Vault Archive'];
  var FINISH_STARTS = [0.32, 0.42, 0.52, 0.61, 0.69, 0.905];
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
    if (built.uv) {
      // The UV station's microtext band — rows of near-invisible
      // security type across the lower field, the anti-copy layer the
      // real sheets carry as guilloche/microtext.
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#8C6834';
      ctx.font = '600 9px "Courier New", monospace';
      for (var mr = 0; mr < 3; mr++) {
        var my = 452 + mr * 16;
        var band = '';
        while (band.length < 130) band += 'SULTAN HANAFI ROYAL SCHOOLS \u00b7 SECURE \u00b7 ';
        ctx.fillText(band.slice(0, 130), c.width / 2, my);
      }
      ctx.restore();
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
  // Depth: the hall recedes into haze the way a real production floor
  // does under industrial lighting — this is what sells the room's
  // scale more than any single mesh.
  scene.fog = new THREE.Fog(0x150D05, 15, 34);
  var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  camera.position.set(0, -0.4, 11.5);

  scene.add(new THREE.AmbientLight(0xE9CE8A, 0.68));
  var key = new THREE.DirectionalLight(0xFFF3DE, 1.3);
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
  mouthLight.position.set(-3.2, -1.1, 1.4);
  scene.add(mouthLight);
  [-1.5, 1.3, 4.2].forEach(function (x) {
    var down = new THREE.PointLight(0xFFE9C0, 1.5, 9);
    down.position.set(x, 0.7, 1.3);
    scene.add(down);
  });
  // The travelling work light: each station's task lamp, rendered as
  // one light that rides with the sheet down the line.
  var workLight = new THREE.PointLight(0xFFF3DE, 0.9, 5.5);
  workLight.position.set(-3.2, -0.3, 2.3);
  scene.add(workLight);

  // A brass plaque in place of what used to be a plain DOM caption.
  var plaque = buildPlaque(THREE, "Where the Institution's Credentials Are Made", 4.4, 0.5);
  plaque.mesh.position.set(1, 1.72, -2.6);
  scene.add(plaque.mesh);

  // ================= THE LABORATORY =================
  // Dark reflective floor, a lit backdrop, and two idle robot arms —
  // the room the reference places the press inside.
  var floor = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 8),
    new THREE.MeshStandardMaterial({ color: 0x120C05, metalness: 0.75, roughness: 0.35 })
  );
  floor.rotation.x = -Math.PI / 2;
  // The floor ends before the console's station so the console (which
  // sits lower and nearer the camera) is never occluded by it.
  floor.position.set(0, -2.45, -2.4);
  scene.add(floor);
  // Emissive floor guide-strips running the length of the line — the
  // polished-hall light reflections that move as the camera dollies.
  [-0.2, 2.6].forEach(function (z, i) {
    var strip = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xC6A15B, transparent: true, opacity: 0.18 + i * 0.06, toneMapped: false })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(1, -2.44, z);
    scene.add(strip);
  });

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
    new THREE.PlaneGeometry(34, 10),
    new THREE.MeshBasicMaterial({ map: drawBackdrop(), toneMapped: false, transparent: true, opacity: 0.9 })
  );
  backdrop.position.set(1, 0.6, -4.4);
  scene.add(backdrop);

  // The overhead gantry crane, traversing the hall on its own
  // schedule — the room working at something other than this sheet.
  var craneRail = new THREE.Mesh(new THREE.BoxGeometry(20, 0.14, 0.14), new THREE.MeshStandardMaterial({ color: 0x1A1109, metalness: 0.7, roughness: 0.4 }));
  craneRail.position.set(1, 2.75, -1.6);
  scene.add(craneRail);
  var craneTrolley = new THREE.Group();
  var trolleyBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0x2A1E0E, metalness: 0.8, roughness: 0.35 }));
  craneTrolley.add(trolleyBody);
  var craneHook = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xC6A15B, metalness: 0.85, roughness: 0.3 }));
  craneHook.position.y = -0.55;
  craneTrolley.add(craneHook);
  var craneLamp = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), new THREE.MeshBasicMaterial({ color: 0xE9CE8A, toneMapped: false }));
  craneLamp.position.set(0, -0.16, 0.16);
  craneTrolley.add(craneLamp);
  craneTrolley.position.set(-4, 2.75, -1.6);
  scene.add(craneTrolley);

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
  var armL = buildRobotArm(1); armL.position.set(-5.6, -2.45, -2.0); scene.add(armL);
  var armR = buildRobotArm(-1); armR.position.set(3.1, -2.45, -1.6); scene.add(armR);

  // ================= THE PRESS =================
  // Recreated from the master reference: chamfered dark body, gold
  // trim, crest nameplate, glowing platen mouth with feed rollers, the
  // six-station shoulder panel, and the slatted output conveyor.
  var press = new THREE.Group();
  press.position.set(-3.2, 0, -0.3);
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

  // ================= THE PRODUCTION LINE =================
  // The hall's spine: a long automated conveyor running rightward from
  // the press's mouth through every finishing station to the archival
  // vault. Each station is its own machine straddling the line, built
  // in the same industrial vocabulary as the master-reference press —
  // and each acts on the sheet as it passes, in production order.
  var LINE = { y: -1.52, z: 1.35, tilt: -1.35 };
  var STATION_X = { press: -3.2, uv: -1.55, emboss: -0.05, qr: 1.25, sig: 2.05, inspect: 2.95, pack: 4.15, vault: 5.6 };

  var lineGroup = new THREE.Group();
  scene.add(lineGroup);
  var lineBed = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.1, 2.0), bodyDarkMat);
  lineBed.position.set(1.15, LINE.y - 0.22, LINE.z);
  lineGroup.add(lineBed);
  for (var ls = 0; ls < 26; ls++) {
    var lslat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 1.9), ls % 2 ? bodyDarkMat : rollerMat);
    lslat.position.set(-3.6 + ls * 0.385, LINE.y - 0.14, LINE.z);
    lineGroup.add(lslat);
  }
  [LINE.z - 0.98, LINE.z + 0.98].forEach(function (z) {
    var lrail = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.05, 0.06), trimMat);
    lrail.position.set(1.15, LINE.y - 0.1, z);
    lineGroup.add(lrail);
  });
  // Line support legs down to the floor.
  [-3.2, -0.9, 1.4, 3.7, 5.6].forEach(function (x) {
    [LINE.z - 0.8, LINE.z + 0.8].forEach(function (z) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), bodyDarkMat);
      leg.position.set(x, LINE.y - 0.62, z);
      lineGroup.add(leg);
    });
  });

  // A station gantry: two posts astride the line and a crossbeam — the
  // shared frame the UV arch, emboss die, QR laser and inspection head
  // all hang from, so the hall reads as one engineered system.
  function buildGantry(x, beamMat) {
    var g = new THREE.Group();
    g.position.set(x, 0, LINE.z);
    [-1.05, 1.05].forEach(function (z) {
      var post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.75, 0.16), bodyDarkMat);
      post.position.set(0, -1.15, z);
      g.add(post);
    });
    var beam = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 2.35), beamMat || bodyMat);
    beam.position.set(0, -0.32, 0);
    g.add(beam);
    var beamTrim = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.035, 2.36), trimMat);
    beamTrim.position.set(0, -0.19, 0);
    g.add(beamTrim);
    scene.add(g);
    return g;
  }

  // -- UV curing arch: a violet-lit tunnel the sheet passes beneath --
  var uvGantry = buildGantry(STATION_X.uv);
  var uvLampMat = new THREE.MeshBasicMaterial({ color: 0x8A5CF6, transparent: true, opacity: 0.25, toneMapped: false });
  var uvLamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 1.9), uvLampMat);
  uvLamp.position.set(0, -0.46, 0);
  uvGantry.add(uvLamp);
  var uvLight = new THREE.PointLight(0x8A5CF6, 0, 4);
  uvLight.position.set(STATION_X.uv, -0.9, LINE.z);
  scene.add(uvLight);

  // -- Emboss die on its gantry: guide rod, collar, travelling die --
  var embossGantry = buildGantry(STATION_X.emboss);
  var guideRod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.15, 12), rollerMat);
  guideRod.position.set(0, -0.98, 0);
  embossGantry.add(guideRod);
  var piston = new THREE.Group();
  var pistonCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 14), bodyDarkMat);
  pistonCollar.position.y = 0.14;
  piston.add(pistonCollar);
  var pistonHead = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 18), trimMat);
  piston.add(pistonHead);
  piston.position.set(0, -0.62, 0);
  embossGantry.add(piston);
  var PISTON_REST = -0.62, PISTON_STRIKE = -1.28;

  // -- QR laser engraver: a compact head that pulses while it burns --
  var qrGantry = buildGantry(STATION_X.qr);
  var qrHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.3), bodyDarkMat);
  qrHead.position.set(0, -0.58, 0);
  qrGantry.add(qrHead);
  var qrLens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.12, 12), trimMat);
  qrLens.position.set(0, -0.8, 0);
  qrGantry.add(qrLens);
  var qrBeamMat = new THREE.MeshBasicMaterial({ color: 0xFF6A4D, transparent: true, opacity: 0, toneMapped: false });
  var qrBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.7, 8), qrBeamMat);
  qrBeam.position.set(STATION_X.qr, -1.2, LINE.z);
  scene.add(qrBeam);

  // -- Signature applicator: a small plotter arm over the line --
  var sigGantry = buildGantry(STATION_X.sig);
  var sigArm = new THREE.Group();
  var sigArmBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), rollerMat);
  sigArmBar.position.y = -0.25;
  sigArm.add(sigArmBar);
  var sigNib = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 10), trimMat);
  sigNib.rotation.x = Math.PI;
  sigNib.position.y = -0.56;
  sigArm.add(sigNib);
  sigArm.position.set(0, -0.55, 0);
  sigGantry.add(sigArm);

  // -- Inspection station: the sheet is lifted to the glass for
  // examination — scan sweep, then cleared. A camera head watches. --
  var inspectGantry = buildGantry(STATION_X.inspect);
  var inspectCam = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), bodyDarkMat);
  inspectCam.position.set(0, -0.55, 0.4);
  inspectGantry.add(inspectCam);
  var inspectEye = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), new THREE.MeshBasicMaterial({ color: 0x9FE8FF, toneMapped: false }));
  inspectEye.position.set(0, -0.55, 0.55);
  inspectGantry.add(inspectEye);

  // -- The archival vault: the line's real destination. Its door
  // opens for each finished certificate and seals behind it — and the
  // destination is honest: every issued certificate IS in the
  // Certificate Register this page shows below. --
  var vault = new THREE.Group();
  vault.position.set(STATION_X.vault, 0, LINE.z);
  scene.add(vault);
  var vaultBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.5, 2.4), bodyMat);
  vaultBody.position.set(0.55, -1.2, 0);
  vault.add(vaultBody);
  var vaultTrim = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.05, 2.42), trimMat);
  vaultTrim.position.set(0.55, -0.06, 0);
  vault.add(vaultTrim);
  var vaultGlowMat = new THREE.MeshBasicMaterial({ color: 0xE9CE8A, transparent: true, opacity: 0.25, toneMapped: false });
  var vaultGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.3), vaultGlowMat);
  vaultGlow.rotation.y = -Math.PI / 2;
  vaultGlow.position.set(-0.28, -1.5, 0);
  vault.add(vaultGlow);
  var vaultDoorMat = new THREE.MeshStandardMaterial({ color: 0x3A2A14, metalness: 0.75, roughness: 0.3 });
  var vaultDoor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 2.0), vaultDoorMat);
  vaultDoor.position.set(-0.3, -1.45, 0);
  vault.add(vaultDoor);
  var VAULT_DOOR_CLOSED = -1.45, VAULT_DOOR_OPEN = 0.15;
  function drawVaultPlate() {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#0D0803'; ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = 'rgba(233,206,138,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(4, 4, 248, 56);
    ctx.fillStyle = '#E9CE8A'; ctx.font = '600 22px "Courier New", monospace'; ctx.textAlign = 'center';
    ctx.fillText('ARCHIVE VAULT', 128, 40);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  var vaultPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), new THREE.MeshBasicMaterial({ map: drawVaultPlate(), toneMapped: false }));
  vaultPlate.position.set(0.55, -0.45, 1.22);
  vault.add(vaultPlate);

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

  // ---- Post-processing: a compact hand-rolled bloom — bright-pass,
  // separable gaussian at half resolution, additive composite — so the
  // gold lamps, beams and bursts BLOOM the way film renders them
  // rather than clipping. No external passes library: the site
  // self-hosts three's core module only, so the composer is written
  // here from render targets and fullscreen shader quads. Standard
  // tier renders direct for performance; Professional and Prestige
  // take the glow.
  var BLOOM = true; // reassigned by the display tier
  var bloom = null;
  function makeFullscreenPass(frag, uniforms) {
    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: frag,
      depthTest: false, depthWrite: false,
    });
    var s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    return { scene: s, mat: mat };
  }
  function initBloom() {
    var rtScene = new THREE.WebGLRenderTarget(2, 2);
    // Scene target flagged sRGB so the encode happens on write and the
    // composite can pass values straight to the screen.
    rtScene.texture.colorSpace = THREE.SRGBColorSpace;
    return {
      quadCam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
      rtScene: rtScene,
      rtA: new THREE.WebGLRenderTarget(2, 2),
      rtB: new THREE.WebGLRenderTarget(2, 2),
      bright: makeFullscreenPass(
        'uniform sampler2D tex; varying vec2 vUv; void main(){ vec4 c = texture2D(tex, vUv); float l = dot(c.rgb, vec3(0.299, 0.587, 0.114)); gl_FragColor = l > 0.62 ? c : vec4(0.0); }',
        { tex: { value: null } }),
      blur: makeFullscreenPass(
        'uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main(){ vec4 s = texture2D(tex, vUv) * 0.227; s += (texture2D(tex, vUv + dir * 1.384) + texture2D(tex, vUv - dir * 1.384)) * 0.316; s += (texture2D(tex, vUv + dir * 3.230) + texture2D(tex, vUv - dir * 3.230)) * 0.070; gl_FragColor = s; }',
        { tex: { value: null }, dir: { value: new THREE.Vector2() } }),
      comp: makeFullscreenPass(
        'uniform sampler2D base; uniform sampler2D glow; varying vec2 vUv; void main(){ gl_FragColor = texture2D(base, vUv) + texture2D(glow, vUv) * 0.85; }',
        { base: { value: null }, glow: { value: null } }),
    };
  }
  function sizeBloom() {
    if (!bloom) return;
    var sz = new THREE.Vector2();
    renderer.getDrawingBufferSize(sz);
    bloom.rtScene.setSize(Math.max(2, sz.x), Math.max(2, sz.y));
    bloom.rtA.setSize(Math.max(1, sz.x >> 1), Math.max(1, sz.y >> 1));
    bloom.rtB.setSize(Math.max(1, sz.x >> 1), Math.max(1, sz.y >> 1));
  }
  function renderScene() {
    if (!BLOOM) { renderer.render(scene, camera); return; }
    if (!bloom) { bloom = initBloom(); sizeBloom(); }
    renderer.setRenderTarget(bloom.rtScene);
    renderer.render(scene, camera);
    var sz = new THREE.Vector2();
    renderer.getDrawingBufferSize(sz);
    bloom.bright.mat.uniforms.tex.value = bloom.rtScene.texture;
    renderer.setRenderTarget(bloom.rtA);
    renderer.render(bloom.bright.scene, bloom.quadCam);
    bloom.blur.mat.uniforms.tex.value = bloom.rtA.texture;
    bloom.blur.mat.uniforms.dir.value.set(1 / Math.max(1, sz.x >> 1), 0);
    renderer.setRenderTarget(bloom.rtB);
    renderer.render(bloom.blur.scene, bloom.quadCam);
    bloom.blur.mat.uniforms.tex.value = bloom.rtB.texture;
    bloom.blur.mat.uniforms.dir.value.set(0, 1 / Math.max(1, sz.y >> 1));
    renderer.setRenderTarget(bloom.rtA);
    renderer.render(bloom.blur.scene, bloom.quadCam);
    bloom.comp.mat.uniforms.base.value = bloom.rtScene.texture;
    bloom.comp.mat.uniforms.glow.value = bloom.rtA.texture;
    renderer.setRenderTarget(null);
    renderer.render(bloom.comp.scene, bloom.quadCam);
  }

  function resize() {
    var w = mount.clientWidth, h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    sizeBloom();
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
  var CYCLE = 12000; // ms per certificate — adjustable by the View dial
  var swayAmplitude = 0.35;
  var cur = null, curTex = null, curFull = null, curDisp = null, curBands = -1;
  var nameIdx = 0, curSerial = '—';
  // Mouth grip point in world space (press at z=-0.3; throat front ~z 1.05+(-0.3)).
  var MOUTH = { x: -3.2, y: -1.05, z: 0.75 };
  var FEED_TILT = LINE.tilt; // lying on the line, face up toward camera
  // The inspection lift — the one moment the sheet is raised to the
  // camera for reading, mid-line, before packaging and the vault.
  var PRESENT = { x: STATION_X.inspect, y: 0.62, z: 2.2, tilt: -0.12 };
  // The sheet's travel schedule along the line: [tStart, tEnd, xFrom, xTo].
  // Between segments the sheet dwells at its station while that
  // station's machinery works.
  var TRAVEL = [
    [0.26, 0.32, STATION_X.press, STATION_X.uv],
    [0.38, 0.42, STATION_X.uv, STATION_X.emboss],
    [0.48, 0.52, STATION_X.emboss, STATION_X.qr],
    [0.58, 0.61, STATION_X.qr, STATION_X.sig],
    [0.66, 0.69, STATION_X.sig, STATION_X.inspect],
    [0.78, 0.81, STATION_X.inspect, STATION_X.pack],
    [0.87, 0.925, STATION_X.pack, STATION_X.vault + 0.15],
    [0.925, 0.96, STATION_X.vault + 0.15, STATION_X.vault + 0.55],
  ];
  function sheetXAt(t) {
    var x = STATION_X.press;
    for (var i = 0; i < TRAVEL.length; i++) {
      var seg = TRAVEL[i];
      if (t >= seg[1]) { x = seg[3]; continue; }
      if (t > seg[0]) { x = seg[2] + (seg[3] - seg[2]) * easeInOut((t - seg[0]) / (seg[1] - seg[0])); }
      break;
    }
    return x;
  }
  var curSheetX = STATION_X.press;

  function nextSerial() {
    sessionCount++;
    return 'SHR-CERT-2026-' + String(40 + sessionCount).padStart(6, '0');
  }
  var curName = '', curSerialPrint = null, curBuilt = null;
  var curReal = false, spawnToken = 0;
  // The OFFICIAL face: for real rows the press manufactures the actual
  // approved template — the same frozen server-side master that prints
  // (functions/_lib/stage-certificate-template.js and its Royal College
  // sibling, dispatched per programme by the registry), rendered by the
  // same headless-Chromium service as the PDFs and fetched here as the
  // sheet's texture. The engine never knows a template's layout: it
  // textures whatever the registry renders for that serial, so present
  // and future certificate families flow through with no change here.
  // Until the render arrives (or when Browser Rendering is unavailable
  // on the deployment), the sheet carries the illustrative face, and
  // the demonstration loop always does — it has no real serial to ask
  // for.
  function loadRealFace(url, token) {
    fetch(url, { credentials: 'same-origin' }).then(function (res) {
      if (!res.ok) throw new Error('render unavailable');
      return res.blob();
    }).then(function (blob) {
      if (window.createImageBitmap) return window.createImageBitmap(blob);
      return new Promise(function (resolve, reject) {
        var img = new Image();
        var objUrl = URL.createObjectURL(blob);
        img.onload = function () { URL.revokeObjectURL(objUrl); resolve(img); };
        img.onerror = function () { URL.revokeObjectURL(objUrl); reject(new Error('decode failed')); };
        img.src = objUrl;
      });
    }).then(function (bmp) {
      if (token !== spawnToken || !curFull) { if (bmp.close) bmp.close(); return; }
      var ctx = curFull.getContext('2d');
      ctx.fillStyle = '#F7EEDF';
      ctx.fillRect(0, 0, curFull.width, curFull.height);
      var fit = Math.min(curFull.width / bmp.width, curFull.height / bmp.height);
      var w = bmp.width * fit, h = bmp.height * fit;
      ctx.drawImage(bmp, (curFull.width - w) / 2, (curFull.height - h) / 2, w, h);
      curReal = true;
      var hpx = Math.round(curFull.height * (Math.max(curBands, 0) / BANDS));
      if (hpx > 0) {
        curDisp.getContext('2d').drawImage(curFull, 0, 0, curFull.width, hpx, 0, 0, curFull.width, hpx);
        curTex.needsUpdate = true;
      }
      if (bmp.close) bmp.close();
    }).catch(function () { /* honest fallback: the illustrative face stays */ });
  }
  function spawnCertificate(overrideName, overrideSerial, artUrl) {
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
    curReal = false;
    spawnToken += 1;
    if (artUrl) loadRealFace(artUrl, spawnToken);
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
    // A real row's face IS the official master — it already carries its
    // seal, QR, signature and security layers; the stations' physical
    // acts present what the document truly bears rather than drawing
    // stand-ins over the official art.
    if (curReal) return;
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
    uvLight.intensity = 0;
    uvLampMat.opacity = 0.25;
    qrBeamMat.opacity = 0;
    vaultDoor.position.y = VAULT_DOOR_CLOSED;
    sigArm.position.y = -0.55;
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
        // The scene texture needs ~1024px — the 'standard' profile; the
        // registrar's chosen archival profile governs the saved
        // artefacts, not this preview texture.
        var artUrl = liveCurrent.status === 'issued'
          ? ((liveCurrent.pngUrl || (liveCurrent.viewUrl ? liveCurrent.viewUrl + '&format=png' : null)))
          : null;
        if (artUrl) artUrl += '&quality=standard';
        spawnCertificate(shownName, liveCurrent.serialNo || null, artUrl);
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
    var motorTarget = t < 0.06 ? t / 0.06 : (t < 0.93 ? 1 : Math.max(0, 1 - (t - 0.93) / 0.06));
    motorLevel += (motorTarget - motorLevel) * Math.min(1, dtMs / 160);
    var feeding = t >= 0.06 && t < 0.26;
    var spin = motorLevel * (feeding ? 1 : 0.25) * dtMs * 0.012;
    rollers.forEach(function (r) { r.rotation.x -= spin; });
    mediaRoll.rotation.x -= feeding ? spin * 0.45 : 0;
    motorUpdate(motorLevel);

    // ---- The lamp works hardest while printing ----
    slotMat.emissiveIntensity = feeding ? 1.1 + Math.sin(now / 50) * 0.3 : 0.6 + motorLevel * 0.3;
    mouthLight.intensity = 0.35 + motorLevel * 0.35 + (feeding ? Math.sin(now / 50) * 0.08 : 0);

    // ---- Sheet mechanics: the journey down the line ----
    if (cur) {
      if (t < 0.26) {
        // Feed & print: pinned at the press mouth, emerging band by band.
        var fp = Math.max(0, (t - 0.06) / 0.2);
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
        curSheetX = MOUTH.x;
      } else {
        // On the line: travel between stations, dwell while each works.
        cur.scale.y = 1;
        curTex.repeat.y = 1;
        curTex.offset.y = 0;
        revealBands(BANDS);
        curSheetX = sheetXAt(t);
        // The inspection lift raises the sheet to the camera and lays
        // it back down; everywhere else it rides the line.
        var liftE = 0;
        if (t >= 0.69 && t < 0.78) liftE = easeOutCubic(Math.min(1, (t - 0.69) / 0.04));
        else if (t >= 0.78 && t < 0.81) liftE = 1 - easeInOut((t - 0.78) / 0.03);
        cur.position.set(
          curSheetX,
          MOUTH.y + (PRESENT.y - MOUTH.y) * liftE,
          MOUTH.z + (PRESENT.z - MOUTH.z) * liftE
        );
        cur.rotation.x = FEED_TILT + (PRESENT.tilt - FEED_TILT) * liftE;
        cur.material.transparent = false;
        cur.material.opacity = 1;

        // -- UV station: violet cure over the dwelling sheet; the
        // microtext security layer exists only after it. --
        if (t >= 0.32 && t < 0.38 && sheetOk()) {
          uvLight.intensity = 1.6 + Math.sin(now / 60) * 0.5;
          uvLampMat.opacity = 0.85;
          stationBuild('uv');
        } else {
          uvLight.intensity = Math.max(0, uvLight.intensity - dtMs * 0.01);
          uvLampMat.opacity = 0.25;
        }

        // -- Signature applicator: the nib dips while the hand appears --
        if (t >= 0.61 && t < 0.66 && sheetOk()) {
          sigArm.position.y = -0.55 - easeInOut(Math.min(1, (t - 0.61) / 0.02)) * 0.42
            + (t > 0.63 ? Math.sin(now / 70) * 0.02 : 0);
          if (t >= 0.625) {
            if (!curBuilt.signature && spanLongEnough()) playServo(0.25);
            stationBuild('signature');
          }
        } else {
          sigArm.position.y += (-0.55 - sigArm.position.y) * 0.1;
        }

        // -- Packaging: the crested folder rises to receive the sheet
        // as it dwells at the packaging station, then rides with it
        // into the vault. Standard tier skips the ceremony. --
        if (PACKAGING && sheetOk() && t >= 0.81) {
          folder.visible = true;
          var fr = Math.min(1, (t - 0.81) / 0.05);
          var fy = -2.7 + ((MOUTH.y - SHEET_H / 2 * 0.22) - (-2.7)) * easeOutCubic(fr);
          folder.position.set(curSheetX, fy + 0.55, MOUTH.z + 1.05);
          folder.rotation.x = FEED_TILT;
        }
        // Inside the vault: sheet (and folder) fade as the door seals.
        if (t >= 0.93) {
          var gone = 1 - Math.min(1, (t - 0.93) / 0.04);
          cur.material.transparent = true;
          cur.material.opacity = gone;
          folderFrontMat.opacity = gone;
          folderBackMat.opacity = gone;
        }
      }
    }

    // ---- The emboss die: accelerate down, land with weight, dwell,
    // withdraw — the seal exists on the face only after the strike. ----
    if (t >= 0.42 && t < 0.48 && cur && sheetOk()) {
      var ep = (t - 0.42) / 0.06;
      var py;
      if (ep < 0.3) py = PISTON_REST + (PISTON_STRIKE - PISTON_REST) * easeInCubic(ep / 0.3);
      else if (ep < 0.5) {
        py = PISTON_STRIKE;
        if (!pistonStruck) {
          pistonStruck = true;
          stationBuild('seal');
          shakeAmp = 1;
          if (soundOn && spanLongEnough()) playThud(0);
        }
      } else py = PISTON_STRIKE + (PISTON_REST - PISTON_STRIKE) * easeOutCubic((ep - 0.5) / 0.5);
      piston.position.y = py;
    } else {
      // At rest the hydraulics still breathe — tiny idle adjustments.
      piston.position.y = PISTON_REST + Math.sin(now / 2600) * 0.012;
    }

    // ---- The vault door: opens ahead of the arriving sheet, seals
    // behind it. Its glow breathes while open. ----
    var doorE = 0;
    if (t >= 0.87 && t < 0.905) doorE = easeInOut((t - 0.87) / 0.035);
    else if (t >= 0.905 && t < 0.94) doorE = 1;
    else if (t >= 0.94 && t < 0.97) doorE = 1 - easeInOut((t - 0.94) / 0.03);
    vaultDoor.position.y = VAULT_DOOR_CLOSED + (VAULT_DOOR_OPEN - VAULT_DOOR_CLOSED) * doorE;
    vaultGlowMat.opacity = 0.1 + doorE * 0.75 + (doorE > 0 ? Math.sin(now / 300) * 0.1 : 0);

    // ---- Steam as the sheet clears into the vault ----
    if (t >= 0.9 && !steamFired && sheetOk()) {
      steamFired = true;
      fireSteam();
    }

    // ---- The shoulder panel's stations, in production order ----
    var finishIdx = -1;
    for (var fi = FINISH_STARTS.length - 1; fi >= 0; fi--) {
      if (t >= FINISH_STARTS[fi]) { finishIdx = fi; break; }
    }
    if (t >= 0.97) finishIdx = -1; // reset between sheets
    if (finishIdx !== stagePanelActive) {
      stagePanelActive = finishIdx;
      drawStagePanel(finishIdx);
      if (finishIdx >= 0 && spanLongEnough()) playServo(curSheetX / 8);
    }

    // ---- QR engrave: the laser head fires while the code is burned --
    if (cur && t >= 0.52 && t < 0.58 && sheetOk()) {
      if (t >= 0.53) stationBuild('qr');
      cur.updateMatrixWorld();
      var qrLocal = new THREE.Vector3(SHEET_W * 0.31, -SHEET_H * 0.81, 0.03);
      var qrWorld = cur.localToWorld(qrLocal);
      qrSpark.position.copy(qrWorld);
      qrSpark.rotation.x = cur.rotation.x;
      qrSparkMat.opacity = (Math.sin(now / 28) * 0.5 + 0.5) * 0.9;
      // The visible beam connects the head's lens to the work point.
      qrBeam.position.set(qrWorld.x, (qrWorld.y + (-0.8 - 0.32)) / 2 + 0.28, qrWorld.z);
      qrBeam.scale.y = 1;
      qrBeamMat.opacity = 0.55 + Math.sin(now / 40) * 0.3;
    } else {
      qrSparkMat.opacity = 0;
      qrBeamMat.opacity = 0;
    }

    // ---- Inspection laser: one sweep down the lifted face — resolved
    // through the sheet's own transform so the beam rides the tilted
    // surface instead of sinking behind it. ----
    var scanPhase = (t - 0.72) / 0.05;
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

    // ---- The spark of inspection passed — real issuance only ----
    if (cur && t >= 0.775 && !burstFiredThisCycle && sheetOk()) {
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
    workLight.position.x = curSheetX;
    rim.color.lerp(rimTarget, 0.06);
    keyPulse *= 0.94;
    key.intensity = 1.3 + keyPulse * 0.35;
    lastCycleT = t;
  }
  function sheetOk() { return !liveCurrent || liveCurrent.status === 'issued'; }
  function spanLongEnough() { return (liveActive ? liveCycleMs : CYCLE) > 900; }
  function feedTickWanted() { return soundOn && spanLongEnough(); }

  var raf = null, running = false, userPaused = false, heroVisible = true;
  var lastTs = 0, camZ = 8.6, camX = -2.6, lookX = -3.0;
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
    // The crane trolley traverses the hall on its own long schedule.
    craneTrolley.position.x = 1 + Math.sin(ts / 21000) * 6.5;
    // ---- The camera rig: a continuous dolly that tracks the sheet
    // down the line, pushing in for inspection, easing wide at the
    // vault — damped throughout so there is never a cut, with the
    // lateral sway, presentation arc, and die-strike shudder layered
    // on top. ----
    var tphase = lastCycleT;
    var followX = Math.max(-3.6, Math.min(4.6, curSheetX * 0.85));
    var zBase = tphase < 0.26 ? 8.8 : (tphase < 0.66 ? 8.0 : (tphase < 0.81 ? 6.9 : 7.8));
    if (liveActive) zBase -= 0.7;
    camX += (followX - camX) * 0.035;
    camZ += ((zBase + Math.sin(ts / 13000) * 0.18) - camZ) * 0.03;
    lookX += (Math.max(-3.4, Math.min(5.2, curSheetX)) - lookX) * 0.045;
    var orbitX = 0;
    if (tphase >= 0.69 && tphase < 0.81) {
      orbitX = Math.sin(((tphase - 0.69) / 0.12) * Math.PI) * ORBIT;
    }
    camera.position.z = camZ;
    camera.position.x = camX + Math.sin(ts / 9000) * swayAmplitude * 0.6 + orbitX + (Math.random() - 0.5) * shakeAmp * 0.1;
    camera.position.y = -0.15 + Math.sin(ts / 11000) * 0.08 + (Math.random() - 0.5) * shakeAmp * 0.07;
    shakeAmp *= 0.88;
    camera.lookAt(lookX, -1.0, 1.2);
    renderScene();
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
    stationBuild('uv');
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
  // Spatial audio: every mechanical sound is panned to its station's
  // position on the line, so with headphones the press hums at the
  // left, the die lands centre, and the vault chimes to the right.
  function spatialOut(node, pan) {
    var ctx = audioCtx;
    if (ctx.createStereoPanner) {
      var p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan || 0));
      node.connect(p);
      p.connect(ctx.destination);
    } else {
      node.connect(ctx.destination);
    }
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
      osc.connect(filter); osc2.connect(filter); filter.connect(gain);
      spatialOut(gain, -0.4); // the press stands at the line's left
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
  function playServo(pan) {
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
    src.connect(bp).connect(g);
    spatialOut(g, pan);
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
    osc.connect(g);
    spatialOut(g, -0.4);
    osc.start(t0); osc.stop(t0 + 0.04);
  }
  // The emboss die landing: a deep, weighted thud — low sine body with
  // a short mechanical click on top.
  function playThud(pan) {
    var ctx = ensureAudioCtx();
    if (!ctx) return;
    var t0 = ctx.currentTime;
    var osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(85, t0);
    osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.22);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.11, t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.3);
    osc.connect(g);
    spatialOut(g, pan);
    osc.start(t0); osc.stop(t0 + 0.32);
    var click = ctx.createOscillator(); click.type = 'square'; click.frequency.value = 700;
    var cg = ctx.createGain();
    cg.gain.setValueAtTime(0.025, t0);
    cg.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.05);
    click.connect(cg);
    spatialOut(cg, pan);
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
    noise.connect(noiseFilter).connect(noiseGain);
    spatialOut(noiseGain, 0.35);
    noise.start(t0);
    var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(880, t0 + 0.1);
    var oscGain = ctx.createGain(); oscGain.gain.setValueAtTime(0, t0 + 0.1);
    oscGain.gain.linearRampToValueAtTime(0.05, t0 + 0.13);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    osc.connect(oscGain);
    spatialOut(oscGain, 0.35);
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
    { cycle: 14000, sway: 0.2, particleOpacity: 0.55, packaging: false, orbit: 0, bloom: false },
    { cycle: 12000, sway: 0.35, particleOpacity: 0.75, packaging: true, orbit: 0.45, bloom: true },
    { cycle: 10000, sway: 0.5, particleOpacity: 0.95, packaging: true, orbit: 0.9, bloom: true },
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
      BLOOM = tier.bloom;
      // The label teaches tier NAMES; the slider must speak them too,
      // not bare numbers (confirmed in adversarial review).
      qualityInput.setAttribute('aria-valuetext', TIER_NAMES[idx] || TIER_NAMES[1]);
    };
    qualityInput.addEventListener('input', applyTier);
    applyTier();
  }
})();
