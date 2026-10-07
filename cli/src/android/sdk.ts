import { access, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { constants } from 'node:fs';
import { CliError } from '../utils/errors.js';

export interface AndroidSdk {
  sdkRoot: string;
  adbPath: string;
  emulatorPath: string;
  avdManagerPath: string;
  sdkManagerPath: string;
}

export interface SdkDetectionOptions {
  sdkRoot?: string;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  homeDir?: string;
}

export async function detectAndroidSdk(options: SdkDetectionOptions = {}): Promise<AndroidSdk> {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const home = options.homeDir ?? env.HOME ?? os.homedir();
  const roots = unique([
    options.sdkRoot,
    env.ANDROID_SDK_ROOT,
    env.ANDROID_HOME,
    path.join(home, 'Android', 'Sdk'),
    path.join(home, 'Library', 'Android', 'sdk'),
    env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, 'Android', 'Sdk') : undefined,
  ].filter((value): value is string => Boolean(value)));

  const failures: string[] = [];
  for (const sdkRoot of roots) {
    const sdk = await pathsForSdk(sdkRoot, platform);
    const missing = await findMissingTools(sdk, platform);
    if (missing.length === 0) return sdk;
    failures.push(`${sdkRoot}: missing ${missing.join(', ')}`);
  }

  const details = failures.length ? `\nChecked:\n  ${failures.join('\n  ')}` : '';
  throw new CliError(
    `Android SDK tools were not found. Set ANDROID_SDK_ROOT to your SDK directory and install Platform-Tools, Emulator, and Android SDK Command-line Tools.${details}`,
    3,
  );
}

export async function validateAndroidSdk(sdk: AndroidSdk, platform = process.platform): Promise<void> {
  const missing = await findMissingTools(sdk, platform);
  if (missing.length > 0) {
    throw new CliError(
      `Android SDK validation failed. Missing: ${missing.join(', ')}\nSDK: ${sdk.sdkRoot}\nInstall Platform-Tools, Emulator, and Android SDK Command-line Tools, then check ANDROID_SDK_ROOT.`,
      3,
    );
  }
}

export async function hasSystemImage(sdkRoot: string, packageId: string): Promise<boolean> {
  const [_, api, tag, architecture] = packageId.split(';');
  if (!api || !tag || !architecture) return false;
  try {
    await access(path.join(sdkRoot, 'system-images', api, tag, architecture), constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function pathsForSdk(sdkRoot: string, platform: NodeJS.Platform): Promise<AndroidSdk> {
  const extension = platform === 'win32' ? '.exe' : '';
  const commandLineDirs = [path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin')];
  try {
    const versions = await readdir(path.join(sdkRoot, 'cmdline-tools'));
    commandLineDirs.push(...versions
      .filter((name) => name !== 'latest')
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
      .map((name) => path.join(sdkRoot, 'cmdline-tools', name, 'bin')));
  } catch {
    // Missing command-line tools are reported by validation below.
  }
  commandLineDirs.push(path.join(sdkRoot, 'tools', 'bin'));

  return {
    sdkRoot,
    adbPath: path.join(sdkRoot, 'platform-tools', `adb${extension}`),
    emulatorPath: path.join(sdkRoot, 'emulator', `emulator${extension}`),
    avdManagerPath: await firstExisting(commandLineDirs.map((dir) => path.join(dir, `avdmanager${extension}`))),
    sdkManagerPath: await firstExisting(commandLineDirs.map((dir) => path.join(dir, `sdkmanager${extension}`))),
  };
}

async function firstExisting(candidates: string[]): Promise<string> {
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.F_OK);
      return candidate;
    } catch {
      // Try the next SDK command-line-tools installation.
    }
  }
  return candidates[0] ?? '';
}

async function findMissingTools(sdk: AndroidSdk, platform: NodeJS.Platform): Promise<string[]> {
  const required: Array<[string, string]> = [
    ['adb', sdk.adbPath],
    ['emulator', sdk.emulatorPath],
    ['avdmanager', sdk.avdManagerPath],
    ['sdkmanager', sdk.sdkManagerPath],
  ];
  const missing: string[] = [];
  for (const [name, executable] of required) {
    try {
      await access(executable, platform === 'win32' ? constants.F_OK : constants.X_OK);
    } catch {
      missing.push(`${name} (${executable})`);
    }
  }
  return missing;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => path.resolve(value)))];
}