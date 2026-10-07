import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { avdConfigPath } from '../android/avd.js';

export async function directorySizeBytes(directory: string): Promise<number> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return 0;
  }
  let total = 0;
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) total += await directorySizeBytes(entryPath);
    else if (entry.isFile()) {
      try { total += (await stat(entryPath)).size; } catch { /* File changed during measurement. */ }
    }
  }
  return total;
}

export async function avdDirectorySize(profileName: string): Promise<number> {
  const configPath = await avdConfigPath(profileName);
  return directorySizeBytes(path.dirname(configPath));
}

export function systemImageDirectory(sdkRoot: string, packageId?: string, localPath?: string): string | undefined {
  if (localPath) return localPath;
  if (!packageId) return undefined;
  const parts = packageId.split(';');
  if (parts.length !== 4 || parts[0] !== 'system-images') return undefined;
  return path.join(sdkRoot, 'system-images', parts[1]!, parts[2]!, parts[3]!);
}