//----------------------------------------------------------
// BS90.Delta
// Personal-best deltas using BS90.Sectors and BS90.Lap.
// Units: seconds. Positive = slower, negative = faster.
// Session-fastest deltas remain unavailable until actual sector
// splits for the session's fastest lap are provided by a source.
//----------------------------------------------------------

(function (global)
{
    "use strict";

    if (!global.BS90) global.BS90 = {};
    const BS90 = global.BS90;
    BS90.Delta = BS90.Delta || {};

    const State = {
        initialized: false,
        seenLapNumber: null,
        bestLap: null,
        lastCompleted: null,
        status: "Waiting for telemetry",
        sector: null,
        bestSectorDelta: null,
        bestCumulativeDelta: null
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
            const sector = lap.sectors[i];
            if (!sector || number(sector.sector) !== i + 1 ||
                !(number(sector.time) > 0) ||
                !(number(sector.accumulated) > 0)) return false;
            sum += number(sector.time);
        }
        return Math.abs(sum - lap.lapTime) < 0.25;
    }

    function cloneLap(lap)
    {
        return {
            number: lap.number,
            lapTime: lap.lapTime,
            sectors: lap.sectors.map(function (sector)
            {
                return {
                    sector: sector.sector,
                    time: sector.time,
                    accumulated: sector.accumulated
                };
            })
        };
    }

    function captureCompletedLap()
    {
        const lapState = BS90.Lap && BS90.Lap.State;
        if (!lapState || !lapState.current || !lapState.previous) return;

        const currentNumber = number(lapState.current.number);
        if (currentNumber === null) return;

        if (State.seenLapNumber === null)
        {
            State.seenLapNumber = currentNumber;
            return;
        }
        if (currentNumber === State.seenLapNumber) return;

        State.seenLapNumber = currentNumber;
        const completed = cloneLap(lapState.previous);

        if (!validLap(completed))
        {
            State.lastCompleted = {
                lapTime: completed.lapTime || null,
                sectors: completed.sectors.length,
                valid: false
            };
            return;
        }

        State.lastCompleted = {
            lapTime: completed.lapTime,
            sectors: completed.sectors.length,
            valid: true
        };

        if (!State.bestLap || completed.lapTime < State.bestLap.lapTime)
            State.bestLap = completed;
    }

    function lapElapsed(sectorsState, sessionTime)
    {
        if (sectorsState.freeze && sessionTime < sectorsState.freezeUntil)
            return number(sectorsState.freezeAccumulated);

        const accumulated = number(sectorsState.accumulatedSectorTime);
        const current = number(sectorsState.currentSectorTime);
        return accumulated === null || current === null
            ? null : accumulated + current;
    }

    function snapshot()
    {
        return {
            sector: State.sector,
            bestLap: {
                sector: State.bestSectorDelta,
                cumulative: State.bestCumulativeDelta
            },
            sessionFastest: { sector: null, cumulative: null },
            lastCompleted: State.lastCompleted,
            personalBestLapTime: State.bestLap ? State.bestLap.lapTime : null,
            status: State.status
        };
    }

    BS90.Delta.Update = function ()
    {
        if (!BS90.Sectors || typeof BS90.Sectors.Update !== "function" ||
            !BS90.Lap || !BS90.Lap.State)
        {
            State.status = "BS90.Sectors or BS90.Lap unavailable";
            return snapshot();
        }

        BS90.Sectors.Update();
        captureCompletedLap();

        const sectorsState = BS90.Sectors.State;
        const sessionTime = number(read(
            "DataCorePlugin.GameRawData.Telemetry.SessionTime"
        ));

        if (!sectorsState || sessionTime === null || !sectorsState.initialized)
        {
            State.status = "Waiting for telemetry";
            return snapshot();
        }

        const elapsed = lapElapsed(sectorsState, sessionTime);
        const isFrozenFinish = sectorsState.freeze &&
            sessionTime < sectorsState.freezeUntil;
        let sectorNumber = number(sectorsState.currentSector);
        const currentSectorTime = number(sectorsState.currentSectorTime);

        // The sector tracker resets to sector 1 at the finish line. While
        // displaying the frozen completed lap, keep the display on its final sector.
        if (isFrozenFinish && State.bestLap)
            sectorNumber = State.bestLap.sectors.length;

        State.sector = sectorNumber;

        if (elapsed === null || sectorNumber === null || currentSectorTime === null)
        {
            State.status = "Invalid sector timing";
            return snapshot();
        }

        if (!State.bestLap)
        {
            State.bestSectorDelta = null;
            State.bestCumulativeDelta = null;
            State.status = "Waiting for first valid completed lap";
            return snapshot();
        }

        const reference = State.bestLap.sectors[sectorNumber - 1];
        if (!reference)
        {
            State.bestSectorDelta = null;
            State.bestCumulativeDelta = null;
            State.status = "Sector count differs from personal best";
            return snapshot();
        }

        // In the final sector, the sector delta intentionally shows whole-lap gap.
        State.bestSectorDelta = sectorNumber === State.bestLap.sectors.length
            ? elapsed - State.bestLap.lapTime
            : currentSectorTime - reference.time;
        State.bestCumulativeDelta = elapsed - reference.accumulated;
        State.status = "OK (personal best); session fastest unavailable";
        return snapshot();
    };

    BS90.Delta.Get = function () { return snapshot(); };
    BS90.Delta.Status = function () { return BS90.Delta.Update().status; };
    BS90.Delta.SectorToBestLap = function () { return BS90.Delta.Update().bestLap.sector; };
    BS90.Delta.CumulativeToBestLap = function () { return BS90.Delta.Update().bestLap.cumulative; };
    BS90.Delta.SectorToFastestLap = function () { BS90.Delta.Update(); return null; };
    BS90.Delta.CumulativeToFastestLap = function () { BS90.Delta.Update(); return null; };

})(globalThis);
