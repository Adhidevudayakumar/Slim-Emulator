import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import type { Command } from 'commander';
import { getProfilePath } from '../config/paths.js';
import { resetProfile, loadProfile } from '../config/manager.js';
import { CliError } from '../utils/errors.js';

export function registerReset(program: Command): void {
  program.command('reset <profile-name>')
    .description('Restore a profile to defaults without deleting its AVD or user data.')
    .option('--force', 'Skip the confirmation prompt.')
    .action(async (profileName: string, options: { force?: boolean }) => {
      try {
        await loadProfile(profileName);
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          throw new CliError(`Profile not found: ${profileName}`, 2);
        }
        throw error;
      }
      if (!options.force && !(await confirmReset(profileName))) {
        console.log('Reset cancelled.');
        return;
      }
      await resetProfile(profileName);
      console.log(`Profile restored to defaults: ${getProfilePath(profileName)}`);
      console.log('The AVD, installed apps, benchmark results, and other user data were not deleted.');
    });
}

async function confirmReset(profileName: string): Promise<boolean> {
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await terminal.question(`Restore ${profileName} to defaults? [y/N] `);
    return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
  } finally {
    terminal.close();
  }
}