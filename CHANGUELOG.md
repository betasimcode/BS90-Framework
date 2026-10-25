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
- Conversion of SimHub `TimeSpan` values to seconds.
- Reference properties mapped to `DataCorePlugin.GameData.SectorNBestLapTime` and `SectorNBestTime`.

### Notes

- Positive delta means slower than reference; negative delta means faster.
- `SectorNBestLapTime` provides sector splits from the best lap.
- `SectorNBestTime` is the best individual sector time, so its cumulative sum is an optimal-sector reference, not necessarily the sector splits of one single session-fastest lap.
- Live validation in SimHub is still required. The first delta value is available after the module has observed a sector transition.
