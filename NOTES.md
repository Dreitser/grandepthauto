# Notes

Working log for Grand Depth Auto. When the code has to diverge from the brief, the reason goes here.

## License audit (2026-10-30)

Tree at audit time, before this change. The GitHub initial commit contained only:

| Path | What it is |
| --- | --- |
| `.gitattributes` | GitHub default. One line: auto-detect text and LF normalization. No license header. |
| `.gitignore` | GitHub Node.gitignore template. No license header. No "All rights reserved". |
| `README.md` | Title only: `# grandepthauto`. No license field and no proprietary text. |
| `.git/` | Repository metadata, not shipped as source. One commit, "Initial commit", author Lex Dreitser. Remote `https://github.com/Dreitser/grandepthauto.git`. |

Findings:

- No root `LICENSE` was present.
- No `package.json` anywhere, so there was no `"license"` field to update. Later package files will set `"license": "MIT"`.
- No "All rights reserved", proprietary, or conflicting license text in files authored for this repo.
- No third-party source was in the tree. Nothing had been copied from Slop New York yet.

Upstream checks, read from the published repos rather than memory:

- Slop New York (`mrdoob/slop-newyork`) is MIT, copyright line `Copyright (c) 2026 Mr.doob`. README data credits: NYC Open Data (building footprints and heights, tree locations), MTA subway entrances, OpenStreetMap contributors (ODbL). The verbatim `LICENSE` is copied to `web/LICENSE`. It does not collide with the root `LICENSE`, so it is not renamed. The city source itself is copied in the structure milestone, and `web/README.md` will keep those data credits.
- three.js is MIT, `Copyright (c) 2010-2026 three.js authors`. Slop New York's `index.html` loads it from jsDelivr, pinned to commit `b3396270682287470d161658ac01084d25e8dba6` on `dev` (`three.webgpu.js`, `three.tsl.js`, and `examples/jsm/`). Not copied into this repo.
- ComfyUI `LICENSE` is the GNU GPL version 3. We will only call its HTTP and WebSocket API as a separate process.
- ComfyStream (`livepeer/comfystream`) is MIT, `Copyright (c) 2024 Yondon Fu`, https://github.com/livepeer/comfystream. Not used yet, so it is not listed in `THIRD_PARTY_NOTICES.md`. Add it if live mode actually calls it.
- LTX-2 weights use the LTX-2 Community License: https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2. Model page: https://huggingface.co/Lightricks/LTX-2. Depth IC-LoRA: https://huggingface.co/Lightricks/LTX-2-19b-IC-LoRA-Depth-Control. Weights are not in this repo.
- Fonts, from Google Fonts metadata: Big Shoulders Display OFL 1.1, Chivo OFL 1.1, Chivo Mono OFL 1.1, Yellowtail Apache 2.0. Yellowtail's upstream copyright line includes "All rights reserved" and then grants Apache 2.0. That line belongs to the font author. We do not copy the font files.

`.gitignore` now also ignores `.tools/`, `outputs/`, `*.safetensors`, `*.ckpt`, `*.gguf`, and `outputs/**/*.mp4`. `node_modules/` and `.env` were already ignored.

## City systems (from the Slop New York fork)

Read from `web/city` after the fork landed.

