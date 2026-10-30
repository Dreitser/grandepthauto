# Third-party notices

Grand Depth Auto is MIT licensed. The pieces below stay under their own licenses. We do not redistribute model weights.

## Slop New York

- What: Manhattan viewer this project forks (person, car, bike, and helicopter cameras, traffic, city data).
- Author: mrdoob
- License: MIT. Copyright (c) 2026 Mr.doob. The verbatim license file is `web/LICENSE`.
- Link: https://github.com/mrdoob/slop-newyork

## three.js

- What: WebGPU renderer and TSL shading. The Slop New York page loads it from jsDelivr, pinned to commit `b3396270682287470d161658ac01084d25e8dba6` on the three.js `dev` branch. Not vendored in this repository.
- License: MIT. Copyright (c) 2010-2026 three.js authors.
- Link: https://github.com/mrdoob/three.js
- License text: https://github.com/mrdoob/three.js/blob/dev/LICENSE

## ComfyUI

- What: Separate local (or Comfy Cloud) process that runs the LTX-2 depth workflow. This repository only speaks to its HTTP and WebSocket API. We do not vendor ComfyUI, and we do not modify it. Because of that, Grand Depth Auto stays MIT. ComfyUI itself remains GPL-3.0.
- License: GPL-3.0
- Link: https://github.com/comfyanonymous/ComfyUI

## LTX-2

- What: Open-weights audio-video model used for the hero render, including the depth IC-LoRA. Users download weights through ComfyUI. This repository does not contain weights, checkpoints, or LoRAs.
- License: LTX-2 Community License (weights and derivatives).
- Model page: https://huggingface.co/Lightricks/LTX-2
- Depth control LoRA: https://huggingface.co/Lightricks/LTX-2-19b-IC-LoRA-Depth-Control
- License text: https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2

## Map data

Used by the Slop New York city build. Attributions kept from that project's README.

- NYC Open Data, building footprints and heights: https://data.cityofnewyork.us/City-Government/BUILDING/5zhs-2jue
- NYC Open Data, forestry tree points: https://data.cityofnewyork.us/Environment/Forestry-Tree-Points/hn5i-inap
- MTA subway entrances and exits: https://data.ny.gov/Transportation/MTA-Subway-Entrances-and-Exits-2024/i9wp-a4ja
- OpenStreetMap contributors, ODbL: https://www.openstreetmap.org/copyright

## Fonts

Loaded on the landing page from Google Fonts. Font files are not vendored.

- Big Shoulders Display. SIL Open Font License 1.1. Copyright 2019 The Big Shoulders Project Authors. https://fonts.google.com/specimen/Big+Shoulders+Display
- Chivo. SIL Open Font License 1.1. Copyright 2019 The Chivo Project Authors. https://fonts.google.com/specimen/Chivo
- Chivo Mono. SIL Open Font License 1.1. Copyright 2018 The Chivo Project Authors. https://fonts.google.com/specimen/Chivo+Mono
- Yellowtail. Apache License 2.0. Copyright (c) 2011 Brian J. Bonislawsky DBA Astigmatic (AOETI). https://fonts.google.com/specimen/Yellowtail
