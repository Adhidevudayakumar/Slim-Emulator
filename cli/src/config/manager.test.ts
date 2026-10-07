import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { initializeConfig, loadProfile, resetProfile, saveProfile } from './manager.js';
import { defaultProfile } from './schema.js';

test('initialize is repeatable and profile reset preserves unrelated data', async () => {
  const configDir = await mkdtemp(path.join(os.tmpdir(), 'slim-em-test-'));
  try {
    await initializeConfig(configDir);
    await initializeConfig(configDir);
    const customized = defaultProfile('sample');
    customized.memory.ramMB = 2048;
    await saveProfile(customized, configDir);
    const markerPath = path.join(configDir, 'benchmarks', 'keep.json');
    await mkdir(path.dirname(markerPath), { recursive: true });
    await writeFile(markerPath, '{}');

    const reset = await resetProfile('sample', configDir);
    assert.equal(reset.memory.ramMB, 1536);
    assert.equal((await loadProfile('sample', configDir)).memory.ramMB, 1536);
    assert.equal(await readFile(markerPath, 'utf8'), '{}');
  } finally {
    await rm(configDir, { recursive: true, force: true });
  }
});