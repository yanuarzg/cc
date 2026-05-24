/* ═══════════════════════════════════════════════════════
   YZTHEME LANDING — script.js
   Three.js + GSAP ScrollTrigger Cinematic Scroll
   ═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   1. GSAP PLUGINS REGISTER
───────────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ─────────────────────────────────────────
   2. THREE.JS SCENE SETUP
───────────────────────────────────────── */
const canvas   = document.getElementById('bg-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene  = new THREE.Scene();
scene.fog    = new THREE.FogExp2(0x030508, 0.028);
scene.background = new THREE.Color(0x030508);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 0, 20);

/* ─────────────────────────────────────────
   3. LIGHTS
───────────────────────────────────────── */
const ambient = new THREE.AmbientLight(0x1a2a3a, 1.5);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0x4f9eff, 3);
keyLight.position.set(5, 10, 10);
keyLight.castShadow = true;
scene.add(keyLight);

const fillLight = new THREE.PointLight(0x7b5fff, 4, 40);
fillLight.position.set(-8, 4, 5);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xff6b4a, 3, 30);
rimLight.position.set(10, -4, -10);
scene.add(rimLight);

const accentLight1 = new THREE.PointLight(0x4f9eff, 2, 25);
accentLight1.position.set(-10, 0, 15);
scene.add(accentLight1);

/* ─────────────────────────────────────────
   4. PARTICLE SYSTEM (Stars / dust)
───────────────────────────────────────── */
function makeParticles(count, spread, size, color) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    pos[i] = (Math.random() - .5) * spread;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: .7,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

const stars     = makeParticles(1800, 280, 0.15, 0xaad4ff);
const midDust   = makeParticles(600,  80,  0.08, 0x7b5fff);
const nearDust  = makeParticles(200,  30,  0.06, 0x4f9eff);
scene.add(stars, midDust, nearDust);

/* ─────────────────────────────────────────
   5. FLOATING GEOMETRIC OBJECTS
───────────────────────────────────────── */
const objects = [];

function addObject(geo, mat, x, y, z, rx = 0, ry = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  objects.push(mesh);
  return mesh;
}

// Shared materials
const matBlue = new THREE.MeshStandardMaterial({
  color: 0x1a3a6a,
  metalness: .85,
  roughness: .15,
  emissive: new THREE.Color(0x0a1f4a),
  emissiveIntensity: .3,
  envMapIntensity: 1.2,
  wireframe: false,
});
const matPurple = new THREE.MeshStandardMaterial({
  color: 0x2d1a5a,
  metalness: .9,
  roughness: .1,
  emissive: new THREE.Color(0x1a0a3a),
  emissiveIntensity: .4,
});
const matOrange = new THREE.MeshStandardMaterial({
  color: 0x4a2010,
  metalness: .7,
  roughness: .25,
  emissive: new THREE.Color(0x3a1208),
  emissiveIntensity: .5,
});
const matWire = new THREE.MeshStandardMaterial({
  color: 0x4f9eff,
  metalness: 1,
  roughness: 0,
  transparent: true,
  opacity: .12,
  wireframe: true,
});

// Scene 1 — Hero: large icosahedron + rings
const ico = addObject(
  new THREE.IcosahedronGeometry(3.5, 1),
  matBlue, 8, -1, -5, .3, .5
);
const icoWire = addObject(
  new THREE.IcosahedronGeometry(3.8, 1),
  matWire, 8, -1, -5, .3, .5
);

// Ring torus
const ring1 = addObject(
  new THREE.TorusGeometry(5, 0.04, 16, 100),
  new THREE.MeshStandardMaterial({ color: 0x4f9eff, emissive: 0x4f9eff, emissiveIntensity: .6, transparent: true, opacity: .5 }),
  8, -1, -5, Math.PI / 2.5, 0
);
const ring2 = addObject(
  new THREE.TorusGeometry(6.5, 0.025, 16, 100),
  new THREE.MeshStandardMaterial({ color: 0x7b5fff, emissive: 0x7b5fff, emissiveIntensity: .4, transparent: true, opacity: .3 }),
  8, -1, -5, Math.PI / 3, .3
);

