import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { detectAndroidSdk } from './sdk.js';

test('SDK detection resolves tools from SDK layout and explicit root', async () => {
  const sdkRoot = await mkdtemp(path.join(os.tmpdir(), 'slim-sdk-test-'));
  try {
    const tools = [
      'platform-tools/adb',
      'emulator/emulator',
      'cmdline-tools/latest/bin/avdmanager',
      'cmdline-tools/latest/bin/sdkmanager',
    ];
    for (const relativePath of tools) {
      const executable = path.join(sdkRoot, relativePath);
      await mkdir(path.dirname(executable), { recursive: true });
      await writeFile(executable, '#!/bin/sh\nexit 0\n');
      await chmod(executable, 0o755);
    }
    const sdk = await detectAndroidSdk({ sdkRoot, env: {}, platform: 'linux', homeDir: sdkRoot });
    assert.equal(sdk.sdkRoot, sdkRoot);
    assert.equal(sdk.avdManagerPath, path.join(sdkRoot, 'cmdline-tools/latest/bin/avdmanager'));
  } finally {
    await rm(sdkRoot, { recursive: true, force: true });
  }
});