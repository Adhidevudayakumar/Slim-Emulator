import type { Command } from 'commander';
import { initializeConfig } from '../config/manager.js';
import { getConfigDir } from '../config/paths.js';
import { detectAndroidSdk } from '../android/sdk.js';
import { errorMessage } from '../utils/errors.js';

export function registerInit(program: Command): void {
  program.command('init')
    .description('Initialize configuration and validate Android SDK tools.')
    .action(async () => {
      const configDir = getConfigDir();
      await initializeConfig(configDir);
      console.log(`Configuration initialized: ${configDir}`);
      try {
        const sdk = await detectAndroidSdk();
        console.log(`Android SDK detected: ${sdk.sdkRoot}`);
        console.log('adb, emulator, avdmanager, and sdkmanager detected.');
      } catch (error) {
        console.error(errorMessage(error));
        process.exitCode = 3;
      }
    });
}