// Scene 2 — Services: floating boxes / octahedrons
const oct1 = addObject(new THREE.OctahedronGeometry(1.4), matPurple, -7,  2, -20, .2, .4);
const oct2 = addObject(new THREE.OctahedronGeometry(0.9), matBlue,    5,  4, -22, .5, .1);
const box1 = addObject(new THREE.BoxGeometry(1.8, 1.8, 1.8), matBlue,  -4, -3, -18, .3, .6);

// Scene 3 — Maintenance: tetrahedra / dodecahedron
const dodec = addObject(new THREE.DodecahedronGeometry(2), matPurple,  7,  0, -38, .1, .3);
const tet1  = addObject(new THREE.TetrahedronGeometry(1.2), matOrange,  -6, 3, -40, .4, .2);

// Scene 4 — Pricing: cone / torus knot
const torusKnot = addObject(
  new THREE.TorusKnotGeometry(1.5, 0.4, 128, 16),
  new THREE.MeshStandardMaterial({ color: 0x0a2a4a, metalness: 1, roughness: 0, emissive: 0x052244, emissiveIntensity: .4 }),
  -7, 0, -55
);
const cone = addObject(new THREE.ConeGeometry(1.2, 2.4, 6), matBlue, 6, -2, -57, 0, .5);

// Scene 5 — CTA: big sphere + particles orbiting
const sphere = addObject(
  new THREE.SphereGeometry(2.8, 64, 64),
  new THREE.MeshStandardMaterial({ color: 0x0a1e3a, metalness: .9, roughness: .05, emissive: 0x051a36, emissiveIntensity: .5 }),
  0, 0, -72
);
const sphereRing = addObject(
  new THREE.TorusGeometry(4.2, 0.05, 8, 120),
  new THREE.MeshStandardMaterial({ color: 0x4f9eff, emissive: 0x4f9eff, emissiveIntensity: .8, transparent: true, opacity: .6 }),
  0, 0, -72, Math.PI / 4
);

// Extra ambient floaters
for (let i = 0; i < 20; i++) {
  const size  = Math.random() * 0.4 + 0.12;
  const types = [
    new THREE.IcosahedronGeometry(size),
    new THREE.OctahedronGeometry(size),
    new THREE.TetrahedronGeometry(size),
  ];
  const geo   = types[Math.floor(Math.random() * 3)];
  const mats  = [matBlue, matPurple, matOrange];
  const mat   = mats[Math.floor(Math.random() * 3)].clone();
  mat.transparent = true;
  mat.opacity = .4 + Math.random() * .4;
  const m = addObject(
    geo, mat,
    (Math.random() - .5) * 24,
    (Math.random() - .5) * 12,
    -(Math.random() * 80 + 5),
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  );
  m.userData.floatSpeed   = .4 + Math.random() * .8;
  m.userData.floatAmplitude = .2 + Math.random() * .5;
  m.userData.floatOffset  = Math.random() * Math.PI * 2;
  m.userData.rotSpeed     = (Math.random() - .5) * .008;
}

/* ─────────────────────────────────────────
   6. GRID FLOOR — depth illusion
───────────────────────────────────────── */
const gridGeo = new THREE.PlaneGeometry(120, 300, 40, 80);
const gridMat = new THREE.MeshBasicMaterial({
  color: 0x0d1a2a,
  wireframe: true,
  transparent: true,
  opacity: .08,
});
const grid = new THREE.Mesh(gridGeo, gridMat);
grid.rotation.x = -Math.PI / 2;
grid.position.set(0, -8, -40);
scene.add(grid);

/* ─────────────────────────────────────────
   7. CAMERA PATH (scroll-driven)
───────────────────────────────────────── */
const cameraPath = {
  positions: [
    { x: 0,  y: 0,  z: 20 },   // Hero
    { x: -1, y: 1,  z: -5 },   // Services
    { x: 1,  y: -1, z: -25 },  // Maintenance
    { x: -1, y: .5, z: -45 },  // Pricing
    { x: 0,  y: 0,  z: -65 },  // CTA
  ],
  lookAts: [
    { x: 0,  y: 0,  z: 0  },
    { x: 0,  y: 0,  z: -10 },
    { x: 0,  y: 0,  z: -30 },
    { x: 0,  y: 0,  z: -50 },
    { x: 0,  y: 0,  z: -70 },
  ]
};

