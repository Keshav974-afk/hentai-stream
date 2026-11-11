import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Ensure source HTML is present at root for Vite
fs.copyFileSync(path.join(rootDir, 'index.source.html'), path.join(rootDir, 'index.html'));

// 2. Run TypeScript check and Vite build
console.log('⚡ Compiling TypeScript and bundling with Vite...');
execSync('npx tsc -b && npx vite build', { stdio: 'inherit', cwd: rootDir });

// 3. Copy dist/index.html to root index.html so static hosts serving root work out of the box
console.log('📦 Syncing production assets to root for static hosts...');
fs.copyFileSync(path.join(rootDir, 'dist', 'index.html'), path.join(rootDir, 'index.html'));

// 4. Copy dist/assets to root assets/
const rootAssets = path.join(rootDir, 'assets');
const distAssets = path.join(rootDir, 'dist', 'assets');
if (!fs.existsSync(rootAssets)) {
  fs.mkdirSync(rootAssets, { recursive: true });
}
fs.cpSync(distAssets, rootAssets, { recursive: true });

console.log('✅ Build complete! Both dist/ and root / are fully synced and production-ready.');
