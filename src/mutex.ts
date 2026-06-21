import { Semaphore, type Release } from "./semaphore.js";

/** Options for {@link Mutex.acquire} / {@link Mutex.runExclusive}. */
export interface LockOptions {
  /** Abort the wait; a queued acquire rejects and leaves the queue. */
  signal?: AbortSignal;
}

/**
 * A mutual-exclusion lock — at most one holder at a time (a `Semaphore(1)`).
 *
 * Use it to serialize a critical section: concurrent callers run one after
 * another, in arrival order.
 *
 * @example
 * ```ts
 * const mutex = new Mutex();
 * // Only one writer touches the file at a time, no matter how many call it.
 * await mutex.runExclusive(() => appendToFile(line));
 * ```
 */
export class Mutex {
  private readonly sem = new Semaphore(1);

  /** Whether the lock is currently held. */
  get isLocked(): boolean {
    return this.sem.available === 0;
  }

  /** Number of callers waiting for the lock. */
  get pending(): number {
    return this.sem.pending;
  }

  /** Wait for the lock, then resolve with a {@link Release}. */
  acquire(options: LockOptions = {}): Promise<Release> {
    return this.sem.acquire(options);
  }

  /** Take the lock immediately, or return `null` if it is held. */
  tryAcquire(): Release | null {
    return this.sem.tryAcquire();
  }

  /** Acquire, run `fn`, and release automatically (even on throw). */
  runExclusive<T>(fn: () => Promise<T> | T, options: LockOptions = {}): Promise<T> {
    return this.sem.runExclusive(fn, options);
  }
}
