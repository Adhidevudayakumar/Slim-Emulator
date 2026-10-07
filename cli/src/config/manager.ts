import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { defaultProfile, profileSchema, type EmulatorProfile } from './schema.js';
import { getConfigDir, getProfilePath } from './paths.js';

export async function initializeConfig(configDir = getConfigDir()): Promise<void> {
  await mkdir(join(configDir, 'profiles'), { recursive: true });
  await mkdir(join(configDir, 'benchmarks'), { recursive: true });
  const configPath = join(configDir, 'config.json');
  try {
    await readFile(configPath, 'utf8');
  } catch (error) {
    if (!isMissingFile(error)) throw error;
    await writeFile(configPath, `${JSON.stringify({ version: 1 }, null, 2)}\n`, { flag: 'wx' });
  }
}

export async function saveProfile(profile: EmulatorProfile, configDir = getConfigDir()): Promise<string> {
  const parsed = profileSchema.parse(profile);
  const profilePath = getProfilePath(parsed.name, configDir);
  await mkdir(dirname(profilePath), { recursive: true });
  await writeFile(profilePath, `${JSON.stringify(parsed, null, 2)}\n`, { flag: 'wx' });
  return profilePath;
}

export async function loadProfile(name: string, configDir = getConfigDir()): Promise<EmulatorProfile> {
  const contents = await readFile(getProfilePath(name, configDir), 'utf8');
  return profileSchema.parse(JSON.parse(contents) as unknown);
}

export async function resetProfile(name: string, configDir = getConfigDir()): Promise<EmulatorProfile> {
  const profile = defaultProfile(name);
  const profilePath = getProfilePath(name, configDir);
  await mkdir(dirname(profilePath), { recursive: true });
  await writeFile(profilePath, `${JSON.stringify(profile, null, 2)}\n`);
  return profile;
}

function isMissingFile(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}