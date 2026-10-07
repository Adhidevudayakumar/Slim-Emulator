import { spawn } from 'node:child_process';
import type { Command } from 'commander';
import { requireDevice, requireSdk } from './common.js';
import { runCommand, runOrThrow } from '../utils/command.js';
import { CliError } from '../utils/errors.js';

export function registerLogs(program: Command): void {
  program.command('logs')
    .description('Stream Android logcat from a running emulator.')
    .option('-p, --profile <profile-name>', 'Select the target profile when multiple emulators are running.')
    .option('--package <package-name>', 'Show logcat output for one app process.')
    .action(async (options: { profile?: string; package?: string }) => {
      const sdk = await requireSdk();
      const device = await requireDevice(sdk, options.profile);
      const args = ['-s', device.serial, 'logcat'];
      if (options.package) {
        const pidResult = await runCommand(sdk.adbPath, ['-s', device.serial, 'shell', 'pidof', options.package]);
        const pid = pidResult.stdout.trim().split(/\s+/)[0];
        if (!pid) throw new CliError(`Package is not running: ${options.package}`, 5);
        args.push('--pid', pid);
      }
      const child = spawn(sdk.adbPath, args, { stdio: 'inherit' });
      child.once('error', (error) => { console.error(`Unable to start logcat: ${error.message}`); process.exitCode = 5; });
      child.once('close', (code) => { process.exitCode = code ?? 1; });
    });
}