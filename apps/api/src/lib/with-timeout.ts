/**
 * Reject a promise if it doesn't settle within `ms`. Used to bound dependency
 * connectivity checks so a black-holed host can never hang startup or /readyz.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message = 'timeout'): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
