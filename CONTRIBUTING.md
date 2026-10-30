# Contributing

Thanks for helping with Grand Depth Auto.

## How to run

You need a current Chrome or Edge with WebGPU.

1. Clone the repository.
2. Serve the `web` folder with any static file server. With Node.js installed, from the repository root: `npx serve web`
3. Open the URL it prints. The landing page is the site root. "Launch the city" opens the Manhattan scene.
4. Rendering is optional. Copy `bridge/.env.example` to `bridge/.env`, then from the repository root run `node bridge/server.js`. ComfyUI should already be running. `COMFY_URL` defaults to `http://127.0.0.1:8188`.

Setup details and model requirements are in the root README.

## How to submit a pull request

1. Fork https://github.com/Dreitser/grandepthauto and clone your fork.
2. Branch from `main`.
3. Make the change. Do not commit secrets, `.env` files, model weights, or files larger than 10MB.
4. Open a pull request against `main`. Say what changed and how you checked it.
5. By submitting a pull request you agree to license your contribution under the MIT License in the root `LICENSE`.

Please follow `CODE_OF_CONDUCT.md`.
