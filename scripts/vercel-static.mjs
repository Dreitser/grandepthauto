// Copies the static site into dist for Vercel. The cinematic open becomes /.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(root, 'web'), dist, { recursive: true });
fs.copyFileSync(path.join(dist, 'landing', 'index.html'), path.join(dist, 'index.html'));
