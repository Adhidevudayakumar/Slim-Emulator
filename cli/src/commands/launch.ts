import type { Command } from 'commander';
import { launchPackage } from '../android/adb.js';
import { requireDevice, requireSdk } from './common.js';

export function registerLaunch(program: Command): void {
  program.command('launch <package-name>')
    .description('Launch an installed app by package name.')
    .option('-p, --profile <profile-name>', 'Select the target profile when multiple emulators are running.')
    .option('-a, --activity <activity>', 'Explicit Android activity to launch.')
    .action(async (packageName: string, options: { profile?: string; activity?: string }) => {
      const sdk = await requireSdk();
      const device = await requireDevice(sdk, options.profile);
      const output = await launchPackage(sdk, device.serial, packageName, options.activity);
      console.log(output || `Launched ${packageName} on ${device.avdName ?? device.serial}.`);
    });
}