//----------------------------------------------------------
// BS90.Delta
// Sector and cumulative deltas against lap references.
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
        currentLapStartedAt: null,
        lastSectorStartPct: null,
        lastCompleted: null,
        sectorDeltaBestLap: null,
        sectorDeltaFastestLap: null,
        cumulativeDeltaBestLap: null,
        cumulativeDeltaFastestLap: null
    };

    function number(value)
    {
        if (value === null || value === undefined || value === "")
            return null;

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function positive(value)
    {
        const parsed = number(value);
        return parsed !== null && parsed > 0 ? parsed : null;
    }

    function read(path)
    {
        return number($prop(path));
    }

    function readSectorNumber()
    {
        if (!BS90.Data || typeof BS90.Data.CurrentSectorIndex !== "function")
            return null;

        const index = number(BS90.Data.CurrentSectorIndex());
        return index !== null && index >= 0 ? Math.floor(index) + 1 : null;
    }

    function readSectorReference(kind, sectorNumber)
    {
        // SimHub/iRacing exposes lap-level timing references natively.
        // This function intentionally only reads genuine sector-time
        // properties; sector positions (SectorStartPct) are not times.
        const index = String(sectorNumber).padStart(2, "0");
        const root =
            "DataCorePlugin.GameRawData.SessionData.SplitTimeInfo.Sectors" +
            index;

        const paths = kind === "bestLap"
            ? [
                root + ".BestSectorTime",
                "DataCorePlugin.GameRawData.Telemetry.PlayerBestSectorTime" + sectorNumber,
                "IRacingExtraProperties.SpectatedCar_BestSectorTime" + sectorNumber
            ]
            : [
                root + ".FastestSectorTime",
                "DataCorePlugin.GameRawData.Telemetry.FastestSectorTime" + sectorNumber,
                "IRacingExtraProperties.SpectatedCar_FastestSectorTime" + sectorNumber
            ];

        for (let i = 0; i < paths.length; i++)
        {
            const result = positive($prop(paths[i]));
            if (result !== null)
                return result;
        }

        return null;
    }

    function readReferenceSectors(kind, sectorNumber)
    {
        const sectors = [];
        for (let i = 1; i <= sectorNumber; i++)
        {
            const time = readSectorReference(kind, i);
            if (time === null)
                return null;

            sectors.push(time);
        }
        return sectors;
    }

    function sum(values)
    {
        return values.reduce((total, value) => total + value, 0);
    }

    function resetForLap(sessionTime, completedLaps, sectorNumber)
    {
        State.completedLaps = completedLaps;
        State.sectorNumber = sectorNumber;
        State.sectorStartSessionTime = sessionTime;
        State.currentLapStartedAt = sessionTime;
        State.sectorDeltaBestLap = null;
        State.sectorDeltaFastestLap = null;
        State.cumulativeDeltaBestLap = null;
        State.cumulativeDeltaFastestLap = null;
    }

    function result()
    {
        return {
            sector: State.sectorNumber,
            bestLap: {
                sector: State.sectorDeltaBestLap,
                cumulative: State.cumulativeDeltaBestLap
            },
            FastestLap: {
                sector: State.sectorDeltaFastestLap,
                cumulative: State.cumulativeDeltaFastestLap
            },
            lastCompleted: State.lastCompleted
        };
    }

    BS90.Delta.Update = function ()
    {
        const sessionTime = read(
            "DataCorePlugin.GameRawData.Telemetry.SessionTime"
        );
        const currentLapTime = read("DataCorePlugin.GameData.CurrentLapTime");
        const completedLaps = read("DataCorePlugin.GameData.CompletedLaps");
        const identity = String(
            $prop("IRacingExtraProperties.SpectatedCar_Name") ?? ""
        );
        const sectorNumber = readSectorNumber();

        if (
            sessionTime === null ||
            sectorNumber === null
        )
            return result();

        if (!State.initialized || identity !== State.identity)
        {
            State.initialized = true;
            State.identity = identity;
            resetForLap(sessionTime, completedLaps, sectorNumber);
            return result();
        }

        if (
            completedLaps !== null &&
            State.completedLaps !== null &&
            completedLaps !== State.completedLaps
        )
        {
            State.lastCompleted = result();
            resetForLap(sessionTime, completedLaps, sectorNumber);
            return result();
        }

        if (sectorNumber !== State.sectorNumber)
        {
            State.sectorNumber = sectorNumber;
            State.sectorStartSessionTime = sessionTime;
            State.sectorDeltaBestLap = null;
            State.sectorDeltaFastestLap = null;
        }

        const sectorElapsed = State.sectorStartSessionTime === null
            ? null
            : sessionTime - State.sectorStartSessionTime;

        const currentElapsed = currentLapTime !== null && currentLapTime >= 0
            ? currentLapTime
            : (
                State.currentLapStartedAt === null
                    ? null
                    : sessionTime - State.currentLapStartedAt
            );

        const bestSectors = readReferenceSectors("bestLap", sectorNumber);
        const fastestSectors = readReferenceSectors("FastestLap", sectorNumber);

        if (sectorElapsed !== null && sectorElapsed >= 0)
        {
            const bestCurrentSector = readSectorReference("bestLap", sectorNumber);
            const fastestCurrentSector = readSectorReference("FastestLap", sectorNumber);

            State.sectorDeltaBestLap = bestCurrentSector === null
                ? null
                : sectorElapsed - bestCurrentSector;

            State.sectorDeltaFastestLap = fastestCurrentSector === null
                ? null
                : sectorElapsed - fastestCurrentSector;

            State.cumulativeDeltaBestLap =
                bestSectors === null || currentElapsed === null
                    ? null
                    : currentElapsed - sum(bestSectors);

            State.cumulativeDeltaFastestLap =
                fastestSectors === null || currentElapsed === null
                    ? null
                    : currentElapsed - sum(fastestSectors);
        }

        return result();
    };

    BS90.Delta.Get = function ()
    {
        return result();
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
