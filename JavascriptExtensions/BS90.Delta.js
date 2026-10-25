//----------------------------------------------------------
// BS90.Delta
// Personal-best delta snapshots at completed sector splits.
// Positive = slower; negative = faster. Display format: +/-0.0
//----------------------------------------------------------

(function (global)
{
    "use strict";
    if (!global.BS90) global.BS90 = {};
    const BS90 = global.BS90;
    BS90.Delta = BS90.Delta || {};

    const SPLIT_FREEZE_SECONDS = 3;
    const FINISH_FREEZE_SECONDS = 8;
    const State = {
        initialized: false,
        seenLapNumber: null,
        seenSectorCount: 0,
        bestLap: null,
        lastCompleted: null,
        status: "Waiting for telemetry",
        sector: null,
        bestSectorDelta: null,
        bestCumulativeDelta: null,
        frozenUntil: 0,
        frozenSector: null,
        frozenCumulative: null
    };

    function read(path) {
        try { return $prop(path); } catch (error) { return null; }
    }

    function number(value) {
        if (value === null || value === undefined || value === "") return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }

    function validLap(lap) {
        if (!lap || !Array.isArray(lap.sectors) || !lap.sectors.length ||
            !(number(lap.lapTime) > 0)) return false;
        let sum = 0;
        for (let i = 0; i < lap.sectors.length; i++) {
            const item = lap.sectors[i];
            if (!item || number(item.sector) !== i + 1 ||
                !(number(item.time) > 0) || !(number(item.accumulated) > 0))
                return false;
            sum += number(item.time);
        }
        return Math.abs(sum - lap.lapTime) < 0.25;
    }

    function cloneLap(lap) {
        return {
            number: lap.number,
            lapTime: lap.lapTime,
            sectors: lap.sectors.map(function (item) {
                return { sector: item.sector, time: item.time, accumulated: item.accumulated };
            })
        };
    }

    function snapshot() {
        const frozen = State.frozenUntil > 0;
        return {
            sector: State.sector,
            bestLap: { sector: State.bestSectorDelta, cumulative: State.bestCumulativeDelta },
            sessionFastest: { sector: null, cumulative: null },
            lastCompleted: State.lastCompleted,
            personalBestLapTime: State.bestLap ? State.bestLap.lapTime : null,
            status: State.status
        };
    }

    function formatDelta(value) {
        const n = number(value);
        if (n === null) return "--.-";
        const rounded = Math.abs(n) < 0.05 ? 0 : n;
        return (rounded > 0 ? "+" : rounded < 0 ? "-" : "") +
            Math.abs(rounded).toFixed(1);
    }

    function captureCompletedLap() {
        const lapState = BS90.Lap && BS90.Lap.State;
        if (!lapState || !lapState.current || !lapState.previous) return false;
        const currentNumber = number(lapState.current.number);
        if (currentNumber === null) return false;
        if (State.seenLapNumber === null) {
            State.seenLapNumber = currentNumber;
            return false;
        }
        if (currentNumber === State.seenLapNumber) return false;

        State.seenLapNumber = currentNumber;
        const completed = cloneLap(lapState.previous);
        const oldBest = State.bestLap;
        const isValid = validLap(completed);

        State.lastCompleted = {
            lapTime: completed.lapTime || null,
            sectors: completed.sectors.length,
            valid: isValid
        };

        if (isValid && oldBest) {
            State.sector = completed.sectors.length;
            State.bestSectorDelta = completed.lapTime - oldBest.lapTime;
            State.bestCumulativeDelta = completed.lapTime - oldBest.lapTime;
            State.frozenSector = State.bestSectorDelta;
            State.frozenCumulative = State.bestCumulativeDelta;
        }

        if (isValid && (!State.bestLap || completed.lapTime < State.bestLap.lapTime))
            State.bestLap = completed;

        return true;
    }

    BS90.Delta.Update = function () {
        if (!BS90.Sectors || typeof BS90.Sectors.Update !== "function" ||
            !BS90.Lap || !BS90.Lap.State) {
            State.status = "BS90.Sectors or BS90.Lap unavailable";
            return snapshot();
        }

        BS90.Sectors.Update();
        const s = BS90.Sectors.State;
        const sessionTime = number(read("DataCorePlugin.GameRawData.Telemetry.SessionTime"));
        if (!s || sessionTime === null || !s.initialized) {
            State.status = "Waiting for telemetry";
            return snapshot();
        }

        const wasLapNumber = State.seenLapNumber;
        const completedLap = captureCompletedLap();
        if (completedLap) {
            State.seenSectorCount = 0;
            State.frozenUntil = sessionTime + FINISH_FREEZE_SECONDS;
        }

        if (State.frozenUntil > sessionTime) {
            State.bestSectorDelta = State.frozenSector;
            State.bestCumulativeDelta = State.frozenCumulative;
            State.status = "Frozen split delta";
            return snapshot();
        }
        State.frozenUntil = 0;

        const current = BS90.Lap.State.current;
        const sectors = current && Array.isArray(current.sectors) ? current.sectors : [];
        const count = sectors.length;

        // A completed sector has just been appended by BS90.Sectors.
        if (!completedLap && State.initialized && count > State.seenSectorCount && State.bestLap) {
            const completedSector = sectors[count - 1];
            const reference = State.bestLap.sectors[count - 1];
            if (completedSector && reference) {
                State.sector = completedSector.sector;
                State.bestSectorDelta = count === State.bestLap.sectors.length
                    ? number(completedSector.accumulated) - State.bestLap.lapTime
                    : number(completedSector.time) - number(reference.time);
                State.bestCumulativeDelta =
                    number(completedSector.accumulated) - number(reference.accumulated);
                State.frozenSector = State.bestSectorDelta;
                State.frozenCumulative = State.bestCumulativeDelta;
                State.frozenUntil = sessionTime + SPLIT_FREEZE_SECONDS;
                State.seenSectorCount = count;
                State.status = "Frozen split delta";
                return snapshot();
            }
        }

        State.seenSectorCount = count;
        State.sector = number(s.currentSector);

        if (!State.bestLap) {
            State.bestSectorDelta = null;
            State.bestCumulativeDelta = null;
            State.status = "Waiting for first valid completed lap";
            State.initialized = true;
            return snapshot();
        }

        // Between splits, retain the last completed-sector delta rather than
        // continuously changing the displayed result.
        State.status = "Ready; waiting for next sector split";
        State.initialized = true;
        return snapshot();
    };

    BS90.Delta.Get = function () { return snapshot(); };
    BS90.Delta.Status = function () { return BS90.Delta.Update().status; };
    BS90.Delta.Format = formatDelta;
    BS90.Delta.SectorToBestLap = function () { return BS90.Delta.Update().bestLap.sector; };
    BS90.Delta.CumulativeToBestLap = function () { return BS90.Delta.Update().bestLap.cumulative; };
    BS90.Delta.SectorToBestLapFormatted = function () {
        return formatDelta(BS90.Delta.Update().bestLap.sector);
    };
    BS90.Delta.CumulativeToBestLapFormatted = function () {
        return formatDelta(BS90.Delta.Update().bestLap.cumulative);
    };
    BS90.Delta.SectorToFastestLap = function () { BS90.Delta.Update(); return null; };
    BS90.Delta.CumulativeToFastestLap = function () { BS90.Delta.Update(); return null; };
    BS90.Delta.SectorToFastestLapFormatted = function () { BS90.Delta.Update(); return "--.-"; };
    BS90.Delta.CumulativeToFastestLapFormatted = function () { BS90.Delta.Update(); return "--.-"; };

})(globalThis);
