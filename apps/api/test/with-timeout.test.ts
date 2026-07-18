import { describe, it, expect } from 'vitest';
import { withTimeout } from '../src/lib/with-timeout.js';

/** Unit test (hermetic) for the timeout helper used by connectivity checks. */
describe('withTimeout', () => {
  it('resolves with the value when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('rejects with the given message when the deadline is exceeded', async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 300));
    await expect(withTimeout(slow, 20, 'too slow')).rejects.toThrow('too slow');
  });
});
