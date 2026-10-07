import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { loadProfile } from '../config/manager.js';
import { getConfigDir } from '../config/paths.js';
import { deviceForProfile, listDevices, type EmulatorDevice } from '../android/adb.js';
import { detectAndroidSdk, type AndroidSdk } from '../android/sdk.js';
import { CliError } from '../utils/errors.js';

export async function requireSdk(): Promise<AndroidSdk> {
  return detectAndroidSdk();
}

export async function requireDevice(sdk: AndroidSdk, profileName?: string): Promise<EmulatorDevice> {
  if (profileName) {
    const device = await deviceForProfile(sdk, profileName);
    if (device?.state === 'device') return device;
    throw new CliError(`${profileName} is not running or ADB is disconnected. Start it with: slim-em start ${profileName}`, 5);
  }
  const devices = (await listDevices(sdk)).filter((device) => device.serial.startsWith('emulator-') && device.state === 'device');
  if (devices.length === 1) return devices[0]!;
  if (devices.length === 0) throw new CliError('No running emulator found. Start one with: slim-em start <profile-name>', 5);
  throw new CliError('More than one emulator is running. Select one with --profile <profile-name>.', 5);
}

export async function listProfileNames(): Promise<string[]> {
  const profilesDir = path.join(getConfigDir(), 'profiles');
  try {
    return (await readdir(profilesDir)).filter((file) => file.endsWith('.json')).map((file) => file.slice(0, -5));
  } catch {
    return [];
  }
}

export async function loadProfileOrExplain(name: string) {
  try {
    return await loadProfile(name);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new CliError(`Profile not found: ${name}\nCreate it with: slim-em create ${name}`, 2);
    }
    throw error;
  }
}