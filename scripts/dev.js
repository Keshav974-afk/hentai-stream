import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

fs.copyFileSync(path.join(rootDir, 'index.source.html'), path.join(rootDir, 'index.html'));

const isWindows = process.platform === 'win32';
const viteCmd = isWindows ? 'npx.cmd' : 'npx';
const child = spawn(viteCmd, ['vite'], { stdio: 'inherit', cwd: rootDir });

child.on('exit', (code) => {
  process.exit(code || 0);
});
