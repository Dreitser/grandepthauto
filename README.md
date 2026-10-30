# GRAND DEPTH Auto

Drive the previs. Render the movie. Grand Depth Auto is an open-weights cinematic engine for Comfy's Open Source Higgsfield challenge, October 2026. You drive a WebGPU Manhattan, built on Slop New York, record color and depth, and send that take to ComfyUI and LTX-2.

Drop `web/brand/banner.png` in place and it belongs here as the wordmark. Until that file exists, the title above is the mark.

Demo: add `docs/demo.gif` (or a short video under `docs/`) when you have a captured take.

## How it works

1. Drive. Open the city and move on foot, by taxi, by bike, or by helicopter.
2. Steal. In walk mode, stand next to a traffic car and press E. The car stops, you walk to the driver door, and you take over a taxi at that spot. F gets you back out.
3. Record. Press R. The take is 10 seconds by default (change the Take field, or open the city with `?seconds=8`). Color and depth are captured at 768x512, 24 fps, with a frame count of 8n+1 so it matches LTX-2. A `timeline.json` keeps fps, duration, and events such as `carjack` and `exit_car`.
4. Render. Pick Realistic, Psychedelic, or Custom, add a prompt, and press Render. The bridge builds a timed prompt, uploads the depth video to ComfyUI, and queues `workflows/hero_ltx2_depth.json`. When the movie is back, a fullscreen player can show the previs beside the render.

## Architecture

```
browser (WebGPU)
  web/landing          title page
  web/city             Slop New York fork
                       depth view, recorder, carjack
        |
        |  POST /render  (depth webm, timeline, preset, prompt)
        v
bridge/server.js       timed prompt, Comfy HTTP only
        |
        |  POST /upload/image
        |  POST /prompt
        |  GET  /history/:id
        v
ComfyUI (separate process, GPL-3.0)
  workflows/hero_ltx2_depth.json
  LTX-2 weights, downloaded by you, not in this repo
```

## Requirements

- A current Chrome or Edge with WebGPU
- Node.js 20 or newer, for the static server and the bridge
- ComfyUI running as its own process
- The LTX-2 depth workflow exported to API format, plus the LTX-2 weights and the depth IC-LoRA, downloaded through ComfyUI
- About 16 GB VRAM for 720p, or 12 GB for 540p. Comfy Cloud works too if you set `COMFY_URL`

## Setup on a fresh machine

1. Clone the repo and enter it.
   ```
   git clone https://github.com/Dreitser/grandepthauto.git
   cd grandepthauto
   ```
2. Start the site.
   ```
   node serve.mjs
   ```
   Open http://127.0.0.1:4173 . The landing page is the root. Launch the city from there.
3. Install and start ComfyUI. In ComfyUI Manager, install LTXVideo if the LTX-2 nodes are not already built in. Let ComfyUI download the LTX-2 checkpoint and the depth IC-LoRA. Do not copy those weights into this repo.
   - Model page: https://huggingface.co/Lightricks/LTX-2
   - Depth LoRA: https://huggingface.co/Lightricks/LTX-2-19b-IC-LoRA-Depth-Control
4. Export the depth workflow in API format and replace `workflows/hero_ltx2_depth.json`. The steps are in `workflows/README.md`. Until you do that, the city and the recorder still run, and Render returns a clear error instead of a movie.
5. Start the bridge in a second terminal. It has no npm dependencies.
   ```
   copy bridge\.env.example bridge\.env
   node bridge/server.js
   ```
   `COMFY_URL` defaults to http://127.0.0.1:8188. For Comfy Cloud, set `COMFY_URL` and `COMFY_API_KEY`. The key is sent as `Authorization: Bearer`.

## Controls

| Key | Action |
| --- | --- |
| Walk button, 2, 3, 4 | Walk, drive, cycle, fly |
| W A S D | Move or steer |
| Space | Jump, or climb in the helicopter |
| 1 | Color, depth, split |
| E | Carjack a nearby traffic car while walking |
| F | Get out of the car |
| R | Record a take |
| L | Live mode (experimental, not wired) |
| V, 5 through 0 | Cameras |
| H | Hide or show the HUD |
| N | Mute |
| M | Map |
| B | Horn |

The Take field on the top of the city sets the next recording length in seconds.

## Presets

- Realistic. Photoreal streets, natural light, the previs camera move.
- Psychedelic. Neon and liquid color, same streets and camera.
- Custom. Your prompt only, plus the timed beats from the take.

The bridge writes the beats (`carjack`, `exit_car`) under the preset text.

## Live mode

Experimental. Key L does not start a stream. ComfyStream was not integrated. The cap for that work was 60 minutes, and it lost to the recorder and the hero render.

## Credits

- Slop New York by mrdoob, MIT. City code, cameras, traffic, and the Manhattan data build.
- three.js, MIT, loaded from jsDelivr. Not vendored.
- Map data: NYC Open Data (building footprints and heights, tree locations), MTA subway entrances, OpenStreetMap contributors (ODbL).
- ComfyUI, GPL-3.0, used only as a separate process over HTTP and WebSocket.
- LTX-2 by Lightricks. Weights stay under the LTX-2 Community License and are not in this repo.
- Fonts on the landing page: Big Shoulders Display, Chivo, and Chivo Mono (SIL Open Font License 1.1), Yellowtail (Apache 2.0).

## License

MIT. See `LICENSE`. Third-party licenses and data credits are in `THIRD_PARTY_NOTICES.md`.
