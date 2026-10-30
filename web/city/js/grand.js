// Grand Depth Auto: depth view, take recorder, carjack, and the render panel.
// Depth shading itself lives in main.js, next to the existing render pipeline.

const RECORD_FPS = 24;
const RECORD_WIDTH = 768;
const RECORD_HEIGHT = 512;
const BRIDGE_URL = new URLSearchParams(location.search).get('bridge') || 'http://127.0.0.1:8787';
const DEPTH_MODES = ['Color', 'Depth', 'Split'];

function frameCountFor(seconds) {
  const raw = Math.max(1, Math.round(seconds * RECORD_FPS));
  const steps = Math.max(1, Math.round((raw - 1) / 8));
  return steps * 8 + 1;
}

function leftOf(heading, distance) {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  return { x: -fz * distance, z: fx * distance };
}

function setupGrand({
  depthViewMode,
  renderPipeline,
  renderer,
  cameraSystem,
  controllerManager,
  trafficSystem,
  selectMode
}) {
  const grand = {
    ready: false,
    depthMode: 0,
    recordSeconds: Number(new URLSearchParams(location.search).get('seconds')) || 10,
    sessionT: 0,
    events: [],
    recording: null,
    colorUrl: '',
    take: null
  };

  const hud = document.createElement('div');
  hud.id = 'gda-hud';
  hud.innerHTML = `
    <div id="gda-badge" class="gda-badge">Color</div>
    <label class="gda-seconds">Take
      <input id="gda-seconds" type="number" min="1" max="30" step="1" value="${grand.recordSeconds}">
      s
    </label>
    <span id="gda-rec" class="gda-rec" hidden>REC</span>
    <p id="gda-note" class="gda-note" hidden></p>
  `;
  document.body.appendChild(hud);
  const badge = hud.querySelector('#gda-badge');
  const secondsInput = hud.querySelector('#gda-seconds');
  const recEl = hud.querySelector('#gda-rec');
  const noteEl = hud.querySelector('#gda-note');

  const panel = document.createElement('section');
  panel.id = 'gda-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="gda-panel-card">
      <h2>Render the take</h2>
      <label>Preset
        <select id="gda-preset">
          <option value="realistic">Realistic</option>
          <option value="psychedelic">Psychedelic</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      <label>Prompt
        <textarea id="gda-prompt" rows="4" placeholder="Optional. The bridge adds the timed beats from this take."></textarea>
      </label>
      <div class="gda-panel-row">
        <button id="gda-render" type="button">Render</button>
        <button id="gda-close" type="button">Close</button>
      </div>
      <p id="gda-progress" class="gda-note"></p>
    </div>
  `;
  document.body.appendChild(panel);

  const player = document.createElement('div');
  player.id = 'gda-player';
  player.hidden = true;
  player.innerHTML = `
    <div class="gda-letterbox gda-letterbox-top"></div>
    <div class="gda-letterbox gda-letterbox-bottom"></div>
    <div id="gda-stage" class="gda-stage is-split">
      <video id="gda-previs" class="gda-previs" autoplay muted loop playsinline></video>
      <video id="gda-render-video" class="gda-render-video" autoplay muted loop playsinline></video>
    </div>
    <div class="gda-player-bar">
      <button id="gda-toggle" type="button">Side by side</button>
      <button id="gda-player-close" type="button">Close</button>
    </div>
  `;
  document.body.appendChild(player);

  function note(text) {
    noteEl.hidden = !text;
    noteEl.textContent = text || '';
  }

  function logEvent(type) {
    const event = { t: grand.recording ? grand.sessionT - grand.recording.startT : grand.sessionT, type };
    grand.events.push({ ...event, sessionT: grand.sessionT });
    if (grand.recording) grand.recording.events.push(event);
    return event;
  }

  function cycleDepth() {
    grand.depthMode = (grand.depthMode + 1) % 3;
    depthViewMode.value = grand.depthMode;
    badge.textContent = DEPTH_MODES[grand.depthMode];
  }

  function beginCarjack() {
    if (controllerManager.scripted || controllerManager.activeMode !== 'person') return;
    const person = controllerManager.getActiveEntity();
    const hit = trafficSystem.nearestStreetCar(person.position.x, person.position.z, 8);
    if (!hit) {
      note('No traffic car close enough.');
      return;
    }
    const car = hit.car;
    car.held = true;
    const side = leftOf(car.yaw, (car.halfWidth || 0.9) + 0.55);
    const door = {
      x: car.x + side.x,
      z: car.z + side.z - Math.sin(car.yaw) * 0.35,
      y: controllerManager.getGroundHeight(car.x + side.x, car.z + side.z, 'person'),
      heading: Math.atan2(car.x - (car.x + side.x), car.z - (car.z + side.z))
    };
    const from = {
      x: person.position.x,
      y: person.position.y,
      z: person.position.z,
      heading: person.heading
    };
    logEvent('carjack');
    note('Carjack.');
    grand.jack = { car, from, door, age: 0 };
    controllerManager.scripted = { ...from };
  }

  function exitCar() {
    if (controllerManager.activeMode !== 'car' || controllerManager.scripted) return;
    const car = controllerManager.entities.car;
    const side = leftOf(car.heading, 1.6);
    const x = car.position.x + side.x;
    const z = car.position.z + side.z;
    selectMode('person');
    controllerManager.teleportActiveTo(x, z, car.heading);
    logEvent('exit_car');
    note('Out of the car.');
  }

  secondsInput.addEventListener('change', () => {
    const value = Number(secondsInput.value);
    if (Number.isFinite(value)) grand.recordSeconds = Math.min(30, Math.max(1, value));
    secondsInput.value = String(grand.recordSeconds);
  });

  window.addEventListener('keydown', (event) => {
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === 'KeyR') startRecording();
    else if (event.code === 'KeyE') beginCarjack();
    else if (event.code === 'KeyF') exitCar();
    else if (event.code === 'KeyL') note('Live mode is experimental and is not wired in this build.');
  });

  function captureCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = RECORD_WIDTH;
    canvas.height = RECORD_HEIGHT;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    });
    recorder.start();
    return {
      grab() {
        ctx.drawImage(renderer.domElement, 0, 0, RECORD_WIDTH, RECORD_HEIGHT);
        if (track.requestFrame) track.requestFrame();
      },
      async finish() {
        if (recorder.state !== 'inactive') recorder.stop();
        return stopped;
      }
    };
  }

  function startRecording() {
    if (!grand.ready || grand.recording) return;
    if (typeof MediaRecorder === 'undefined' || !renderer.domElement.captureStream) {
      note('This browser cannot record the canvas.');
      return;
    }
    const frames = frameCountFor(grand.recordSeconds);
    const camera = cameraSystem.camera;
    const saved = {
      aspect: camera.aspect,
      mode: grand.depthMode
    };
    renderer.setPixelRatio(1);
    renderer.setSize(RECORD_WIDTH, RECORD_HEIGHT, false);
    camera.aspect = RECORD_WIDTH / RECORD_HEIGHT;
    camera.updateProjectionMatrix();
    grand.recording = {
      frames,
      captured: 0,
      acc: 0,
      startT: grand.sessionT,
      events: [],
      saved,
      color: captureCanvas(),
      depth: captureCanvas()
    };
    recEl.hidden = false;
    note(`Recording ${frames} frames at ${RECORD_WIDTH}x${RECORD_HEIGHT}.`);
  }

  async function finishRecording() {
    const take = grand.recording;
    grand.recording = null;
    recEl.hidden = true;
    depthViewMode.value = take.saved.mode;
    grand.depthMode = take.saved.mode;
    badge.textContent = DEPTH_MODES[grand.depthMode];
    cameraSystem.camera.aspect = take.saved.aspect;
    cameraSystem.onResize(window.innerWidth, window.innerHeight);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    const [colorBlob, depthBlob] = await Promise.all([take.color.finish(), take.depth.finish()]);
    if (grand.colorUrl) URL.revokeObjectURL(grand.colorUrl);
    grand.colorUrl = URL.createObjectURL(colorBlob);
    const duration = take.frames / RECORD_FPS;
    grand.take = {
      colorBlob,
      depthBlob,
      timeline: {
        fps: RECORD_FPS,
        duration,
        width: RECORD_WIDTH,
        height: RECORD_HEIGHT,
        frames: take.frames,
        events: take.events.map((event) => ({ t: Number(event.t.toFixed(3)), type: event.type }))
      }
    };
    note(`Take ready, ${take.frames} frames.`);
    panel.hidden = false;
  }

  function renderPass(mode) {
    depthViewMode.value = mode;
    renderPipeline.render();
  }

  function onFrame(dt) {
    grand.sessionT += dt;
    if (grand.jack) {
      grand.jack.age += dt;
      const t = Math.min(1, grand.jack.age / 1.5);
      const k = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
      const a = grand.jack.from;
      const b = grand.jack.door;
      controllerManager.scripted = {
        x: a.x + (b.x - a.x) * k,
        y: a.y + (b.y - a.y) * k,
        z: a.z + (b.z - a.z) * k,
        heading: a.heading + (b.heading - a.heading) * k
      };
      if (t >= 1) {
        const car = grand.jack.car;
        grand.jack = null;
        controllerManager.scripted = null;
        selectMode('car');
        controllerManager.teleportActiveTo(car.x, car.z, car.yaw);
        note('You have the car.');
      }
    }

    const rec = grand.recording;
    if (!grand.ready || !rec) return;
    rec.acc += dt;
    const step = 1 / RECORD_FPS;
    if (rec.acc < step) return;
    rec.acc -= step;
    const keep = grand.depthMode;
    renderPass(0);
    rec.color.grab();
    renderPass(1);
    rec.depth.grab();
    depthViewMode.value = keep;
    renderPipeline.render();
    rec.captured += 1;
    if (rec.captured >= rec.frames) finishRecording();
  }

  panel.querySelector('#gda-close').addEventListener('click', () => {
    panel.hidden = true;
  });
  player.querySelector('#gda-player-close').addEventListener('click', () => {
    player.hidden = true;
    player.querySelector('#gda-previs').pause();
    player.querySelector('#gda-render-video').pause();
  });
  player.querySelector('#gda-toggle').addEventListener('click', () => {
    const stage = player.querySelector('#gda-stage');
    const split = stage.classList.toggle('is-split');
    player.querySelector('#gda-toggle').textContent = split ? 'Side by side' : 'Render only';
  });

  panel.querySelector('#gda-render').addEventListener('click', () => submitRender());

  async function submitRender() {
    if (!grand.take) return;
    const button = panel.querySelector('#gda-render');
    const progress = panel.querySelector('#gda-progress');
    button.disabled = true;
    progress.textContent = 'Uploading the take...';
    const body = new FormData();
    body.append('depth', grand.take.depthBlob, 'depth.webm');
    body.append('timeline', JSON.stringify(grand.take.timeline));
    body.append('preset', panel.querySelector('#gda-preset').value);
    body.append('prompt', panel.querySelector('#gda-prompt').value);
    try {
      const response = await fetch(`${BRIDGE_URL}/render`, { method: 'POST', body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Bridge returned ${response.status}`);
      progress.textContent = 'Queued.';
      await poll(payload.id, progress);
    } catch (error) {
      progress.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  async function poll(id, progress) {
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const response = await fetch(`${BRIDGE_URL}/render/${id}`);
      const job = await response.json();
      if (!response.ok) throw new Error(job.error || `Status ${response.status}`);
      if (job.status === 'error') throw new Error(job.error || 'Render failed');
      const pct = Math.round((job.progress || 0) * 100);
      progress.textContent = job.status === 'done' ? 'Done.' : `${job.status} ${pct}%`;
      if (job.status === 'done' && job.outputUrl) {
        openPlayer(`${BRIDGE_URL}${job.outputUrl}`);
        return;
      }
    }
  }

  function openPlayer(renderUrl) {
    const previs = player.querySelector('#gda-previs');
    const movie = player.querySelector('#gda-render-video');
    previs.src = grand.colorUrl;
    movie.src = renderUrl;
    player.hidden = false;
    panel.hidden = true;
  }

  return { cycleDepth, onFrame: onFrame, get ready() { return grand.ready; }, set ready(value) { grand.ready = value; } };
}

export { setupGrand, RECORD_FPS, RECORD_WIDTH, RECORD_HEIGHT, frameCountFor };
