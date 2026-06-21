import { describe, expect, it } from "vitest";
import { Mutex } from "../src/mutex.js";

const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

describe("Mutex", () => {
  it("serializes critical sections (one at a time)", async () => {
    const mutex = new Mutex();
    let active = 0;
    let max = 0;
    await Promise.all(
      Array.from({ length: 10 }, () =>
        mutex.runExclusive(async () => {
          active++;
          max = Math.max(max, active);
          await tick();
          active--;
        }),
      ),
    );
    expect(max).toBe(1);
  });

  it("reports isLocked", async () => {
    const mutex = new Mutex();
    expect(mutex.isLocked).toBe(false);
    const release = await mutex.acquire();
    expect(mutex.isLocked).toBe(true);
    release();
    expect(mutex.isLocked).toBe(false);
  });

  it("preserves call order", async () => {
    const mutex = new Mutex();
    const order: number[] = [];
    const r0 = await mutex.acquire();
    const a = mutex.runExclusive(async () => order.push(1));
    const b = mutex.runExclusive(async () => order.push(2));
    r0();
    await Promise.all([a, b]);
    expect(order).toEqual([1, 2]);
  });

  it("tryAcquire returns null while locked", async () => {
    const mutex = new Mutex();
    const r = mutex.tryAcquire();
    expect(r).toBeTypeOf("function");
    expect(mutex.tryAcquire()).toBeNull();
    r!();
    expect(mutex.tryAcquire()).toBeTypeOf("function");
  });

  it("releases on throw so the next holder proceeds", async () => {
    const mutex = new Mutex();
    await expect(
      mutex.runExclusive(async () => {
        throw new Error("x");
      }),
    ).rejects.toThrow("x");
    expect(mutex.isLocked).toBe(false);
    expect(await mutex.runExclusive(async () => "ok")).toBe("ok");
  });

  it("supports abort while waiting", async () => {
    const mutex = new Mutex();
    const held = await mutex.acquire();
    const ac = new AbortController();
    const p = mutex.acquire({ signal: ac.signal });
    ac.abort();
    await expect(p).rejects.toBeDefined();
    held();
  });
});
