import { runCommand, runOrThrow } from '../utils/command.js';
import { CliError } from '../utils/errors.js';
import type { AndroidSdk } from './sdk.js';

export interface EmulatorDevice {
  serial: string;
  state: string;
  avdName?: string;
}

export async function listDevices(sdk: AndroidSdk): Promise<EmulatorDevice[]> {
  const result = await runCommand(sdk.adbPath, ['devices', '-l']);
  const output = runOrThrow(result, 'adb devices');
  return output.split('\n').slice(1).flatMap((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2 || !parts[0]) return [];
    const avd = line.match(/\bavd:([^\s]+)/)?.[1];
    return [{ serial: parts[0], state: parts[1]!, avdName: avd }];
  });
}

export async function deviceForProfile(sdk: AndroidSdk, profileName: string): Promise<EmulatorDevice | undefined> {
  return (await listDevices(sdk)).find((device) => device.avdName === profileName);
}

export async function waitForBoot(sdk: AndroidSdk, serial: string, timeoutMs: number): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const device = (await listDevices(sdk)).find((candidate) => candidate.serial === serial);
    if (device?.state === 'device') {
      const result = await runCommand(sdk.adbPath, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed'], { timeoutMs: 5000 });
      if (result.code === 0 && result.stdout.trim() === '1') return;
    }
    await delay(1000);
  }
  throw new CliError(`Android did not finish booting on ${serial} within ${Math.round(timeoutMs / 1000)} seconds. Check with: slim-em logs --profile <name>` , 5);
}

export async function installApk(sdk: AndroidSdk, serial: string, apkPath: string): Promise<void> {
  const result = await runCommand(sdk.adbPath, ['-s', serial, 'install', '-r', apkPath], { timeoutMs: 120000 });
  runOrThrow(result, 'APK installation');
}

export async function launchPackage(sdk: AndroidSdk, serial: string, packageName: string, activity?: string): Promise<string> {
  const installed = await runCommand(sdk.adbPath, ['-s', serial, 'shell', 'pm', 'path', packageName]);
  if (installed.code !== 0 || !installed.stdout.trim()) {
    throw new CliError(`Package not found on emulator: ${packageName}\nInstall the APK first with: slim-em install ./app.apk`, 5);
  }
  if (activity) {
    const component = activity.includes('/') ? activity : `${packageName}/${activity}`;
    const result = await runCommand(sdk.adbPath, ['-s', serial, 'shell', 'am', 'start', '-n', component]);
    return runOrThrow(result, 'App launch').trim();
  }
  const result = await runCommand(sdk.adbPath, ['-s', serial, 'shell', 'monkey', '-p', packageName, '1']);
  return runOrThrow(result, 'App launch').trim();
}

export async function stopApp(sdk: AndroidSdk, serial: string, packageName: string): Promise<void> {
  const result = await runCommand(sdk.adbPath, ['-s', serial, 'shell', 'am', 'force-stop', packageName]);
  runOrThrow(result, 'App force-stop');
}

export async function readDeviceProperties(sdk: AndroidSdk, serial: string): Promise<{ androidVersion: string; apiLevel: string; bootCompleted: string }> {
  const [version, api, boot] = await Promise.all([
    runCommand(sdk.adbPath, ['-s', serial, 'shell', 'getprop', 'ro.build.version.release']),
    runCommand(sdk.adbPath, ['-s', serial, 'shell', 'getprop', 'ro.build.version.sdk']),
    runCommand(sdk.adbPath, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed']),
  ]);
  return {
    androidVersion: version.stdout.trim() || 'Unknown',
    apiLevel: api.stdout.trim() || 'Unknown',
    bootCompleted: boot.code === 0 ? boot.stdout.trim() : '',
  };
}

export async function availableFeatures(sdk: AndroidSdk, serial: string): Promise<string[] | undefined> {
  const result = await runCommand(sdk.adbPath, ['-s', serial, 'shell', 'pm', 'list', 'features']);
  if (result.code !== 0) return undefined;
  return result.stdout.split('\n').map((line) => line.trim().replace(/^feature:/, '')).filter(Boolean);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}