/* Camera state driven by scroll */
let camTarget = { x: 0, y: 0, z: 20 };
let camLookAt = new THREE.Vector3(0, 0, 0);
let targetLookAt = new THREE.Vector3(0, 0, 0);

/* ─────────────────────────────────────────
   8. SCROLL → THREE.JS CAMERA ANIMATION
───────────────────────────────────────── */
const sections = ['#hero', '#services', '#maintenance', '#pricing', '#contact'];
sections.forEach((sel, i) => {
  const el = document.querySelector(sel);
  if (!i) return; // Hero uses init
  ScrollTrigger.create({
    trigger: el,
    start: 'top 70%',
    end: 'top 20%',
    scrub: 1.5,
    onUpdate(self) {
      const p  = cameraPath.positions[i];
      const pp = cameraPath.positions[i - 1];
      const la  = cameraPath.lookAts[i];
      const lap = cameraPath.lookAts[i - 1];
      const t   = self.progress;
      camTarget.x = THREE.MathUtils.lerp(pp.x, p.x, t);
      camTarget.y = THREE.MathUtils.lerp(pp.y, p.y, t);
      camTarget.z = THREE.MathUtils.lerp(pp.z, p.z, t);
      targetLookAt.set(
        THREE.MathUtils.lerp(lap.x, la.x, t),
        THREE.MathUtils.lerp(lap.y, la.y, t),
        THREE.MathUtils.lerp(lap.z, la.z, t),
      );
      // Modulate lights per scene
      fillLight.intensity = 4 + i * 0.5;
      rimLight.intensity  = 3 + i * 0.4;
    }
  });
});

/* ─────────────────────────────────────────
   9. RENDER LOOP
───────────────────────────────────────── */
let clock = new THREE.Clock();
let mouseX = 0, mouseY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth  - .5) * 2;
  mouseY = (e.clientY / window.innerHeight - .5) * 2;
});

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Smooth camera
  camera.position.x += (camTarget.x + mouseX * .6 - camera.position.x) * .04;
  camera.position.y += (camTarget.y - mouseY * .4 - camera.position.y) * .04;
  camera.position.z += (camTarget.z - camera.position.z) * .04;

  // Camera look-at smooth
  camLookAt.lerp(targetLookAt, .04);
  camera.lookAt(camLookAt);

  // Rotate hero objects
  ico.rotation.y     += .003;
  ico.rotation.x     += .001;
  icoWire.rotation.y -= .002;
  icoWire.rotation.x += .001;
  ring1.rotation.z   += .004;
  ring2.rotation.z   -= .003;

  // Rotate scene objects
  oct1.rotation.y     += .006;
  oct2.rotation.x     += .005;
  box1.rotation.x     += .004;
  box1.rotation.y     += .006;
  dodec.rotation.y    += .005;
  tet1.rotation.z     += .007;
  torusKnot.rotation.y += .008;
  cone.rotation.y      += .01;
  sphere.rotation.y    += .003;
  sphereRing.rotation.z += .006;

  // Particle drift
  stars.rotation.y  += .00005;
  midDust.rotation.y -= .0001;
  nearDust.rotation.x += .0002;

  // Float ambient objects
  objects.forEach(obj => {
    if (obj.userData.floatSpeed) {
      const fs = obj.userData.floatSpeed;
      const fa = obj.userData.floatAmplitude;
      const fo = obj.userData.floatOffset;
      obj.position.y += Math.sin(t * fs + fo) * fa * 0.003;
      obj.rotation.y += obj.userData.rotSpeed;
    }
  });

  // Pulsing accent light
  accentLight1.intensity = 2 + Math.sin(t * 1.5) * .8;
  fillLight.position.x = -8 + Math.sin(t * .3) * 3;
  fillLight.position.y =  4 + Math.cos(t * .4) * 2;

  renderer.render(scene, camera);
}
animate();

/* ─────────────────────────────────────────
   10. RESIZE HANDLER
───────────────────────────────────────── */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  ScrollTrigger.refresh();
});

