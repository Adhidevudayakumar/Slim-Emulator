import { spawn } from 'node:child_process';
import { CliError } from './errors.js';

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export function runCommand(
  executable: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<CommandResult> {
  if (process.env.SLIM_EM_VERBOSE === '1') console.error(`$ ${executable} ${args.map((arg) => JSON.stringify(arg)).join(' ')}`);
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timeout = options.timeoutMs === undefined ? undefined : setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, options.timeoutMs);
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk; });
    child.once('error', (error) => {
      if (timeout) clearTimeout(timeout);
      reject(new CliError(`Unable to run ${executable}: ${error.message}`, 3));
    });
    child.once('close', (code) => {
      if (timeout) clearTimeout(timeout);
      if (timedOut) {
        reject(new CliError(`${executable} timed out after ${options.timeoutMs} ms.`));
        return;
      }
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

export function runOrThrow(result: CommandResult, label: string): string {
  if (result.code !== 0) {
    const reason = result.stderr.trim() || result.stdout.trim() || `exit code ${result.code}`;
    throw new CliError(`${label} failed: ${reason}`);
  }
  return result.stdout;
}