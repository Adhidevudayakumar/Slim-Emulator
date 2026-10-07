import { runCommand } from '../utils/command.js';
import type { AndroidSdk } from '../android/sdk.js';

export interface HostResources {
  memoryMB: number | null;
  cpuPercent: number | null;
}

export async function measureEmulatorResources(sdk: AndroidSdk, profileName: string): Promise<HostResources> {
  const args = process.platform === 'darwin'
    ? ['-axo', 'pid=,rss=,%cpu=,command=']
    : ['-eo', 'pid=,rss=,%cpu=,args='];
  const result = await runCommand('ps', args);
  if (result.code !== 0) return { memoryMB: null, cpuPercent: null };

  let rssKB = 0;
  let cpuPercent = 0;
  let matched = false;
  for (const line of result.stdout.split('\n')) {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+(.+)$/);
    if (!match) continue;
    const command = match[4]!;
    const isEmulator = command.includes(sdk.emulatorPath) || /(?:^|\/)qemu-system[-\w]*/.test(command);
    const isProfile = command.includes(`-avd ${profileName}`) || command.includes(`@${profileName}`);
    if (isEmulator && isProfile) {
      rssKB += Number(match[2]);
      cpuPercent += Number(match[3]);
      matched = true;
    }
  }
  return matched
    ? { memoryMB: Math.round(rssKB / 1024), cpuPercent: Math.round(cpuPercent * 10) / 10 }
    : { memoryMB: null, cpuPercent: null };
}