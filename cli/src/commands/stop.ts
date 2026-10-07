import type { Command } from 'commander';
import { requireSdk } from './common.js';
import { stopEmulator } from '../android/emulator.js';

export function registerStop(program: Command): void {
  program.command('stop <profile-name>')
    .description('Shut down an emulator cleanly.')
    .action(async (profileName: string) => {
      const stopped = await stopEmulator(await requireSdk(), profileName);
      console.log(stopped ? `Emulator stopped: ${profileName}` : `${profileName} is not running.`);
    });
}