import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getBenchmarkDir } from '../config/paths.js';
import type { EmulatorProfile } from '../config/schema.js';
import type { AndroidSdk } from '../android/sdk.js';
import { launchPackage, stopApp, waitForBoot } from '../android/adb.js';
import { startEmulator } from '../android/emulator.js';
import { avdDirectorySize, directorySizeBytes, systemImageDirectory } from './disk.js';
import { measureEmulatorResources } from './memory.js';

export interface BenchmarkResult {
  version: 1;
  timestamp: string;
  profile: string;
  systemImage: { api: number; architecture: string; source: 'sdk' | 'local' };
  avd: { ramMB: number; storageMB: number };
  boot: { seconds: number | null; passed: boolean };
  resources: { memoryMB: number | null; cpuPercent: number | null; measurement: 'host-process-rss' };
  disk: { avdMB: number; systemImageMB: number | null };
  appStartupSeconds?: number;
}

export async function runBenchmark(sdk: AndroidSdk, profile: EmulatorProfile, packageName?: string): Promise<{ result: BenchmarkResult; outputPath: string }> {
  const launchedAt = Date.now();
  const { serial, started } = await startEmulator(sdk, profile);
  await waitForBoot(sdk, serial, 180000);
  const bootSeconds = started ? Math.round((Date.now() - launchedAt) / 100) / 10 : null;
  let appStartupSeconds: number | undefined;
  if (packageName) {
    await stopApp(sdk, serial, packageName);
    const appStartedAt = Date.now();
    await launchPackage(sdk, serial, packageName);
    appStartupSeconds = Math.round((Date.now() - appStartedAt) / 10) / 100;
  }

  const [resources, avdBytes] = await Promise.all([
    measureEmulatorResources(sdk, profile.name),
    avdDirectorySize(profile.name),
  ]);
  const imageDir = systemImageDirectory(sdk.sdkRoot, profile.systemImage.package, profile.systemImage.location);
  const imageBytes = imageDir ? await directorySizeBytes(imageDir) : 0;
  const result: BenchmarkResult = {
    version: 1,
    timestamp: new Date().toISOString(),
    profile: profile.name,
    systemImage: { api: profile.systemImage.apiLevel, architecture: profile.systemImage.architecture, source: profile.systemImage.source },
    avd: { ramMB: profile.memory.ramMB, storageMB: profile.storage.dataMB },
    boot: { seconds: bootSeconds, passed: true },
    resources: { ...resources, measurement: 'host-process-rss' },
    disk: { avdMB: megabytes(avdBytes), systemImageMB: imageDir ? megabytes(imageBytes) : null },
    ...(appStartupSeconds === undefined ? {} : { appStartupSeconds }),
  };

  const profileDir = getBenchmarkDir(profile.name);
  await mkdir(profileDir, { recursive: true });
  const fileTimestamp = result.timestamp.replace(/:/g, '-');
  const outputPath = path.join(profileDir, `${fileTimestamp}.json`);
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
  return { result, outputPath };
}

function megabytes(bytes: number): number {
  return Math.round(bytes / (1024 * 1024) * 10) / 10;
}