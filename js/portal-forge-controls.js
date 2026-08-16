// Shared 3D instrument-panel builders for the portal's hero scenes
// (Certificate Forge, Registry Hall) — real Three.js geometry lit by
// the scene's own lights, not CSS gradients standing in for metal and
// glass. Each builder returns a THREE.Group plus a small update/set
// API; raycasting against the interactive ones (dial, switches) is
// wired by the scene file that owns the camera/renderer.
//
// Every visual control here is a skin on a real, native, keyboard- and
// screen-reader-operable input living in the page (a checkbox for each
// switch, a range for the dial) — that native input is the single
// source of truth. A raycast hit on a 3D mesh sets the input's
// value/checked and dispatches a real 'change'/'input' event; the 3D
// visuals only ever react to that event, the same as a mouse user's
// click would. Nothing here can be operated in a way the hidden input
// doesn't also register.
'use strict';

export function makeLCDTexture(THREE, opts) {
  var w = (opts && opts.width) || 512, h = (opts && opts.height) || 128;
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  var ctx = c.getContext('2d');
  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  function draw(lines) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0E0904';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var lineH = h / lines.length;
    lines.forEach(function (line, i) {
      var y = lineH * i + lineH / 2;
      ctx.font = (line.caption ? '400 ' : '600 ') + (line.size || 30) + 'px "Consolas","Menlo","Courier New",monospace';
      ctx.fillStyle = line.caption ? 'rgba(233,206,138,0.45)' : '#F3D98A';
      ctx.shadowColor = line.caption ? 'transparent' : 'rgba(243,217,138,0.85)';
      ctx.shadowBlur = line.caption ? 0 : 10;
      ctx.fillText(line.text, 18, y);
      ctx.shadowBlur = 0;
    });
    tex.needsUpdate = true;
  }
  return { texture: tex, draw: draw };
}

// A recessed LCD window: a dark bezel box behind a glowing text plane.
export function buildLCDPlane(THREE, width, height, opts) {
  var group = new THREE.Group();
  var bezel = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.06, height + 0.06, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x0B0703, metalness: 0.4, roughness: 0.7 })
  );
  group.add(bezel);
  var lcd = makeLCDTexture(THREE, { width: (opts && opts.texW) || 512, height: (opts && opts.texH) || 128 });
  var screen = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: lcd.texture, toneMapped: false })
  );
  screen.position.z = 0.025;
  group.add(screen);
  return { group: group, setLines: lcd.draw };
}

// A staircase of small emissive boxes — an audio-style level meter.
export function buildVUStrip(THREE, count, opts) {
  var group = new THREE.Group();
  var segW = (opts && opts.segWidth) || 0.09, gap = (opts && opts.gap) || 0.035;
  var maxH = (opts && opts.maxHeight) || 0.5;
  var segs = [];
  for (var i = 0; i < count; i++) {
    var hFrac = 0.35 + (i / (count - 1)) * 0.65;
    var geo = new THREE.BoxGeometry(segW, maxH * hFrac, 0.05);
    var mat = new THREE.MeshStandardMaterial({ color: 0x2A1D10, emissive: 0x000000, roughness: 0.5, metalness: 0.2 });
    var seg = new THREE.Mesh(geo, mat);
    seg.position.x = i * (segW + gap);
    seg.position.y = (maxH * hFrac) / 2;
    group.add(seg);
    segs.push(seg);
  }
  function setLevel(fraction) {
    var lit = Math.round(fraction * count);
    segs.forEach(function (seg, i) {
      var on = i < lit;
      var peak = i === lit - 1 && fraction < 1;
      seg.material.color.set(on ? 0xC6A15B : 0x2A1D10);
      seg.material.emissive.set(peak ? 0xFFEBB0 : (on ? 0xE9CE8A : 0x000000));
      seg.material.emissiveIntensity = peak ? 1.4 : (on ? 0.55 : 0);
    });
  }
  setLevel(0);
  return { group: group, setLevel: setLevel };
}

// A row of small emissive spheres — phase/status LEDs.
export function buildLEDRow(THREE, count, opts) {
  var group = new THREE.Group();
  var gap = (opts && opts.gap) || 0.16;
  var leds = [];
  for (var i = 0; i < count; i++) {
    var mat = new THREE.MeshStandardMaterial({ color: 0x3A2A17, emissive: 0x000000, roughness: 0.4, metalness: 0.3 });
    var led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), mat);
    led.position.x = i * gap;
    group.add(led);
    leds.push(led);
  }
  function setActive(uptoIndex) {
    leds.forEach(function (led, i) {
      var on = i <= uptoIndex;
      led.material.emissive.set(on ? 0xE9CE8A : 0x000000);
      led.material.emissiveIntensity = on ? 1.1 : 0;
      led.material.color.set(on ? 0xE9CE8A : 0x3A2A17);
    });
  }
  setActive(-1);
  return { group: group, setActive: setActive };
}

