/* ==========================================================================
   SmileCare — hero 3D scene
   A glossy enamel tooth rendered with Three.js (r128, global THREE).
   Progressive enhancement: if WebGL or the library is unavailable the CSS
   fallback orb in .hero-art stays visible.
   The scene is built lazily (only when the hero approaches the viewport) and
   rendering pauses while the hero is off-screen to save battery.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('hero3d');
  if (!canvas) return;
  var art = canvas.parentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function webglOK() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  if (typeof THREE === 'undefined' || !webglOK()) return;

  var renderer, scene, camera, toothGroup, orbs = [], raf = null;
  var clock = { start: performance.now() };
  var started = false;
  var intro = reduceMotion ? 1 : 0;

  /* ---- Environment (studio gradient) ---- */
  function makeEnvTexture() {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    var g = c.getContext('2d');

    var grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#f4fffc');
    grad.addColorStop(0.42, '#c3f1e7');
    grad.addColorStop(0.72, '#3dc9b0');
    grad.addColorStop(1, '#083c36');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 512);

    var warm = g.createRadialGradient(250, 110, 0, 250, 110, 430);
    warm.addColorStop(0, 'rgba(255, 241, 216, 0.95)');
    warm.addColorStop(1, 'rgba(255, 241, 216, 0)');
    g.fillStyle = warm;
    g.fillRect(0, 0, 1024, 512);

    var cool = g.createRadialGradient(830, 190, 0, 830, 190, 390);
    cool.addColorStop(0, 'rgba(150, 242, 255, 0.85)');
    cool.addColorStop(1, 'rgba(150, 242, 255, 0)');
    g.fillStyle = cool;
    g.fillRect(0, 0, 1024, 512);

    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  /* ---- Soft contact shadow ---- */
  function makeShadowTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var g = c.getContext('2d');
    var r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(8, 60, 54, 0.55)');
    r.addColorStop(0.45, 'rgba(8, 60, 54, 0.20)');
    r.addColorStop(1, 'rgba(8, 60, 54, 0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  /* Subtle organic lumpiness so the crown never reads as "perfect spheres" */
  function addEnamelTexture(geo) {
    var pos = geo.attributes.position;
    var nrm = geo.attributes.normal;
    if (!pos || !nrm) return;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      var d = 0.022 * Math.sin(x * 7.0 + y * 3.1) * Math.sin(z * 6.2 + y * 4.3);
      pos.setXYZ(i, x + nrm.getX(i) * d, y + nrm.getY(i) * d, z + nrm.getZ(i) * d);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  function build() {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.4, 7.7);
    camera.lookAt(0, 0.05, 0);

    /* Environment map for glossy reflections */
    var pmrem = new THREE.PMREMGenerator(renderer);
    if (pmrem.compileEquirectangularShader) pmrem.compileEquirectangularShader();
    var envTex = makeEnvTexture();
    var envRT = pmrem.fromEquirectangular(envTex);
    scene.environment = envRT.texture;
    envTex.dispose();
    pmrem.dispose();

    /* Lights (one consistent key from top-left) */
    scene.add(new THREE.HemisphereLight(0xffffff, 0x0b6e62, 0.32));

    var key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(5, 7, 6);
    scene.add(key);

    var rim = new THREE.DirectionalLight(0x5eead4, 1.05);
    rim.position.set(-6, 2, -4);
    scene.add(rim);

    var warmFill = new THREE.PointLight(0xf5a623, 0.8, 30);
    warmFill.position.set(-3, -3, 4);
    scene.add(warmFill);

    /* Enamel material */
    var enamel = new THREE.MeshPhysicalMaterial({
      color: 0xeaf5f2,
      roughness: 0.32,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.22,
      reflectivity: 0.55,
      envMapIntensity: 0.85
    });

    toothGroup = new THREE.Group();

    /* Crown — two merged spheres give a molar silhouette */
    var crownGeo = new THREE.SphereGeometry(1.02, 64, 64);
    addEnamelTexture(crownGeo);
    [-0.44, 0.44].forEach(function (x) {
      var m = new THREE.Mesh(crownGeo, enamel);
      m.position.set(x, 0.62, 0);
      m.scale.set(1, 0.96, 1);
      toothGroup.add(m);
    });
    /* Bridge the centre of the crown */
    var bridge = new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 48), enamel);
    bridge.position.set(0, 0.44, 0);
    bridge.scale.set(1, 0.9, 0.95);
    toothGroup.add(bridge);

    /* Roots — two tapered cones pointing down */
    var rootGeo = new THREE.ConeGeometry(0.44, 1.9, 40, 1);
    [-0.5, 0.5].forEach(function (x, i) {
      var root = new THREE.Mesh(rootGeo, enamel);
      root.position.set(x, -1.0, 0);
      root.rotation.x = Math.PI;
      root.rotation.z = i === 0 ? 0.1 : -0.1;
      root.scale.set(1, 1, 0.86);
      toothGroup.add(root);
    });

    toothGroup.position.y = -0.1;
    scene.add(toothGroup);

    /* Floating glass orbs for depth */
    var specs = [
      [2.2, 1.15, 0.5, 0.28, 0x8ff0e0],
      [-2.35, 0.5, 0.7, 0.22, 0x8ff0e0],
      [1.7, -1.05, 1.1, 0.17, 0x9fe8db],
      [-1.6, -1.35, 0.9, 0.15, 0xf7c877],
      [2.45, -0.35, -0.7, 0.2, 0x8ff0e0]
    ];
    specs.forEach(function (s, i) {
      var mat = new THREE.MeshPhysicalMaterial({
        color: s[4], roughness: 0.12, metalness: 0.0,
        clearcoat: 1, clearcoatRoughness: 0.1,
        transparent: true, opacity: 0.6, envMapIntensity: 1.3
      });
      var orb = new THREE.Mesh(new THREE.SphereGeometry(s[3], 32, 32), mat);
      orb.position.set(s[0], s[1], s[2]);
      scene.add(orb);
      orbs.push({ mesh: orb, y: s[1], ph: i * 1.3 });
    });

    /* Contact shadow */
    var shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 4.8),
      new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -2.25;
    scene.add(shadow);

    resize();
    art.classList.add('has-3d');
  }

  function resize() {
    if (!renderer || !art) return;
    var w = art.clientWidth || 1;
    var h = art.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---- Pointer parallax ---- */
  var tx = 0, ty = 0, px = 0, py = 0;
  window.addEventListener('pointermove', function (e) {
    var r = art.getBoundingClientRect();
    if (!r.width || !r.height) return;
    tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
  }, { passive: true });

  function renderFrame(now) {
    var t = (now - clock.start) * 0.001;
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;

    /* Intro scale-in (approaches 1 with an ease-out feel) */
    intro += (1 - intro) * 0.035;

    var s = 1.12 * (0.86 + 0.14 * intro);
    var sway = Math.min(intro, 1);
    toothGroup.scale.setScalar(s);
    toothGroup.rotation.y = Math.sin(t * 0.42) * 0.34 * sway + px * 0.55;
    toothGroup.rotation.x = py * 0.26 * sway;
    toothGroup.position.y = -0.1 + Math.sin(t * 0.9) * 0.09 * sway;

    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      o.mesh.position.y = o.y + Math.sin(t * 0.85 + o.ph) * 0.16;
      o.mesh.rotation.y = t * 0.3 + o.ph;
    }
    renderer.render(scene, camera);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    renderFrame(now);
  }

  function start() {
    if (raf) return;
    clock.start = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  /* ---- Build lazily when the hero nears the viewport; pause off-screen ---- */
  function engage() {
    if (started) {
      if (!reduceMotion) start();
      return;
    }
    try {
      build();
      started = true;
      if (reduceMotion) {
        renderFrame(performance.now());
      } else {
        start();
      }
    } catch (e) {
      art.classList.remove('has-3d');
    }
  }
  function disengage() {
    stop();
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) engage();
        else disengage();
      });
    }, { rootMargin: '150px 0px 150px 0px', threshold: 0 });
    io.observe(art);
  } else {
    engage();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) disengage();
    else engage();
  });

  var ro = null;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(resize);
    ro.observe(art);
  } else {
    window.addEventListener('resize', resize);
  }
})();