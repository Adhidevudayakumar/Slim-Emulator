import assert from 'node:assert/strict';
import test from 'node:test';
import { getConfigDir } from './paths.js';

test('configuration directory follows platform conventions', () => {
  assert.equal(getConfigDir({ HOME: '/home/test' }, 'linux'), '/home/test/.config/slim-emulator');
  assert.equal(getConfigDir({ HOME: '/home/test', XDG_CONFIG_HOME: '/tmp/config' }, 'linux'), '/tmp/config/slim-emulator');
  assert.equal(getConfigDir({ HOME: '/Users/test' }, 'darwin'), '/Users/test/Library/Application Support/slim-emulator');
  assert.equal(getConfigDir({ USERPROFILE: 'C:\\Users\\test', APPDATA: 'C:\\Roaming' }, 'win32'), 'C:\\Roaming\\slim-emulator');
});