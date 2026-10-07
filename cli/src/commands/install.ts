import { access, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';
import { installApk } from '../android/adb.js';
import { requireDevice, requireSdk } from './common.js';

export function registerInstall(program: Command): void {
  program.command('install <apk-path>')
    .description('Install an APK on one running emulator.')
    .option('-p, --profile <profile-name>', 'Select the target profile when multiple emulators are running.')
    .action(async (apkPath: string, options: { profile?: string }) => {
      const resolvedPath = path.resolve(apkPath);
      await access(resolvedPath);
      if (!(await stat(resolvedPath)).isFile()) throw new Error(`APK path is not a file: ${resolvedPath}`);
      const sdk = await requireSdk();
      const device = await requireDevice(sdk, options.profile);
      await installApk(sdk, device.serial, resolvedPath);
      console.log(`APK installed on ${device.avdName ?? device.serial}.`);
    });
}