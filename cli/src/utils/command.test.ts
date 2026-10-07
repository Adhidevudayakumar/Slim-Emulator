import assert from 'node:assert/strict';
import test from 'node:test';
import { runCommand } from './command.js';

test('command runner passes arguments without shell interpretation', async () => {
  const value = 'space ; $(not-a-command)';
  const result = await runCommand(process.execPath, ['-e', 'process.stdout.write(process.argv[1])', value]);
  assert.equal(result.code, 0);
  assert.equal(result.stdout, value);
});