/* ─────────────────────────────────────────
   11. GSAP HERO ENTRANCE
───────────────────────────────────────── */
const heroTL = gsap.timeline({ delay: .2 });
heroTL
  .to('.hero-badge', { opacity: 1, y: 0, duration: .8, ease: 'power3.out' })
  .to('.hero-title .line', {
    opacity: 1, y: 0,
    duration: .9,
    stagger: .15,
    ease: 'power3.out',
  }, '-=.4')
  .to('.hero-sub', { opacity: 1, y: 0, duration: .8, ease: 'power3.out' }, '-=.5')
  .to('.hero-actions', { opacity: 1, y: 0, duration: .7, ease: 'power3.out' }, '-=.5')
  .to('.hero-stats', { opacity: 1, duration: .7, ease: 'power3.out' }, '-=.4')
  .to('.scroll-hint', { opacity: 1, duration: .8, ease: 'power2.out' }, '-=.3');

/* ─────────────────────────────────────────
   12. SECTION REVEAL ANIMATIONS
───────────────────────────────────────── */
function revealOnScroll(el, vars, trigger = el, start = 'top 80%') {
  gsap.to(el, {
    ...vars,
    scrollTrigger: { trigger: trigger || el, start, toggleActions: 'play none none none' }
  });
}

// Services section
ScrollTrigger.batch('.section-label', {
  start: 'top 85%',
  onEnter: (els) => gsap.to(els, { opacity: 1, x: 0, duration: .7, stagger: .1, ease: 'power3.out' }),
});
ScrollTrigger.batch('.section-title', {
  start: 'top 85%',
  onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: .8, stagger: .12, ease: 'power3.out' }),
});
ScrollTrigger.batch('.platform-card', {
  start: 'top 85%',
  onEnter: (els) => gsap.to(els, {
    opacity: 1, y: 0,
    duration: .9,
    stagger: .15,
    ease: 'power3.out',
  }),
});

// Maintenance section
revealOnScroll('.split-desc', { opacity: 1, y: 0, duration: .8, ease: 'power3.out' }, '#maintenance');
ScrollTrigger.batch('.pill', {
  start: 'top 90%',
  onEnter: (els) => gsap.to(els, { opacity: 1, x: 0, duration: .7, stagger: .12, ease: 'power3.out' }),
});
gsap.to('.metrics-card', {
  opacity: 1,
  x: 0,
  scale: 1,
  duration: 1.1,
  ease: 'power3.out',
  scrollTrigger: { trigger: '.metrics-card', start: 'top 80%' }
});
ScrollTrigger.create({
  trigger: '.metrics-card',
  start: 'top 75%',
  onEnter: () => {
    document.querySelectorAll('.metric-fill').forEach(el => {
      el.classList.add('animate');
    });
  }
});

// Pricing section
revealOnScroll('.pricing-sub', { opacity: 1, y: 0, duration: .7, ease: 'power3.out' }, '#pricing');
ScrollTrigger.batch('.price-card', {
  start: 'top 85%',
  onEnter: (els) => gsap.to(els, {
    opacity: 1, y: 0,
    duration: .9,
    stagger: .15,
    ease: 'power3.out',
  }),
});

// CTA section
const ctaTL = gsap.timeline({
  scrollTrigger: { trigger: '#contact', start: 'top 75%' }
});
ctaTL
  .to('.cta-eyebrow',  { opacity: 1, y: 0, duration: .7, ease: 'power3.out' })
  .to('.cta-title',    { opacity: 1, y: 0, duration: .9, ease: 'power3.out' }, '-=.4')
  .to('.cta-desc',     { opacity: 1, y: 0, duration: .7, ease: 'power3.out' }, '-=.5')
  .to('.whatsapp-btn', { opacity: 1, y: 0, scale: 1, duration: .8, ease: 'back.out(1.5)' }, '-=.4')
  .to('.cta-trust',    { opacity: 1, duration: .7, ease: 'power2.out' }, '-=.4');

/* ─────────────────────────────────────────
   13. NAVBAR SCROLL BEHAVIOR
───────────────────────────────────────── */
const navbar = document.getElementById('navbar');
ScrollTrigger.create({
  start: 'top -80',
  onUpdate(self) {
    if (self.scroll() > 80) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  }
});

