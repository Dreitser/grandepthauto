// Talks to a separate ComfyUI process over HTTP. ComfyUI stays GPL-3.0.
// This server only uploads a depth video, queues an API-format workflow, and
// reports status. Routes used here are the ones documented at
// https://docs.comfy.org/development/comfyui-server/comms_routes

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'outputs');
const workflowPath = path.join(root, 'workflows', 'hero_ltx2_depth.json');
const presetsPath = path.join(root, 'workflows', 'presets.json');

function loadEnv() {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const comfyUrl = (process.env.COMFY_URL || 'http://127.0.0.1:8188').replace(/\/$/, '');
const apiKey = (process.env.COMFY_API_KEY || '').trim();
const port = Number(process.env.PORT) || 8787;
const jobs = new Map();

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(payload);
}

function readForm(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
      try {
        resolve(parseMultipart(Buffer.concat(chunks), req.headers['content-type'] || ''));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function parseMultipart(body, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!match) throw new Error('Expected multipart form data');
  const boundary = Buffer.from(`--${(match[1] || match[2]).trim()}`);
  const fields = {};
  const files = {};
  let cursor = body.indexOf(boundary);
  while (cursor !== -1) {
    cursor += boundary.length;
    if (body[cursor] === 45 && body[cursor + 1] === 45) break;
    if (body[cursor] === 13 && body[cursor + 1] === 10) cursor += 2;
    else if (body[cursor] === 10) cursor += 1;
    const next = body.indexOf(boundary, cursor);
    if (next === -1) break;
    let part = body.subarray(cursor, next);
    if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) part = part.subarray(0, -2);
    const sep = part.indexOf('\r\n\r\n');
    if (sep === -1) {
      cursor = next;
      continue;
    }
    const headerText = part.subarray(0, sep).toString('utf8');
    const data = part.subarray(sep + 4);
    const name = /name="([^"]*)"/.exec(headerText)?.[1] || '';
    const filename = /filename="([^"]*)"/.exec(headerText)?.[1];
    if (filename !== undefined) files[name] = { buffer: Buffer.from(data), filename: filename || 'depth.webm' };
    else if (name) fields[name] = data.toString('utf8');
    cursor = next;
  }
  return { fields, files };
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

async function comfy(pathname, options = {}) {
  const response = await fetch(new URL(pathname, comfyUrl), {
    ...options,
    headers: authHeaders(options.headers)
  });
  return response;
}

function timedPrompt(presetId, custom, timeline) {
  const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
  const preset = presets[presetId] || presets.custom;
  const lines = [];
  if (preset?.prompt) lines.push(preset.prompt);
  if (custom && custom.trim()) lines.push(custom.trim());
  const fps = timeline.fps || 24;
  const duration = Number(timeline.duration) || 0;
  const width = timeline.width || 768;
  const height = timeline.height || 512;
  lines.push(`Previs timing, ${fps} fps, ${duration.toFixed(2)} seconds, ${width}x${height}.`);
  const events = Array.isArray(timeline.events) ? timeline.events : [];
  if (events.length) {
    lines.push('Beats:');
    for (const event of events) {
      const t = Number(event.t);
      lines.push(`${Number.isFinite(t) ? t.toFixed(2) : '0.00'}s ${event.type || 'event'}`);
    }
  } else {
    lines.push('The camera move follows the previs.');
  }
  return lines.join('\n');
}

function applyWorkflow(workflow, { filename, prompt, width, height, frames }) {
  let videos = 0;
  let texts = 0;
  for (const node of Object.values(workflow)) {
    if (!node || typeof node !== 'object' || !node.class_type || !node.inputs) continue;
    const title = node._meta?.title || '';
    if (/LoadVideo/i.test(node.class_type)) {
      for (const key of ['file', 'video', 'filename']) {
        if (typeof node.inputs[key] === 'string') {
          node.inputs[key] = filename;
          videos += 1;
        }
      }
    }
    if (/TextEncode/i.test(node.class_type) && !/neg/i.test(title)) {
      if (typeof node.inputs.text === 'string') {
        node.inputs.text = prompt;
        texts += 1;
      } else if (typeof node.inputs.prompt === 'string') {
        node.inputs.prompt = prompt;
        texts += 1;
      }
    }
    const inputs = node.inputs;
    if (typeof inputs.width === 'number' && typeof inputs.height === 'number' && typeof inputs.length === 'number') {
      inputs.width = width;
      inputs.height = height;
      inputs.length = frames;
    }
  }
  return { videos, texts };
}

function findMedia(outputs) {
  const found = [];
  for (const node of Object.values(outputs || {})) {
    for (const key of ['videos', 'gifs', 'images']) {
      const list = node?.[key];
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (item?.filename) found.push(item);
      }
    }
  }
  const video = found.find((item) => /\.(mp4|webm|mov|mkv|gif)$/i.test(item.filename));
  return video || found[0] || null;
}

async function uploadDepth(buffer, filename) {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: 'video/webm' }), filename);
  form.append('type', 'input');
  form.append('overwrite', 'true');
  const response = await comfy('/upload/image', { method: 'POST', body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `ComfyUI upload failed (${response.status})`);
  }
  if (!payload.name) throw new Error('ComfyUI upload did not return a filename.');
  return payload.name;
}

