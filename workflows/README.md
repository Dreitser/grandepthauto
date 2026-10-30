# Workflows

`hero_ltx2_depth.json` must be a ComfyUI **API format** prompt, the dict of node id to `{ class_type, inputs }`. The file in the repo is a placeholder until that export exists.

`presets.json` holds the Realistic, Psychedelic, and Custom prompt prefixes. The bridge appends the take's timed beats.

## Export the depth workflow

The recorder writes 768x512 WebM at 24 fps. The frame count is `8n+1` (241 frames for a 10 second take). Those are the sizes the bridge writes into numeric `width`, `height`, and `length` inputs when it finds them.

1. Install ComfyUI and the LTX-2 nodes (ComfyUI Manager, search LTXVideo, or use a current ComfyUI build that already includes LTX-2).
2. Download the LTX-2 weights and the depth IC-LoRA through ComfyUI. Do not commit the weights. Model page: https://huggingface.co/Lightricks/LTX-2. Depth LoRA: https://huggingface.co/Lightricks/LTX-2-19b-IC-LoRA-Depth-Control.
3. Open the depth control example. In ComfyUI-LTXVideo that is `example_workflows/2.3/LTX-2.3_ICLoRA_Union_Control_Distilled.json` (depth, pose, and edges). Set the control to depth.
4. Enable Dev mode in ComfyUI settings, then Save (API format).
5. Replace `workflows/hero_ltx2_depth.json` with that file.

The bridge then:

- uploads the depth WebM with `POST /upload/image` (ComfyUI's documented upload route; the form field is `image`)
- sets string `file`, `video`, or `filename` inputs on nodes whose `class_type` contains `LoadVideo`
- replaces `text` or `prompt` on text-encode nodes whose title does not contain "neg"
- writes `width`, `height`, and `length` when those three inputs are plain numbers on the same node

If your export uses different input names, say so in `NOTES.md` and adjust `bridge/server.js` to match the file you exported. Do not guess node ids.
