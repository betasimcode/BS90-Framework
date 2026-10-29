# BS90 Framework

> Modular JavaScript framework for SimHub dashboards, focused on realism, performance and reusable components.

![Status](https://img.shields.io/badge/status-alpha-orange)
![Platform](https://img.shields.io/badge/platform-SimHub-blue)
![Simulator](https://img.shields.io/badge/simulator-iRacing-red)

---

## About

BS90 Framework is a modular JavaScript framework developed for SimHub.

Instead of creating dashboards as a collection of independent widgets, BS90 provides reusable services and modules that can be shared between dashboards.

The long-term goal is to build a complete framework capable of powering multiple dashboard layouts while keeping a single, consistent codebase.

Current development is focused on iRacing.

---

## Current Modules

### Core

- BS90.Time
- BS90.Items
- BS90.Lap
- BS90.Sectors
- BS90.Delta
- BS90.Relative

### Services

- BS90.Services.Timing

### Data

- BS90.Data.Tracks

---

## Current Features

### Sectors

- Automatic sector detection
- Multi-sector track support
- Current sector timer
- Last sector time
- Sector accumulated time
- Finish line freeze
- Integration with Lap service

### Timing

- Current lap timer
- Gap to best lap
- Automatic 5-second freeze after crossing finish line

### Timing items and precision

`BS90.Items` exposes dashboard-ready timing values with a consistent naming convention. Suffixes `1`, `2`, and `3` select one, two, or three displayed decimals. Values are kept at full precision internally; formatting truncates rather than rounds.

```javascript
BS90.Items.LastTime1()
BS90.Items.BestTime2()
BS90.Items.FastestTime3()
BS90.Items.SectorActual()
BS90.Items.SectorTime2()
BS90.Items.SplitGapBest2()
BS90.Items.DeltaBest3()
```

Available items:

- `LastTime1/2/3()`: last completed lap time
- `BestTime1/2/3()`: personal best lap time
- `FastestTime1/2/3()`: best lap time for the current iRacing class, read from `IRacingExtraProperties.iRacing_ClassLeaderboard_Driver_00_BestLapTime`
- `SectorActual()`: current sector number
- `SectorTime1/2/3()`: running time in the current sector
- `SplitGapBest1/2/3()`: completed-sector gap against the personal best lap
- `DeltaBest1/2/3()`: cumulative gap against the personal best lap

Session-fastest sector gaps and deltas are intentionally deferred until suitable sector-reference data is identified.

The existing `BS90.Time.Format()`, `Format2()`, `Gap()`, and `Gap1()` helpers remain available for backward compatibility.

### Delta

- Sector delta against the driver's best completed lap
- Cumulative delta using only sectors completed in the current lap
- Split result frozen for 3 seconds; finish result frozen for 8 seconds
- Signed format: positive means slower, negative means faster
- Color helpers for neutral, slower, faster and personal-best lap results
- Color decisions are centralized in BS90.Delta; widgets only apply the returned color
- `BS90.Delta.SectorColor()` and `BS90.Delta.CumulativeColor()` return ARGB colors for their respective values
- `BS90.Delta.ColorForDelta(value)` returns a color for any numeric delta, or the unavailable color for missing values
- `BS90.Delta.ColorPalette()` returns a copy of the active palette: `neutral`, `slower`, `faster`, `fastest`, and `unavailable`
- Default palette: neutral `#FF444444`, slower `#FFFFB52E`, faster `#FF00FF02`, personal-best lap `#FFC500CE`, unavailable `#FF777777`
- Neutral threshold is 0.05 seconds; it is independent of the one-decimal display formatter
- Session-fastest comparison is intentionally unavailable until a real completed-lap reference is implemented

Example:

```javascript
BS90.Delta.SectorToBestLapFormatted()
BS90.Delta.CumulativeToBestLapFormatted()
BS90.Delta.SectorColor()
BS90.Delta.CumulativeColor()
```

Delta values are updated from telemetry when a public getter is called. Repeated calls in the same telemetry tick are deduplicated.

### Relative (Work in Progress)

Current implementation:

- Player detection
- Driver information
- Relative cars list
- Ahead / Behind detection
- Race Progress mode

In development:

- Track Relative
- Class Relative
- Gap calculation
- Multi-class support

---

## Design Principles

The framework follows a modular architecture.

Every module should:

- Have a single responsibility.
- Avoid duplicated code.
- Expose a clean public API.
- Keep internal state private whenever possible.

The goal is that a dashboard only consumes the framework.

Example:

```javascript
BS90.Relative.Ahead().userName

BS90.Sectors.CurrentTime()

BS90.Services.Timing.CurrentLapTimeGapToBest()
```

---

## Current Status

Current version should be considered **Alpha**.

The API may change while core systems are being designed.

The focus at this stage is architecture rather than feature completeness.

---

## Roadmap

- Complete Relative module
- Fuel module
- Pit strategy
- Session module
- Leaderboards
- Radar
- Overlay support
- Dashboard templates

---

## Requirements

- SimHub
- iRacing

---

## License

Currently under development.

License will be defined before the first public release.

---

## Author

BetaSimCode