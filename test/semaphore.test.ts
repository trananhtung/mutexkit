import { describe, expect, it } from "vitest";
import { Semaphore } from "../src/semaphore.js";

const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

describe("Semaphore", () => {
  it("rejects invalid permits", () => {
    expect(() => new Semaphore(0)).toThrow(RangeError);
    expect(() => new Semaphore(1.5)).toThrow(RangeError);
  });

  it("limits concurrency to the permit count", async () => {
    const sem = new Semaphore(3);
    let active = 0;
    let max = 0;
    await Promise.all(
      Array.from({ length: 20 }, () =>
        sem.runExclusive(async () => {
          active++;
          max = Math.max(max, active);
          await tick();
          active--;
        }),
      ),
    );
    expect(max).toBe(3);
    expect(sem.available).toBe(3); // all released
  });

  it("serves waiters in FIFO order", async () => {
    const sem = new Semaphore(1);
    const order: number[] = [];
    const r0 = await sem.acquire();
    const a = sem.runExclusive(async () => order.push(1));
    const b = sem.runExclusive(async () => order.push(2));
    const c = sem.runExclusive(async () => order.push(3));
    r0();
    await Promise.all([a, b, c]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("supports weighted acquisition", async () => {
    const sem = new Semaphore(5);
    const r = await sem.acquire({ weight: 3 });
    expect(sem.available).toBe(2);
    expect(sem.tryAcquire(3)).toBeNull(); // only 2 left
    r();
    expect(sem.available).toBe(5);
  });

  it("rejects a weight greater than permits", async () => {
    const sem = new Semaphore(2);
    await expect(sem.acquire({ weight: 3 })).rejects.toThrow(RangeError);
  });

  it("tryAcquire returns a release or null", () => {
    const sem = new Semaphore(1);
    const r = sem.tryAcquire();
    expect(r).toBeTypeOf("function");
    expect(sem.tryAcquire()).toBeNull();
    r!();
    expect(sem.available).toBe(1);
  });

  it("release is idempotent (no over-release)", () => {
    const sem = new Semaphore(1);
    const r = sem.tryAcquire()!;
    r();
    r();
    expect(sem.available).toBe(1);
  });

  it("runExclusive releases even when fn throws", async () => {
    const sem = new Semaphore(1);
    await expect(
      sem.runExclusive(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(sem.available).toBe(1); // released despite the throw
  });

  it("rejects a queued acquire on abort and frees the queue", async () => {
    const sem = new Semaphore(1);
    const held = await sem.acquire();
    const ac = new AbortController();
    const p = sem.acquire({ signal: ac.signal });
    ac.abort();
    await expect(p).rejects.toBeDefined();
    expect(sem.pending).toBe(0);
    held();
  });

  it("does not let tryAcquire jump ahead of waiters", async () => {
    const sem = new Semaphore(1);
    const held = await sem.acquire();
    const waiting = sem.acquire(); // queued
    expect(sem.tryAcquire()).toBeNull(); // must not skip the waiter
    held();
    (await waiting)();
  });
});
