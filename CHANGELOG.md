# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-21

### Added

- `Semaphore` — fair (FIFO) counting semaphore with weighted permits, `acquire`,
  `tryAcquire`, `runExclusive`, `available`/`pending`, and `AbortSignal` support.
- `Mutex` — one-at-a-time lock built on `Semaphore(1)` with `acquire`,
  `tryAcquire`, `runExclusive`, and `isLocked`.
- Idempotent `release()` (never over-releases); `runExclusive` releases on throw.
- ESM + CJS builds, types, and CI across Node 18 / 20 / 22.
