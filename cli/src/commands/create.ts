import type { Command } from 'commander';
import { saveProfile, loadProfile } from '../config/manager.js';
import { defaultProfile, profileSchema } from '../config/schema.js';
import { getProfilePath } from '../config/paths.js';
import { requireSdk } from './common.js';
import { hasSystemImage } from '../android/sdk.js';
import { createAvd, listAvds } from '../android/avd.js';
import { CliError } from '../utils/errors.js';

export function registerCreate(program: Command): void {
  program.command('create <profile-name>')
    .description('Create a profile and AVD using an installed Android system image.')
    .option('--api <level>', 'Android API level for a new profile', parsePositiveInteger)
    .option('--arch <architecture>', 'System image architecture for a new profile')
    .action(async (profileName: string, options: { api?: number; arch?: string }) => {
      let profile;
      try {
        profile = await loadProfile(profileName);
        if (options.api || options.arch) throw new CliError(`Profile already exists: ${getProfilePath(profileName)}. Edit it directly or use slim-em reset ${profileName}.`, 2);
      } catch (error) {
        if (error instanceof CliError) throw error;
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
        profile = defaultProfile(profileName);
        if (options.api || options.arch) {
          const api = options.api ?? profile.systemImage.apiLevel;
          const arch = options.arch ?? profile.systemImage.architecture;
          profile = profileSchema.parse({
            ...profile,
            systemImage: { source: 'sdk', package: `system-images;android-${api};default;${arch}`, apiLevel: api, architecture: arch },
          });
        }
        await saveProfile(profile);
        console.log(`Profile saved: ${getProfilePath(profileName)}`);
      }

      const sdk = await requireSdk();
      const imagePackage = profile.systemImage.package;
      if (profile.systemImage.source === 'sdk' && imagePackage && !(await hasSystemImage(sdk.sdkRoot, imagePackage))) {
        throw new CliError(`Required system image is not installed.\nRequired: ${imagePackage}\nInstall it with: sdkmanager "${imagePackage}"`, 4);
      }
      const existed = (await listAvds(sdk)).includes(profileName);
      if (existed) {
        console.log(`AVD already exists: ${profileName}`);
      } else {
        await createAvd(sdk, profile);
        console.log(`AVD created: ${profileName}`);
      }
      console.log('AVD configuration does not remove packages or disable Android services.');
    });
}

function parsePositiveInteger(value: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 23) throw new Error('API level must be an integer of 23 or greater.');
  return number;
}