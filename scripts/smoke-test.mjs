/**
 * Dependency-free smoke test: syntax-checks every JS module in js/ with
 * `node --check`. Catches typos, unbalanced braces, and other parse errors
 * before they reach the browser. Does not resolve imports (so it needs no
 * `three` install), only validates syntax.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const jsDir = join(root, 'js');

function collectJsFiles(dir) {
    const files = [];
    for (const name of readdirSync(dir)) {
        const fullPath = join(dir, name);
        if (statSync(fullPath).isDirectory()) {
            files.push(...collectJsFiles(fullPath));
        } else if (extname(fullPath) === '.js') {
            files.push(fullPath);
        }
    }
    return files;
}

const files = collectJsFiles(jsDir);
let failed = 0;

for (const file of files) {
    const label = relative(root, file);
    try {
        execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
        console.log(`ok    ${label}`);
    } catch (error) {
        failed++;
        console.error(`FAIL  ${label}`);
        console.error((error.stderr && error.stderr.toString()) || error.message);
    }
}

console.log(`\n${files.length - failed}/${files.length} module(s) passed the syntax check`);
process.exit(failed ? 1 : 0);
