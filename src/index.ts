/**
 * mutexkit — a fair async Mutex and counting Semaphore with weighted permits,
 * `runExclusive`, and AbortSignal support. Zero dependencies.
 *
 * @packageDocumentation
 */

export { Semaphore, type Release, type AcquireOptions } from "./semaphore.js";
export { Mutex, type LockOptions } from "./mutex.js";
