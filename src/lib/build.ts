import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));

export const version: string = pkg.version;

export const commitHash: string =
  process.env.GITHUB_SHA?.slice(0, 7) ||
  execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

export const describeRef: string = (() => {
  try {
    return execSync('git describe --tags', { encoding: 'utf-8' }).trim();
  } catch {
    return `v${version}`;
  }
})();