/* ─────────────────────────────────────────
   14. MOBILE BURGER MENU
───────────────────────────────────────── */
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobile-menu');
burger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  const spans = burger.querySelectorAll('span');
  if (mobileMenu.classList.contains('open')) {
    gsap.to(spans[0], { rotation: 45, y: 6.5, duration: .3 });
    gsap.to(spans[1], { opacity: 0, duration: .2 });
    gsap.to(spans[2], { rotation: -45, y: -6.5, duration: .3 });
  } else {
    gsap.to(spans[0], { rotation: 0, y: 0, duration: .3 });
    gsap.to(spans[1], { opacity: 1, duration: .2 });
    gsap.to(spans[2], { rotation: 0, y: 0, duration: .3 });
  }
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    const spans = burger.querySelectorAll('span');
    gsap.to(spans[0], { rotation: 0, y: 0, duration: .3 });
    gsap.to(spans[1], { opacity: 1, duration: .2 });
    gsap.to(spans[2], { rotation: 0, y: 0, duration: .3 });
  });
});

/* ─────────────────────────────────────────
   15. SMOOTH ANCHOR SCROLL
───────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      gsap.to(window, { duration: 1.2, scrollTo: { y: target, offsetY: 0 }, ease: 'power3.inOut' });
    }
  });
});

/* ─────────────────────────────────────────
   16. CUSTOM CURSOR
───────────────────────────────────────── */
const cursorDot   = document.getElementById('cursor');
const cursorTrail = document.getElementById('cursor-trail');
if (cursorDot && cursorTrail) {
  document.addEventListener('mousemove', (e) => {
    gsap.to(cursorDot, {
      x: e.clientX, y: e.clientY,
      duration: .05, overwrite: true
    });
    gsap.to(cursorTrail, {
      x: e.clientX, y: e.clientY,
      duration: .15, overwrite: true
    });
  });
}

/* ─────────────────────────────────────────
   17. PARALLAX ON SECTION LABELS
───────────────────────────────────────── */
document.querySelectorAll('.scene').forEach((sec) => {
  const content = sec.querySelector('.scene-content');
  if (!content) return;
  gsap.to(content, {
    yPercent: -8,
    ease: 'none',
    scrollTrigger: {
      trigger: sec,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1,
    }
  });
});

/* ─────────────────────────────────────────
   18. WA BUTTON PULSE
───────────────────────────────────────── */
const waBtn = document.getElementById('wa-btn');
if (waBtn) {
  gsap.to(waBtn, {
    boxShadow: '0 0 80px rgba(37,211,102,.6)',
    repeat: -1,
    yoyo: true,
    duration: 1.8,
    ease: 'power2.inOut',
  });
}

/* ─────────────────────────────────────────
   19. SCROLL PROGRESS — dynamic fog
───────────────────────────────────────── */
ScrollTrigger.create({
  start: 0,
  end: 'max',
  scrub: true,
  onUpdate(self) {
    const p = self.progress;
    scene.fog.density = .028 + p * .012;
    renderer.toneMappingExposure = 1.1 - p * .1;
  }
});

/* ─────────────────────────────────────────
   20. HERO TITLE CHAR SPLIT HOVER FX
───────────────────────────────────────── */
document.querySelectorAll('.hero-title .line').forEach(line => {
  const text = line.textContent;
  // Only split the accent line
  if (!line.classList.contains('accent')) return;
  line.innerHTML = text.split('').map(c =>
    c === ' ' ? ' ' : `<span class="char">${c}</span>`
  ).join('');
  line.querySelectorAll('.char').forEach((ch, i) => {
    ch.style.display = 'inline-block';
    ch.style.transition = `transform .3s ${i * .03}s, color .3s`;
    ch.addEventListener('mouseenter', () => {
      gsap.to(ch, { y: -6, scale: 1.15, duration: .2 });
    });
    ch.addEventListener('mouseleave', () => {
      gsap.to(ch, { y: 0, scale: 1, duration: .3 });
    });
  });
});

console.log('%c YzTheme © 2025 — Digital Agency & Web Studio', 'color:#4f9eff;font-family:monospace;font-size:13px;font-weight:bold;');
