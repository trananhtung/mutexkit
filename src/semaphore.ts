/** A function that releases a previously acquired permit. Idempotent. */
export type Release = () => void;

/** Options for {@link Semaphore.acquire} / {@link Semaphore.runExclusive}. */
export interface AcquireOptions {
  /** Abort the wait; a queued acquire rejects and leaves the queue. */
  signal?: AbortSignal;
  /** Number of permits to take at once (weighted). Default `1`. */
  weight?: number;
}

interface Waiter {
  weight: number;
  resolve: (release: Release) => void;
  reject: (err: unknown) => void;
  detach: () => void;
}

function abortError(signal?: AbortSignal): unknown {
  return signal?.reason ?? new DOMException("This operation was aborted", "AbortError");
}

/**
 * A counting semaphore: at most `permits` units may be held at once.
 *
 * Waiters are served fairly (FIFO). Each {@link acquire} resolves with an
 * idempotent {@link Release} you must call to return the permit(s); prefer
 * {@link runExclusive}, which releases automatically even if the function throws.
 *
 * @example
 * ```ts
 * const sem = new Semaphore(3); // at most 3 concurrent
 * await Promise.all(tasks.map((t) => sem.runExclusive(() => t())));
 * ```
 */
export class Semaphore {
  /** Total number of permits. */
  readonly permits: number;
  private inUse = 0;
  private readonly queue: Waiter[] = [];

  constructor(permits: number) {
    if (!Number.isInteger(permits) || permits < 1) {
      throw new RangeError("Semaphore: permits must be a positive integer");
    }
    this.permits = permits;
  }

  /** Permits currently available. */
  get available(): number {
    return this.permits - this.inUse;
  }

  /** Number of callers waiting for a permit. */
  get pending(): number {
    return this.queue.length;
  }

  private makeRelease(weight: number): Release {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.inUse -= weight;
      this.pump();
    };
  }

  private pump(): void {
    while (this.queue.length > 0 && this.queue[0]!.weight <= this.available) {
      const waiter = this.queue.shift()!;
      this.inUse += waiter.weight;
      waiter.detach();
      waiter.resolve(this.makeRelease(waiter.weight));
    }
  }

  private validateWeight(weight: number): void {
    if (!Number.isInteger(weight) || weight < 1) {
      throw new RangeError("weight must be a positive integer");
    }
    if (weight > this.permits) {
      throw new RangeError(`weight ${weight} exceeds permits ${this.permits}`);
    }
  }

  /** Take `weight` permits immediately, or return `null` without waiting. */
  tryAcquire(weight = 1): Release | null {
    this.validateWeight(weight);
    if (this.queue.length === 0 && weight <= this.available) {
      this.inUse += weight;
      return this.makeRelease(weight);
    }
    return null;
  }

  /** Wait for `weight` permits, then resolve with a {@link Release}. */
  acquire(options: AcquireOptions = {}): Promise<Release> {
    const weight = options.weight ?? 1;
    const { signal } = options;

    return new Promise<Release>((resolve, reject) => {
      try {
        this.validateWeight(weight);
      } catch (err) {
        return reject(err);
      }
      if (signal?.aborted) return reject(abortError(signal));

      const waiter: Waiter = {
        weight,
        resolve,
        reject,
        detach: () => signal?.removeEventListener("abort", onAbort),
      };
      const onAbort = () => {
        const i = this.queue.indexOf(waiter);
        if (i !== -1) this.queue.splice(i, 1);
        waiter.detach();
        reject(abortError(signal));
        this.pump();
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      this.queue.push(waiter);
      this.pump();
    });
  }

  /** Acquire, run `fn`, and release automatically (even on throw). */
  async runExclusive<T>(fn: () => Promise<T> | T, options: AcquireOptions = {}): Promise<T> {
    const release = await this.acquire(options);
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
