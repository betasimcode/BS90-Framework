//----------------------------------------------------------
// BS90.Delta
// Deltas against the driver's best completed lap.
// Positive = slower; negative = faster.
// Split results are frozen until the next split (or timeout).
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

    function read(path)
    {
        try { return $prop(path); }
        catch (error) { return null; }
    }

    function number(value)
    {
        if (value === null || value === undefined || value === "") return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }

    function validLap(lap)
    {
        if (!lap || !Array.isArray(lap.sectors) || lap.sectors.length === 0 ||
            !(number(lap.lapTime) > 0)) return false;

        let sum = 0;
        for (let i = 0; i < lap.sectors.length; i++)
        {
            const item = lap.sectors[i];
            if (!item || number(item.sector) !== i + 1 ||
                !(number(item.time) > 0) || !(number(item.accumulated) > 0))
                return false;
            sum += number(item.time);
        }

        return Math.abs(sum - number(lap.lapTime)) < 0.25;
    }

    function cloneLap(lap)
    {
        return {
            number: lap.number,
            lapTime: lap.lapTime,
            sectors: lap.sectors.map(function (item)
            {
                return {
                    sector: item.sector,
                    time: item.time,
                    accumulated: item.accumulated
                };
            })
        };
    }

    function snapshot()
    {
        return {
            sector: State.sector,
            bestLap: {
                sector: State.bestSectorDelta,
                cumulative: State.bestCumulativeDelta
            },
            // Not fabricated: actual session-fastest sector splits are not available here.
            sessionFastest: { sector: null, cumulative: null },
            lastCompleted: State.lastCompleted,
            personalBestLapTime: State.bestLap ? State.bestLap.lapTime : null,
            status: State.status
        };
    }

    function formatDelta(value)
    {
        const n = number(value);
        if (n === null) return "--.-";

        const rounded = Math.abs(n) < 0.05 ? 0 : n;
        const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
        return sign + Math.abs(rounded).toFixed(1);
    }

    function captureCompletedLap()
    {
        const lapState = BS90.Lap && BS90.Lap.State;
        if (!lapState || !lapState.current || !lapState.previous) return false;

        const currentNumber = number(lapState.current.number);
        if (currentNumber === null) return false;

        if (State.seenLapNumber === null)
        {
            State.seenLapNumber = currentNumber;
            return false;
        }

        if (currentNumber === State.seenLapNumber) return false;

        State.seenLapNumber = currentNumber;
        const completed = cloneLap(lapState.previous);
        const isValid = validLap(completed);
        const previousBest = State.bestLap;

        State.lastCompleted = {
            lapTime: completed.lapTime || null,
            sectors: completed.sectors.length,
            valid: isValid
        };

        if (isValid && previousBest)
        {
            // At the finish line the sector display becomes the whole-lap gap.
            State.sector = completed.sectors.length;
            State.bestSectorDelta = completed.lapTime - previousBest.lapTime;
            State.bestCumulativeDelta = completed.lapTime - previousBest.lapTime;
            State.frozenSector = State.bestSectorDelta;
            State.frozenCumulative = State.bestCumulativeDelta;
        }

        if (isValid && (!State.bestLap || completed.lapTime < State.bestLap.lapTime))
            State.bestLap = completed;

        return true;
    }

    BS90.Delta.Update = function ()
    {
        if (!BS90.Sectors || typeof BS90.Sectors.Update !== "function" ||
            !BS90.Lap || !BS90.Lap.State)
        {
            State.status = "BS90.Sectors or BS90.Lap unavailable";
            return snapshot();
        }

        // Update sector timing once, then inspect the shared lap state.
        BS90.Sectors.Update();

        const sectorsState = BS90.Sectors.State;
        const sessionTime = number(read("DataCorePlugin.GameRawData.Telemetry.SessionTime"));

        if (!sectorsState || sessionTime === null || !sectorsState.initialized)
        {
            State.status = "Waiting for telemetry";
            return snapshot();
        }

        const completedLap = captureCompletedLap();

        if (completedLap)
        {
            State.seenSectorCount = 0;
            State.frozenUntil = sessionTime + FINISH_FREEZE_SECONDS;
            State.status = "Frozen completed-lap delta";
            return snapshot();
        }

        const current = BS90.Lap.State.current;
        const sectors = current && Array.isArray(current.sectors) ? current.sectors : [];
        const count = sectors.length;

        // Process a new split before honoring an existing freeze. This means a
        // fast sector cannot be hidden just because the previous split is frozen.
        if (count > State.seenSectorCount)
        {
            const completedSector = sectors[count - 1];
            State.seenSectorCount = count;

            if (State.bestLap && completedSector)
            {
                const index = number(completedSector.sector) - 1;
                const reference = State.bestLap.sectors[index];

                if (reference)
                {
                    State.sector = number(completedSector.sector);

                    // Final sector reports the whole-lap gap; earlier sectors
                    // report their individual sector gap.
                    State.bestSectorDelta = index === State.bestLap.sectors.length - 1
                        ? number(completedSector.accumulated) - State.bestLap.lapTime
                        : number(completedSector.time) - number(reference.time);

                    State.bestCumulativeDelta =
                        number(completedSector.accumulated) - number(reference.accumulated);

                    State.frozenSector = State.bestSectorDelta;
                    State.frozenCumulative = State.bestCumulativeDelta;
                    State.frozenUntil = sessionTime + SPLIT_FREEZE_SECONDS;
                    State.status = "Frozen split delta";
                    State.initialized = true;
                    return snapshot();
                }
            }
        }

        if (State.frozenUntil > sessionTime)
        {
            State.status = "Frozen split delta";
            return snapshot();
        }

        State.frozenUntil = 0;
        State.sector = number(sectorsState.currentSector);

        if (!State.bestLap)
        {
            State.bestSectorDelta = null;
            State.bestCumulativeDelta = null;
            State.status = "Waiting for first valid completed lap";
        }
        else
        {
            // Keep the last completed-split result; do not continuously recalculate.
            State.status = "Ready; waiting for next sector split";
        }

        State.initialized = true;
        return snapshot();
    };

    BS90.Delta.Get = function () { return snapshot(); };
    BS90.Delta.Status = function () { return BS90.Delta.Update().status; };
    BS90.Delta.Format = formatDelta;

    BS90.Delta.SectorToBestLap = function ()
    {
        return BS90.Delta.Update().bestLap.sector;
    };

    BS90.Delta.CumulativeToBestLap = function ()
    {
        return BS90.Delta.Update().bestLap.cumulative;
    };

    BS90.Delta.SectorToBestLapFormatted = function ()
    {
        return formatDelta(BS90.Delta.Update().bestLap.sector);
    };

    BS90.Delta.CumulativeToBestLapFormatted = function ()
    {
        return formatDelta(BS90.Delta.Update().bestLap.cumulative);
    };

    BS90.Delta.SectorToFastestLap = function () { BS90.Delta.Update(); return null; };
    BS90.Delta.CumulativeToFastestLap = function () { BS90.Delta.Update(); return null; };
    BS90.Delta.SectorToFastestLapFormatted = function () { BS90.Delta.Update(); return "--.-"; };
    BS90.Delta.CumulativeToFastestLapFormatted = function () { BS90.Delta.Update(); return "--.-"; };

})(globalThis);
