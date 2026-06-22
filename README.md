# mutexkit

[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)

> Fair async **Mutex** and counting **Semaphore** — weighted permits, `runExclusive`, and **`AbortSignal`** support. **Zero dependencies**.

[![CI](https://github.com/trananhtung/mutexkit/actions/workflows/ci.yml/badge.svg)](https://github.com/trananhtung/mutexkit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/mutexkit.svg)](https://www.npmjs.com/package/mutexkit)
[![bundle size](https://img.shields.io/bundlephobia/minzip/mutexkit)](https://bundlephobia.com/package/mutexkit)
[![types](https://img.shields.io/npm/types/mutexkit.svg)](https://www.npmjs.com/package/mutexkit)
[![license](https://img.shields.io/npm/l/mutexkit.svg)](./LICENSE)

JavaScript is single-threaded, but `async` still interleaves — two handlers can
read-modify-write the same resource between `await`s and corrupt it. `mutexkit`
gives you a **lock** to serialize a critical section, and a **semaphore** to cap
how many things touch a resource at once.

```ts
import { Mutex } from "mutexkit";

const mutex = new Mutex();

// No matter how many callers, the file is appended to one at a time, in order.
await mutex.runExclusive(() => appendLine(file, line));
```

## Why mutexkit?

- **Mutex & Semaphore in one tiny package.** `Mutex` for one-at-a-time; `Semaphore(n)`
  for at-most-`n`.
- **`runExclusive` does the right thing.** Acquires, runs your function, and
  **always releases** — even if it throws.
- **Weighted permits.** Charge more than one permit per acquire (e.g. memory-sized
  jobs against a budget).
- **Fair & cancellable.** FIFO ordering so nobody starves; pass an `AbortSignal` to
  give up waiting. `release()` is idempotent — double-calling never over-releases.
- **Zero dependencies**, ESM + CJS + types.

## Install

```bash
npm install mutexkit
# or: pnpm add mutexkit  /  yarn add mutexkit  /  bun add mutexkit
```

## API

### `Mutex`

```ts
const mutex = new Mutex();

await mutex.runExclusive(async () => { /* critical section */ });

const release = await mutex.acquire();   // manual form
try { /* ... */ } finally { release(); }

mutex.tryAcquire();  // Release | null (null if held)
mutex.isLocked;      // boolean
mutex.pending;       // queued waiters
```

`acquire` / `runExclusive` accept `{ signal }` to cancel a wait.

### `Semaphore`

```ts
import { Semaphore } from "mutexkit";

const sem = new Semaphore(5); // at most 5 concurrent

await Promise.all(tasks.map((t) => sem.runExclusive(() => t())));

const release = await sem.acquire({ weight: 2 }); // take 2 permits
release();

sem.tryAcquire(2); // Release | null
sem.available;     // free permits
sem.pending;       // queued waiters
```

`acquire` / `runExclusive` accept `{ signal, weight }`.

## When to reach for which

| Need                                              | Use                          |
| ------------------------------------------------- | ---------------------------- |
| Only one execution of a critical section at a time | `Mutex`                      |
| At most *N* concurrent                            | `Semaphore(N)`               |
| Cap concurrency while mapping a list              | [`runpool`](https://www.npmjs.com/package/runpool) |
| Cap *rate* (per second)                           | [`ratebucket`](https://www.npmjs.com/package/ratebucket) |

## Contributors ✨

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind are welcome — code, docs, bug reports, ideas, reviews! See the [emoji key](https://allcontributors.org/docs/en/emoji-key) for how each contribution is recognized, and open a PR or issue to get involved.

Thanks goes to these wonderful people:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/trananhtung"><img src="https://avatars.githubusercontent.com/u/30992229?v=4?s=100" width="100px;" alt="Tung Tran"/><br /><sub><b>Tung Tran</b></sub></a><br /><a href="https://github.com/trananhtung/mutexkit/commits?author=trananhtung" title="Code">💻</a> <a href="#maintenance-trananhtung" title="Maintenance">🚧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## License

[MIT](./LICENSE) © Tung Tran
