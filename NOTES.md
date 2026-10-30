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

## Adaptations

None yet.
