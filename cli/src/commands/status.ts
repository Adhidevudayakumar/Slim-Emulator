import type { Command } from 'commander';
import { deviceForProfile, readDeviceProperties } from '../android/adb.js';
import { listAvds } from '../android/avd.js';
import { loadProfile } from '../config/manager.js';
import { listProfileNames, requireSdk } from './common.js';
import { CliError } from '../utils/errors.js';

export function registerStatus(program: Command): void {
  program.command('status [profile-name]')
    .description('Show profile, AVD, ADB, and Android boot status.')
    .action(async (requestedName?: string) => {
      const sdk = await requireSdk();
      const [avds, names] = await Promise.all([listAvds(sdk), requestedName ? Promise.resolve([requestedName]) : listProfileNames()]);
      if (names.length === 0) throw new CliError('No profiles found. Create one with: slim-em create <profile-name>', 2);
      for (const name of names) {
        let profile;
        try {
          profile = await loadProfile(name);
        } catch {
          console.log(`${name}: profile configuration is invalid or missing.`);
          continue;
        }
        const isCreated = avds.includes(name);
        const connected = isCreated ? await deviceForProfile(sdk, name) : undefined;
        console.log(`Profile: ${name}`);
        console.log(`AVD: ${isCreated ? 'Created' : 'Not created'}`);
        console.log(`Status: ${connected?.state === 'device' ? 'Running' : 'Stopped'}`);
        console.log(`ADB: ${connected?.state === 'device' ? 'Connected' : 'Disconnected'}`);
        if (connected?.state === 'device') {
          const properties = await readDeviceProperties(sdk, connected.serial);
          console.log(`Boot: ${properties.bootCompleted === '1' ? 'Complete' : properties.bootCompleted === '0' ? 'In progress' : 'Unknown'}`);
          console.log(`Android: ${properties.androidVersion} (API ${properties.apiLevel})`);
          console.log(`Device: ${connected.serial}`);
        }
        console.log(`Profile RAM: ${profile.memory.ramMB} MB`);
        console.log('');
      }
    });
}