- Renderer: `WebGPURenderer` in `js/main.js`, reversed 32-bit depth, pixel ratio 1. A TSL `RenderPipeline` runs a multisampled scene pass (color, normal, metal/rough), half-res SSR, then bloom and filmic grade from `js/post-processing.js`. The camera in `js/cameras.js` is a perspective camera, near 0.35, far 60000, so the harbor can reach the fogged horizon.
- Cameras: `CameraSystem` plus `CAMERA_PRESETS`. Follow rigs are chase, low-angle action, and cockpit POV. Scenic rigs are fixed Manhattan views (5th Ave, Times Square, Chrysler, Central Park, Bryant Park, the East River, an auto-director aerial, the Empire State deck). Keys 5-0 and V step through them.
- Modes: `ThirdPersonControllerManager` in `js/controllers.js`. `person`, `car` (player taxi), `cyclist`, `helicopter`. Default mode is `car`. Keys were 1 walk, 2 drive, 3 cycle, 4 fly. The active entity is shown, the others stay in the world. Helicopter ascend is Space or E. Person jump is Space, and E is also bound to jump.
- Traffic: `createTrafficSystem` in `js/traffic.js` keeps about 200 instanced cars and 12 buses on the road graph (signals, lane changes, an intelligent-driver model). They are not separate Object3D cars. `nearestStreetCar` finds a placed car. `held` freezes one so a carjack can take its transform. Highway traffic is a second, simpler system.

## Adaptations

- The landing `index.html` described in the brief was not in the workspace. `web/landing/index.html` was written from the brief: the pitch lines, the hero and Run calls to action, Two cuts, and the loading-screens gallery. Swap in the provided file if it shows up.
- `IMAGE_PROMPTS.md` was also missing. It lists the brand filenames the site looks for. It does not invent ChatGPT prompt text.
- Key 1 already selects Walk, and the HUD shows that binding. Depth view uses key 1 instead. Walk stays on the Walk button. Drive, Cycle, and Fly stay on 2, 3, and 4. Logged because the city and the brief disagree.
- E is already jump (person) and ascend (helicopter). Carjack listens for E only in person mode, and a scripted tween holds the person still so the jump does not fight the walk to the door.
- The official LTX-2 depth workflow was not exported into this repo. `workflows/hero_ltx2_depth.json` is a placeholder. The bridge refuses to queue it and points at `workflows/README.md`. Recorder size is 768x512, 24 fps, frame count `8n+1` (241 frames for 10 seconds). That matches the spatial multiple of 32 and the frame rule used by LTX-2. Confirm the numbers against the exported workflow before a hero render.
- Depth preview uses a 90 m far clip. The camera far plane is 60 km, so a raw buffer would be almost flat across a block. Near is white, far is black.
- ComfyUI upload of the depth WebM uses `POST /upload/image` with form field `image`, which is the upload route in the ComfyUI server docs. There is no separate video upload route in that table. `LoadVideo` then reads the file from the input folder.
- ComfyStream was checked (MIT, Copyright (c) 2024 Yondon Fu) and is not called. Key L shows a note that live mode is experimental and unwired. It is not listed in `THIRD_PARTY_NOTICES.md`.
- `gh` is installed locally under `.tools` but `gh auth status` says not logged in. Git push to origin works. Visibility was not changed. The repo is treated as public. Do not change visibility from here.
- The cinematic open is `web/landing/index.html`. First paint is the letterbox and the GRAND DEPTH Auto wordmark, with system-font fallbacks. Google Fonts are switched on after the first frame, not in the blocking head. The rest of the page fades in from `web/landing/open.js`, which is injected after two animation frames. A small three.js point field (core `three.module.js`, same pinned commit, WebGL not WebGPU) fades in behind the mark and is skipped when the user prefers reduced motion. If that import fails, the open still stands. Sound is a two-oscillator Web Audio pad started only from the Sound button. No audio file is in the repo.
- The city is not embedded in the landing page. Slop New York's import map and module graph stay on `/city/`. Launch fades a black curtain, then navigates to `/city/`. The city loading overlay is unchanged and still waits for the first frame there. The open does not wait on shader compile, geodata, or ComfyUI.
- `vercel.json` is static rewrites only: `/` to the landing file, `/city` and `/brand` to those folders. No build, no bridge.
- Initial document size: `web/landing/index.html` is 7256 bytes (HTML plus critical CSS, including the tiny frame script). That is the first document. Font files and `open.js` (5695 bytes, loaded after first paint) are not in that count. The 64KB target is met.
