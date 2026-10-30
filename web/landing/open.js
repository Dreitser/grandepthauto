// Runs after the wordmark has painted. Does not gate the logo.

(function () {
  var onLanding = location.pathname.indexOf('/landing/') !== -1;
  var city = onLanding ? '../city/' : '/city/';
  var brand = onLanding ? '../brand/' : '/brand/';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('a.launch').forEach(function (link) {
    link.href = city;
    link.addEventListener('click', function (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      leave(city);
    });
  });

  document.body.classList.add('is-open');

  var soundButton = document.getElementById('sound');
  var audio = null;
  if (soundButton) {
    soundButton.addEventListener('click', function () {
      if (!audio) audio = startPad();
      if (!audio) return;
      var on = soundButton.getAttribute('aria-pressed') !== 'true';
      soundButton.setAttribute('aria-pressed', on ? 'true' : 'false');
      soundButton.textContent = on ? 'Sound on' : 'Sound';
      audio.gain.gain.cancelScheduledValues(audio.ctx.currentTime);
      audio.gain.gain.linearRampToValueAtTime(on ? 0.02 : 0.0001, audio.ctx.currentTime + 0.4);
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
    });
  }

  document.addEventListener('keydown', function (event) {
    var tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.key !== 'Enter') return;
    if (event.target && event.target.closest && event.target.closest('a, button, input, textarea, select')) return;
    leave(city);
  });

  if (!reduced) wash();
  brandImages();

  function leave(href) {
    document.body.classList.add('is-leaving');
    window.setTimeout(function () { location.href = href; }, reduced ? 0 : 700);
  }

  function startPad() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var ctx = new AC();
    var gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(ctx.destination);
    [55, 82.5].forEach(function (freq, index) {
      var osc = ctx.createOscillator();
      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
    });
    return { ctx: ctx, gain: gain };
  }

  function wash() {
    var canvas = document.getElementById('wash');
    if (!canvas) return;
    import('https://cdn.jsdelivr.net/gh/mrdoob/three.js@b3396270682287470d161658ac01084d25e8dba6/build/three.module.js').then(function (THREE) {
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(1);
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 30);
      camera.position.z = 6;
      var count = 70;
      var positions = new Float32Array(count * 3);
      for (var i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 8;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
      }
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      var points = new THREE.Points(geometry, new THREE.PointsMaterial({
        color: 0xd5d8de,
        size: 0.035,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      }));
      scene.add(points);
      function size() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
      }
      size();
      window.addEventListener('resize', size);
      canvas.classList.add('is-live');
      function frame(now) {
        if (document.body.classList.contains('is-leaving')) return;
        points.rotation.y = now * 0.00004;
        renderer.render(scene, camera);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }).catch(function () {});
  }

  function ifImage(file, ok) {
    var img = new Image();
    img.onload = function () { ok(img); };
    img.src = brand + file;
  }

  function brandImages() {
    ifImage('icon.png', function () {
      var icon = document.getElementById('favicon');
      if (icon) icon.href = brand + 'icon.png';
    });
    ifImage('og.png', function () {
      var absolute = new URL(brand + 'og.png', location.href).href;
      [['property', 'og:image'], ['name', 'twitter:image']].forEach(function (pair) {
        var tag = document.querySelector('meta[' + pair[0] + '="' + pair[1] + '"]');
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute(pair[0], pair[1]);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', absolute);
      });
    });
    var gallery = document.getElementById('gallery');
    var section = document.getElementById('loading-screens');
    if (!gallery || !section) return;
    [['keyart.png', 'Key art'], ['load-1.png', 'Loading screen 1'], ['load-2.png', 'Loading screen 2'], ['load-3.png', 'Loading screen 3']].forEach(function (shot) {
      ifImage(shot[0], function (img) {
        var figure = document.createElement('figure');
        img.alt = shot[1];
        var caption = document.createElement('figcaption');
        caption.textContent = shot[1];
        figure.append(img, caption);
        gallery.appendChild(figure);
        section.hidden = false;
      });
    });
  }
})();
