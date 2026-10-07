#!/usr/bin/env node
import { Command } from 'commander';
import { CliError, errorMessage } from './utils/errors.js';
import { registerInit } from './commands/init.js';
import { registerCreate } from './commands/create.js';
import { registerReset } from './commands/reset.js';
import { registerStart } from './commands/start.js';
import { registerStop } from './commands/stop.js';
import { registerStatus } from './commands/status.js';
import { registerInstall } from './commands/install.js';
import { registerLaunch } from './commands/launch.js';
import { registerLogs } from './commands/logs.js';
import { registerBenchmark } from './commands/benchmark.js';
import { registerCapabilities } from './commands/capabilities.js';

export const program = new Command()
  .name('slim-em')
  .description('Manage Android emulator profiles and measure their resource usage.')
  .version('0.1.0')
  .option('--verbose', 'Show executed Android SDK commands.')
  .showHelpAfterError();

program.exitOverride();
program.hook('preAction', () => {
  if (program.opts().verbose) process.env.SLIM_EM_VERBOSE = '1';
});

registerInit(program);
registerCreate(program);
registerReset(program);
registerStart(program);
registerStop(program);
registerStatus(program);
registerInstall(program);
registerLaunch(program);
registerLogs(program);
registerBenchmark(program);
registerCapabilities(program);

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof Error && 'code' in error && String(error.code).startsWith('commander.')) {
    const exitCode = (error as Error & { exitCode?: unknown }).exitCode;
    process.exitCode = typeof exitCode === 'number' ? exitCode : 0;
  } else {
    console.error(`Error: ${errorMessage(error)}`);
    process.exitCode = error instanceof CliError ? error.exitCode : 1;
  }
}