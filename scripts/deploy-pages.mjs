// Publishes client/dist/client/browser to the production branch (the
// GitHub Pages source) via a fully separate clone in the OS temp directory.
//
// Why not `angular-cli-ghpages` / `gh-pages`: this repo has client/ as a
// plain subfolder (no separate client/.git), and in practice that tool
// ended up checking out the production branch *in this repo* rather than
// staying confined to its own cache clone — a stray fetch/pull afterwards
// (e.g. an editor's auto-sync) then fast-forwarded that checkout and wiped
// client/src, server/, etc. from disk. Cloning to an unrelated temp
// directory every time makes that class of accident impossible: nothing
// here ever touches this repo's working tree or checked-out branch.
//
// Usage (from client/): npm run deploy

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, cpSync, writeFileSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const distDir = path.join(repoRoot, 'client', 'dist', 'client', 'browser');
const branch = 'production';

function git(args, cwd) {
  execFileSync('git', args, { cwd, stdio: 'inherit' });
}

function remoteUrl() {
  return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: repoRoot })
    .toString()
    .trim();
}

const tmp = mkdtempSync(path.join(tmpdir(), 'pages-deploy-'));

try {
  console.log(`Cloning ${branch} into isolated temp dir: ${tmp}`);
  git(['clone', '--branch', branch, '--single-branch', remoteUrl(), tmp], repoRoot);

  for (const entry of readdirSync(tmp)) {
    if (entry === '.git') continue;
    rmSync(path.join(tmp, entry), { recursive: true, force: true });
  }

  cpSync(distDir, tmp, { recursive: true });
  writeFileSync(path.join(tmp, '.nojekyll'), '');

  git(['add', '-A'], tmp);
  try {
    git(['commit', '-m', `Deploy ${new Date().toISOString()}`], tmp);
  } catch {
    console.log('Nothing changed since the last deploy.');
    process.exit(0);
  }
  git(['push', 'origin', branch], tmp);
  console.log(`Published to ${branch}.`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
