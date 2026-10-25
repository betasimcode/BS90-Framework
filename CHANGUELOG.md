# Changelog

All notable changes to this project will be documented in this file.

---

## [0.1.0] - 2026-07-06

### Added

- Initial project structure.
- Time module.
- Lap module.
- Sector module.
- Timing service.
- Track database support.

### Sector System

- Current sector detection.
- Last sector storage.
- Accumulated sector time.
- Finish line freeze.
- Dynamic sector count support.

### Relative

- Initial Relative service.
- Player detection.
- Driver information lookup.
- Relative car model.
- Ahead / Behind detection.
- Race Progress calculations.

### Internal

- Modular framework architecture.
- Public API definition.
- Internal state management.

---

## Unreleased — Sector Deltas

### Added

- Initial `BS90.Delta` module on `feature/sector-deltas`.
- Public accessors for sector delta and cumulative delta against `bestLap` and `FastestLap`.
- Explicit `null` values where reference sector timing isn't available.

### Notes

- Sector-time reference property names must be validated in SimHub against the active iRacing data provider before relying on live values.
- Positive delta means slower than reference; negative delta means faster.
