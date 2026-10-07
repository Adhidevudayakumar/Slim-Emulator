import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultProfile, profileSchema } from './schema.js';

test('default profile is valid and versioned', () => {
  const profile = defaultProfile('slim-dev');
  assert.equal(profile.version, 1);
  assert.equal(profile.systemImage.package, 'system-images;android-35;default;x86_64');
  assert.equal(profile.memory.ramMB, 1536);
});

test('profile validation rejects unsafe memory values and invalid names', () => {
  const profile = defaultProfile('slim-dev');
  assert.equal(profileSchema.safeParse({ ...profile, name: '../other' }).success, false);
  assert.equal(profileSchema.safeParse({ ...profile, memory: { ramMB: 128 } }).success, false);
});

test('local image profiles require an image location', () => {
  const profile = defaultProfile('local-test');
  assert.equal(profileSchema.safeParse({
    ...profile,
    systemImage: { source: 'local', apiLevel: 35, architecture: 'x86_64' },
  }).success, false);
});