// A rotary dial: a knob mesh (the raycast target) over a fixed face,
// snapping between `positions` detents. Bound to a hidden
// <input type="range"> — the input is the source of truth; this only
// ever mirrors it (and writes back to it on a raycast hit).
export function bindDial(THREE, inputEl, opts) {
  var group = new THREE.Group();
  var face = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.36, 0.08, 32),
    new THREE.MeshStandardMaterial({ color: 0x1C1207, metalness: 0.5, roughness: 0.45 })
  );
  face.rotation.x = Math.PI / 2;
  group.add(face);
  var knob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.26, 0.1, 24),
    new THREE.MeshStandardMaterial({ color: 0xC6A15B, metalness: 0.75, roughness: 0.28 })
  );
  knob.rotation.x = Math.PI / 2;
  knob.position.z = 0.04;
  group.add(knob);
  var pointer = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.16, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x2A1D10, roughness: 0.4 })
  );
  pointer.position.set(0, 0.15, 0.1);
  knob.add(pointer);

  var angles = (opts && opts.angles) || [-0.6, 0, 0.6];
  var max = Number(inputEl.max) || (angles.length - 1);

  function render() {
    var v = Number(inputEl.value);
    knob.rotation.z = angles[v];
    if (opts && opts.onRender) opts.onRender(v);
  }
  render();
  inputEl.addEventListener('input', render);

  function advance() {
    inputEl.value = String((Number(inputEl.value) + 1) % (max + 1));
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return { group: group, hitMesh: knob, advance: advance };
}

// A physical toggle lever bound to a hidden <input type="checkbox"> —
// the checkbox is the source of truth; a raycast hit flips it and
// dispatches a real 'change' event.
export function bindSwitch(THREE, checkboxEl) {
  var group = new THREE.Group();
  var base = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.06, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x1C1207, metalness: 0.4, roughness: 0.5 })
  );
  group.add(base);
  var pivot = new THREE.Group();
  pivot.position.set(0, 0.03, 0);
  group.add(pivot);
  var lever = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.035, 0.22, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0xC6A15B, metalness: 0.7, roughness: 0.3, emissive: 0x000000 })
  );
  lever.position.set(0, 0.12, 0);
  pivot.add(lever);

  function render() {
    var on = checkboxEl.checked;
    pivot.rotation.z = on ? -0.55 : 0.55;
    lever.material.emissive.set(on ? 0x9C7A3C : 0x000000);
    lever.material.emissiveIntensity = on ? 0.5 : 0;
  }
  render();
  checkboxEl.addEventListener('change', render);

  function flip() {
    checkboxEl.checked = !checkboxEl.checked;
    checkboxEl.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return { group: group, hitMesh: lever, flip: flip };
}

// A guarded, inert switch — a lever fixed under a hatch-striped cover.
// No raycast target is returned: it is never wired to interaction,
// the honest version of "a real switch that does nothing" instead of
// a disabled-looking button.
export function buildGuardedSwitch(THREE) {
  var group = new THREE.Group();
  var base = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.06, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x1C1207, metalness: 0.4, roughness: 0.5 })
  );
  group.add(base);
  var lever = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.03, 0.16, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0x5C4A2E, metalness: 0.5, roughness: 0.6 })
  );
  lever.position.set(0, 0.09, 0);
  lever.rotation.z = 0.5;
  group.add(lever);
  var cover = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.05, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x2A1D10, metalness: 0.3, roughness: 0.7 })
  );
  cover.position.set(0, 0.16, 0);
  cover.rotation.x = -0.3;
  group.add(cover);
  return { group: group };
}

// An engraved brass plaque — canvas-texture text on a bevelled plate,
// the 3D replacement for what used to be a plain DOM caption.
export function buildPlaque(THREE, text, width, height) {
  var c = document.createElement('canvas');
  c.width = 1600; c.height = 200;
  var ctx = c.getContext('2d');
  ctx.fillStyle = '#2A1D10'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // Fit the plate rather than clipping — text length varies per hero.
  var size = 48, maxW = c.width - 80;
  var upper = text.toUpperCase();
  do {
    ctx.font = '600 ' + size + 'px Georgia, serif';
    size -= 2;
  } while (ctx.measureText(upper).width > maxW && size > 16);
  ctx.fillStyle = '#E9CE8A';
  ctx.shadowColor = 'rgba(233,206,138,0.4)'; ctx.shadowBlur = 6;
  ctx.fillText(upper, c.width / 2, c.height / 2);
  var tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  var mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
  );
  return { mesh: mesh };
}

// Raycasts pointer events on `canvas` against `targets` (an array of
// {mesh, onHit}) using `camera`. Shared by both scenes so the hit-test
// plumbing (NDC conversion, click-vs-drag distinction) exists once.
export function wireRaycast(THREE, canvas, camera, targets) {
  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  canvas.addEventListener('click', function (e) {
    var rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    var meshes = targets.map(function (t) { return t.mesh; });
    var hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return;
    var hit = targets.find(function (t) { return t.mesh === hits[0].object; });
    if (hit) hit.onHit();
  });
  canvas.addEventListener('pointermove', function (e) {
    var rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    var meshes = targets.map(function (t) { return t.mesh; });
    var hits = raycaster.intersectObjects(meshes, false);
    canvas.style.cursor = hits.length ? 'pointer' : '';
  });
}
