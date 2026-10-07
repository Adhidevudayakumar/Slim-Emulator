import os from 'node:os';
import path from 'node:path';

export function getConfigDir(env: NodeJS.ProcessEnv = process.env, platform = process.platform): string {
  const pathApi = platform === 'win32' ? path.win32 : path;
  if (platform === 'darwin') {
    return pathApi.join(env.HOME ?? os.homedir(), 'Library', 'Application Support', 'slim-emulator');
  }
  if (platform === 'win32') {
    return pathApi.join(env.APPDATA ?? pathApi.join(env.USERPROFILE ?? os.homedir(), 'AppData', 'Roaming'), 'slim-emulator');
  }
  return pathApi.join(env.XDG_CONFIG_HOME ?? pathApi.join(env.HOME ?? os.homedir(), '.config'), 'slim-emulator');
}

export function getProfilePath(name: string, configDir = getConfigDir()): string {
  return path.join(configDir, 'profiles', `${name}.json`);
}

export function getBenchmarkDir(profileName: string, configDir = getConfigDir()): string {
  return path.join(configDir, 'benchmarks', profileName);
}