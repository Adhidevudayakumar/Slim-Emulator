import type { Command } from 'commander';
import { runBenchmark } from '../benchmark/benchmark.js';
import { listAvds } from '../android/avd.js';
import { loadProfileOrExplain, requireSdk } from './common.js';
import { CliError } from '../utils/errors.js';

export function registerBenchmark(program: Command): void {
  program.command('benchmark <profile-name>')
    .description('Measure emulator boot, host resources, and disk usage; save versioned JSON.')
    .option('--package <package-name>', 'Also measure cold app launch time.')
    .action(async (profileName: string, options: { package?: string }) => {
      const [sdk, profile] = await Promise.all([requireSdk(), loadProfileOrExplain(profileName)]);
      if (!(await listAvds(sdk)).includes(profileName)) throw new CliError(`AVD not found: ${profileName}\nCreate it with: slim-em create ${profileName}`, 4);
      console.log(`Benchmarking ${profileName}...`);
      const { result, outputPath } = await runBenchmark(sdk, profile, options.package);
      console.log(`Boot time: ${result.boot.seconds === null ? 'already running; not measured' : `${result.boot.seconds} s`}`);
      console.log(`Host emulator memory (RSS): ${result.resources.memoryMB === null ? 'unavailable' : `${result.resources.memoryMB} MB`}`);
      console.log(`Host emulator CPU: ${result.resources.cpuPercent === null ? 'unavailable' : `${result.resources.cpuPercent}%`}`);
      console.log(`AVD directory: ${result.disk.avdMB} MB`);
      console.log(`System image: ${result.disk.systemImageMB === null ? 'unavailable' : `${result.disk.systemImageMB} MB`}`);
      if (result.appStartupSeconds !== undefined) console.log(`App startup: ${result.appStartupSeconds} s`);
      console.log(`Benchmark JSON: ${outputPath}`);
    });
}