async function runJob(job) {
  job.status = 'running';
  job.progress = 0.1;
  try {
    const raw = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    if (raw._placeholder || !Object.values(raw).some((node) => node && node.class_type)) {
      throw new Error('workflows/hero_ltx2_depth.json is still a placeholder. Export the LTX-2 depth workflow in ComfyUI API format. See workflows/README.md.');
    }
    const uploaded = await uploadDepth(job.depth, `grand-depth-${job.id}.webm`);
    job.progress = 0.25;
    const promptText = timedPrompt(job.preset, job.prompt, job.timeline);
    const workflow = structuredClone(raw);
    const applied = applyWorkflow(workflow, {
      filename: uploaded,
      prompt: promptText,
      width: job.timeline.width || 768,
      height: job.timeline.height || 512,
      frames: job.timeline.frames || 241
    });
    if (!applied.videos) {
      throw new Error('The workflow has no LoadVideo node with a file, video, or filename input. Export the API format and check workflows/README.md.');
    }
    const clientId = crypto.randomUUID();
    const queued = await comfy('/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: clientId })
    });
    const queuedBody = await queued.json().catch(() => ({}));
    if (!queued.ok || !queuedBody.prompt_id) {
      const detail = queuedBody.error?.message || queuedBody.error || queuedBody.node_errors || `ComfyUI queue failed (${queued.status})`;
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
    job.promptId = queuedBody.prompt_id;
    job.progress = 0.4;
    const media = await waitForMedia(job);
    job.progress = 0.9;
    const view = new URL('/view', comfyUrl);
    view.searchParams.set('filename', media.filename);
    view.searchParams.set('subfolder', media.subfolder || '');
    view.searchParams.set('type', media.type || 'output');
    const fileResponse = await comfy(view.pathname + view.search);
    if (!fileResponse.ok) throw new Error(`ComfyUI view failed (${fileResponse.status})`);
    fs.mkdirSync(outputDir, { recursive: true });
    const ext = path.extname(media.filename) || '.mp4';
    const saved = path.join(outputDir, `${job.id}${ext}`);
    fs.writeFileSync(saved, Buffer.from(await fileResponse.arrayBuffer()));
    job.file = saved;
    job.outputUrl = `/render/${job.id}/file`;
    job.status = 'done';
    job.progress = 1;
  } catch (error) {
    job.status = 'error';
    job.error = error.message;
    console.error(`[render ${job.id}]`, error.message);
  }
}

async function waitForMedia(job) {
  const started = Date.now();
  while (Date.now() - started < 60 * 60 * 1000) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await comfy(`/history/${job.promptId}`);
    if (!response.ok) continue;
    const history = await response.json().catch(() => ({}));
    const entry = history[job.promptId];
    if (!entry) {
      job.progress = Math.min(0.8, job.progress + 0.02);
      continue;
    }
    const status = entry.status?.status_str;
    if (status === 'error') {
      throw new Error(entry.status?.messages?.flat?.().join(' ') || 'ComfyUI reported an error.');
    }
    const media = findMedia(entry.outputs);
    if (media) return media;
    if (entry.status?.completed) {
      throw new Error('ComfyUI finished without a video output. Check the SaveVideo node in the exported workflow.');
    }
  }
  throw new Error('Timed out waiting for ComfyUI.');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    send(res, 200, { ok: true, comfyUrl });
    return;
  }

  const fileMatch = url.pathname.match(/^\/render\/([^/]+)\/file$/);
  if (req.method === 'GET' && fileMatch) {
    const job = jobs.get(fileMatch[1]);
    if (!job?.file || !fs.existsSync(job.file)) {
      send(res, 404, { error: 'No output yet' });
      return;
    }
    const ext = path.extname(job.file).toLowerCase();
    const type = ext === '.webm' ? 'video/webm' : ext === '.gif' ? 'image/gif' : 'video/mp4';
    res.writeHead(200, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(job.file).pipe(res);
    return;
  }

  const statusMatch = url.pathname.match(/^\/render\/([^/]+)$/);
  if (req.method === 'GET' && statusMatch) {
    const job = jobs.get(statusMatch[1]);
    if (!job) {
      send(res, 404, { error: 'Unknown job' });
      return;
    }
    send(res, 200, {
      id: job.id,
      status: job.status,
      progress: job.progress,
      outputUrl: job.outputUrl || '',
      error: job.error || ''
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/render') {
    try {
      const form = await readForm(req);
      if (!form.files.depth) {
        send(res, 400, { error: 'Missing depth video' });
        return;
      }
      let timeline = {};
      try { timeline = JSON.parse(form.fields.timeline || '{}'); } catch { timeline = {}; }
      const id = crypto.randomUUID();
      const job = {
        id,
        status: 'queued',
        progress: 0,
        preset: form.fields.preset || 'realistic',
        prompt: form.fields.prompt || '',
        timeline,
        depth: form.files.depth.buffer,
        outputUrl: '',
        error: ''
      };
      jobs.set(id, job);
      send(res, 202, { id });
      runJob(job);
    } catch (error) {
      send(res, 400, { error: error.message });
    }
    return;
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(port, () => {
  console.log(`Grand Depth Auto bridge http://127.0.0.1:${port} -> ${comfyUrl}`);
});
