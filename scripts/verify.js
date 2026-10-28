const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const result = spawnSync(process.execPath, ['--test', '--test-reporter=spec', 'test/api.test.js'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
});
const output = (result.stdout || '') + (result.stderr || '');
const folder = path.join(root, 'evidence');
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(path.join(folder, 'server-and-tests.log'), output);
process.stdout.write(output);
if (result.error) process.stderr.write(String(result.error));
process.exitCode = result.status ?? 1;
