import { access, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { EmulatorProfile } from '../config/schema.js';
import { runCommand, runOrThrow } from '../utils/command.js';
import { CliError } from '../utils/errors.js';
import type { AndroidSdk } from './sdk.js';

export async function listAvds(sdk: AndroidSdk): Promise<string[]> {
  const result = await runCommand(sdk.emulatorPath, ['-list-avds']);
  return runOrThrow(result, 'AVD listing').split('\n').map((name) => name.trim()).filter(Boolean);
}

export async function createAvd(sdk: AndroidSdk, profile: EmulatorProfile): Promise<boolean> {
  if (profile.systemImage.source !== 'sdk' || !profile.systemImage.package) {
    throw new CliError('Local system images are described by profiles but are not supported by the MVP AVD creator yet.', 2);
  }
  if ((await listAvds(sdk)).includes(profile.name)) return false;
  const result = await runCommand(sdk.avdManagerPath, [
    'create', 'avd', '--name', profile.name, '--package', profile.systemImage.package,
    '--device', profile.device.name,
  ], { timeoutMs: 120000 });
  runOrThrow(result, 'AVD creation');
  await configureAvd(profile);
  return true;
}

export async function avdConfigPath(profileName: string, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const avdRoot = env.ANDROID_AVD_HOME ?? path.join(env.HOME ?? os.homedir(), '.android', 'avd');
  return path.join(avdRoot, `${profileName}.avd`, 'config.ini');
}

async function configureAvd(profile: EmulatorProfile): Promise<void> {
  const configPath = await avdConfigPath(profile.name);
  try {
    await access(configPath);
  } catch {
    throw new CliError(`avdmanager created ${profile.name}, but its config.ini was not found at ${configPath}.`, 4);
  }
  const current = await readFile(configPath, 'utf8');
  const values: Record<string, string> = {
    'hw.ramSize': String(profile.memory.ramMB),
    'disk.dataPartition.size': `${profile.storage.dataMB}M`,
    'hw.lcd.width': String(profile.display.width),
    'hw.lcd.height': String(profile.display.height),
    'hw.lcd.density': String(profile.display.density),
  };
  const lines = current.split(/\r?\n/).filter((line) => !Object.keys(values).some((key) => line.startsWith(`${key}=`)));
  for (const [key, value] of Object.entries(values)) lines.push(`${key}=${value}`);
  await writeFile(configPath, `${lines.filter(Boolean).join('\n')}\n`);
}