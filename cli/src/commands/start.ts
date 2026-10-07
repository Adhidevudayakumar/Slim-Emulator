import type { Command } from 'commander';
import { loadProfileOrExplain, requireSdk } from './common.js';
import { listAvds } from '../android/avd.js';
import { readDeviceProperties, waitForBoot } from '../android/adb.js';
import { startEmulator } from '../android/emulator.js';
import { CliError } from '../utils/errors.js';

export function registerStart(program: Command): void {
  program.command('start <profile-name>')
    .description('Start an AVD and wait for Android to finish booting.')
    .option('--timeout <seconds>', 'Boot timeout in seconds', parseTimeout)
    .action(async (profileName: string, options: { timeout?: number }) => {
      const [sdk, profile] = await Promise.all([requireSdk(), loadProfileOrExplain(profileName)]);
      if (!(await listAvds(sdk)).includes(profileName)) throw new CliError(`AVD not found: ${profileName}\nCreate it with: slim-em create ${profileName}`, 4);
      console.log(`Starting ${profileName}...`);
      const { serial, started } = await startEmulator(sdk, profile);
      if (!started) console.log(`${profileName} is already running.`);
      await waitForBoot(sdk, serial, (options.timeout ?? 180) * 1000);
      const properties = await readDeviceProperties(sdk, serial);
      console.log(`Emulator ready: ${serial}`);
      console.log(`Android ${properties.androidVersion} (API ${properties.apiLevel}); profile RAM ${profile.memory.ramMB} MB`);
    });
}

function parseTimeout(value: string): number {
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds < 10 || seconds > 1800) throw new Error('Timeout must be between 10 and 1800 seconds.');
  return seconds;
}