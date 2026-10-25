//----------------------------------------------------------
// BS90.Delta
// Session-best and personal-best sector deltas.
// The active provider must expose reference sector times.
// Units: seconds.
//----------------------------------------------------------

(function (global)
{
    "use strict";

    if (!global.BS90)
        global.BS90 = {};

    const BS90 = global.BS90;
    BS90.Delta = BS90.Delta || {};

    const State = {
        initialized: false,
        identity: null,
        completedLaps: null,
        sectorNumber: null,
        sectorStartSessionTime: null,
        lapStartSessionTime: null,
        lastCompleted: null,
        bestLap: { sector: null, cumulative: null },
        FastestLap: { sector: null, cumulative: null }
    };

    function finiteNumber(value)
    {
        if (value === null || value === undefined || value === "")
            return null;

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function positiveNumber(value)
    {
        const parsed = finiteNumber(value);
        return parsed !== null && parsed > 0 ? parsed : null;
    }

    function read(path)
    {
        return $prop(path);
    }

    function currentSectorNumber()
    {
        if (!BS90.Data || typeof BS90.Data.CurrentSectorIndex !== "function")
            return null;

        const index = finiteNumber(BS90.Data.CurrentSectorIndex());
        return index !== null && index >= 0 ? Math.floor(index) + 1 : null;
    }

    function sectorReference(kind, sectorNumber)
    {
        // These candidate names are deliberately isolated here: they must
        // be matched to the exact properties provided by the active SimHub
        // data plugin. Never treat SectorStartPct as a reference time.
        const padded = String(sectorNumber).padStart(2, "0");
        const sectorRoot =
            "DataCorePlugin.GameRawData.SessionData.SplitTimeInfo.Sectors" +
            padded;

        const paths = kind === "bestLap"
            ? [
                sectorRoot + ".BestSectorTime",
                "IRacingExtraProperties.SpectatedCar_BestSectorTime" + sectorNumber,
                "DataCorePlugin.GameRawData.Telemetry.PlayerBestSectorTime" + sectorNumber
            ]
            : [
                sectorRoot + ".FastestSectorTime",
                "IRacingExtraProperties.SpectatedCar_FastestSectorTime" + sectorNumber,
                "DataCorePlugin.GameRawData.Telemetry.FastestSectorTime" + sectorNumber
            ];

        for (let i = 0; i < paths.length; i++)
        {
            const value = positiveNumber(read(paths[i]));
            if (value !== null)
                return value;
        }

        return null;
    }

    function referenceSectors(kind, sectorNumber)
    {
        const values = [];

        for (let i = 1; i <= sectorNumber; i++)
        {
            const value = sectorReference(kind, i);
            if (value === null)
                return null;

            values.push(value);
        }

        return values;
    }

    function total(values)
    {
        return values.reduce((sum, value) => sum + value, 0);
    }

    function snapshot()
    {
        return {
            sector: State.sectorNumber,
            bestLap: {
                sector: State.bestLap.sector,
                cumulative: State.bestLap.cumulative
            },
            FastestLap: {
                sector: State.FastestLap.sector,
                cumulative: State.FastestLap.cumulative
            },
            lastCompleted: State.lastCompleted
        };
    }

    function resetLap(sessionTime, completedLaps, sectorNumber)
    {
        State.completedLaps = completedLaps;
        State.sectorNumber = sectorNumber;
        State.sectorStartSessionTime = sessionTime;
        State.lapStartSessionTime = sessionTime;
        State.bestLap = { sector: null, cumulative: null };
        State.FastestLap = { sector: null, cumulative: null };
    }

    BS90.Delta.Update = function ()
    {
        const sessionTime = finiteNumber(read(
            "DataCorePlugin.GameRawData.Telemetry.SessionTime"
        ));
        const lapTime = finiteNumber(read(
            "DataCorePlugin.GameData.CurrentLapTime"
        ));
        const completedLaps = finiteNumber(read(
            "DataCorePlugin.GameData.CompletedLaps"
        ));
        const identity = String(
            read("IRacingExtraProperties.SpectatedCar_Name") ?? ""
        );
        const sectorNumber = currentSectorNumber();

        if (sessionTime === null || sectorNumber === null)
            return snapshot();

        if (!State.initialized || identity !== State.identity)
        {
            State.initialized = true;
            State.identity = identity;
            resetLap(sessionTime, completedLaps, sectorNumber);
            return snapshot();
        }

        if (
            completedLaps !== null &&
            State.completedLaps !== null &&
            completedLaps !== State.completedLaps
        )
        {
            State.lastCompleted = snapshot();
            resetLap(sessionTime, completedLaps, sectorNumber);
            return snapshot();
        }

        if (sectorNumber !== State.sectorNumber)
        {
            State.sectorNumber = sectorNumber;
            State.sectorStartSessionTime = sessionTime;
            State.bestLap.sector = null;
            State.FastestLap.sector = null;
        }

        const sectorElapsed = sessionTime - State.sectorStartSessionTime;
        const lapElapsed = lapTime !== null && lapTime >= 0
            ? lapTime
            : sessionTime - State.lapStartSessionTime;

        if (sectorElapsed < 0 || lapElapsed < 0)
            return snapshot();

        const bestReference = sectorReference("bestLap", sectorNumber);
        const fastestReference = sectorReference("FastestLap", sectorNumber);
        const bestSectors = referenceSectors("bestLap", sectorNumber);
        const fastestSectors = referenceSectors("FastestLap", sectorNumber);

        State.bestLap.sector = bestReference === null
            ? null
            : sectorElapsed - bestReference;
        State.FastestLap.sector = fastestReference === null
            ? null
            : sectorElapsed - fastestReference;

        State.bestLap.cumulative = bestSectors === null
            ? null
            : lapElapsed - total(bestSectors);
        State.FastestLap.cumulative = fastestSectors === null
            ? null
            : lapElapsed - total(fastestSectors);

        return snapshot();
    };

    BS90.Delta.Get = function ()
    {
        return snapshot();
    };

    BS90.Delta.SectorToBestLap = function ()
    {
        return BS90.Delta.Update().bestLap.sector;
    };

    BS90.Delta.SectorToFastestLap = function ()
    {
        return BS90.Delta.Update().FastestLap.sector;
    };

    BS90.Delta.CumulativeToBestLap = function ()
    {
        return BS90.Delta.Update().bestLap.cumulative;
    };

    BS90.Delta.CumulativeToFastestLap = function ()
    {
        return BS90.Delta.Update().FastestLap.cumulative;
    };

})(globalThis);
