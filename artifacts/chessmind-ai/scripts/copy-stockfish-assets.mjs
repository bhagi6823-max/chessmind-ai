import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let packageRoot;
try {
  packageRoot = path.dirname(require.resolve('stockfish/package.json'));
} catch {
  packageRoot = path.dirname(require.resolve('stockfish'));
  if (path.basename(packageRoot) === 'src') {
    packageRoot = path.dirname(packageRoot);
  }
}
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceEngineDir = path.join(packageRoot, 'bin');
const publicEngineDir = path.join(projectRoot, 'public', 'engine');

await mkdir(publicEngineDir, { recursive: true });
for (const file of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
  await copyFile(path.join(sourceEngineDir, file), path.join(publicEngineDir, file));
}
await copyFile(path.join(packageRoot, 'Copying.txt'), path.join(publicEngineDir, 'Stockfish-COPYING.txt'));
await writeFile(
  path.join(publicEngineDir, 'Stockfish-SOURCE.txt'),
  'Stockfish.js 19.0.1, lite single-threaded WebAssembly build.\n' +
    'Source: https://github.com/nmrugg/stockfish.js/tree/v19.0.1\n' +
    'Stockfish engine: https://github.com/official-stockfish/Stockfish\n' +
    'License: GPL-3.0-or-later; see Stockfish-COPYING.txt.\n',
);

console.info('Prepared local Stockfish 19 lite single-threaded worker assets.');
