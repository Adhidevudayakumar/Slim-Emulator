import type { Command } from 'commander';
import { availableFeatures } from '../android/adb.js';
import { loadProfileOrExplain, requireDevice, requireSdk } from './common.js';

const featurePatterns: Record<string, RegExp> = {
  wifi: /android\.hardware\.wifi/,
  location: /android\.hardware\.location/,
  camera: /android\.hardware\.camera/,
  bluetooth: /android\.hardware\.bluetooth/,
  nfc: /android\.hardware\.nfc/,
};

export function registerCapabilities(program: Command): void {
  program.command('capabilities <profile-name>')
    .description('Compare requested profile capabilities with Android-reported features.')
    .action(async (profileName: string) => {
      const [sdk, profile] = await Promise.all([requireSdk(), loadProfileOrExplain(profileName)]);
      const device = await requireDevice(sdk, profileName);
      const features = await availableFeatures(sdk, device.serial);
      for (const [name, pattern] of Object.entries(featurePatterns)) {
        const status = features === undefined ? 'unknown' : features.some((feature) => pattern.test(feature)) ? 'available' : 'unsupported';
        console.log(`${name.padEnd(12)} requested=${profile.services[name as keyof typeof profile.services] ? 'yes' : 'no'}  status=${status}`);
      }
      console.log('Capabilities are runtime reports; this command does not disable Android services.');
    });
}