import { spawn } from 'node:child_process';
import { runCommand, runOrThrow } from '../utils/command.js';
import { CliError } from '../utils/errors.js';
import type { EmulatorProfile } from '../config/schema.js';
import type { AndroidSdk } from './sdk.js';
import { deviceForProfile, listDevices } from './adb.js';

export async function startEmulator(sdk: AndroidSdk, profile: EmulatorProfile): Promise<{ serial: string; started: boolean }> {
  const current = await deviceForProfile(sdk, profile.name);
  if (current) return { serial: current.serial, started: false };

  const child = spawn(sdk.emulatorPath, [
    '-avd', profile.name,
    '-memory', String(profile.memory.ramMB),
    '-no-snapshot',
    '-no-boot-anim',
  ], { detached: true, stdio: 'ignore' });
  const spawnError = await new Promise<Error | undefined>((resolve) => {
    child.once('error', resolve);
    child.once('spawn', () => resolve(undefined));
  });
  if (spawnError) throw new CliError(`Unable to start Android emulator: ${spawnError.message}`, 4);
  child.unref();

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const device = (await listDevices(sdk)).find((candidate) => candidate.avdName === profile.name && candidate.state === 'device');
    if (device) return { serial: device.serial, started: true };
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new CliError(`Emulator process started but ADB did not connect within 60 seconds for ${profile.name}.`, 5);
}

export async function stopEmulator(sdk: AndroidSdk, profileName: string): Promise<boolean> {
  const device = await deviceForProfile(sdk, profileName);
  if (!device) return false;
  const result = await runCommand(sdk.adbPath, ['-s', device.serial, 'emu', 'kill'], { timeoutMs: 15000 });
  runOrThrow(result, 'Emulator shutdown');
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (!(await deviceForProfile(sdk, profileName))) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new CliError(`Timed out waiting for ${profileName} to stop.`, 4);
}