//----------------------------------------------------------
// BS90.Delta
// Sector and cumulative deltas against lap references.
// References are supplied by SimHub/iRacing timing properties.
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
        lapNumber: null,
        sectorNumber: null,
        sectorStartSessionTime: null,
        currentSectorDeltaBestLap: null,
        currentSectorDeltaFastestLap: null,
        cumulativeDeltaBestLap: null,
        cumulativeDeltaFastestLap: null,
        lastCompleted: null,
        identity: null
    };

    function finitePositive(value)
    {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? number : null;
    }

    function numeric(value)
    {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function prop(path)
    {
        return $prop(path);
    }

    function readReference(reference, sectorNumber)
    {
        // SplitTimeInfo contains the session's sector reference times.
        // Time is a duration; SectorStartPct is a position and must not
        // be used as a timing value.
        const index = String(sectorNumber).padStart(2, "0");
        const root =
            "DataCorePlugin.GameRawData.SessionData.SplitTimeInfo.Sectors" +
            index;

        const candidates = reference === "bestLap"
            ? [
                root + ".BestSectorTime",
                "DataCorePlugin.GameRawData.Telemetry.PlayerBestSectorTime" + sectorNumber,
                "DataCorePlugin.GameRawData.Telemetry.BestSectorTime" + sectorNumber
            ]
            : [
                root + ".BestSectorTime",
                root + ".FastestSectorTime",
                "DataCorePlugin.GameRawData.Telemetry.FastestSectorTime" + sectorNumber
            ];

        for (let i = 0; i < candidates.length; i++)
        {
            const value = finitePositive(prop(candidates[i]));
            if (value !== null)
                return value;
        }

        return null;
    }

    function referenceLapTime(reference)
    {
        const paths = reference === "bestLap"
            ? [
                "DataCorePlugin.GameData.BestLapTime",
                "IRacingExtraProperties.SpectatedCar_BestLapTime"
            ]
            : [
                "DataCorePlugin.GameData.SessionBestLapTime",
                "DataCorePlugin.GameRawData.SessionData.WeekendInfo.FastestTime"
            ];

        for (let i = 0; i < paths.length; i++)
        {
            const value = finitePositive(prop(paths[i]));
            if (value !== null)
                return value;
        }

        return null;
    }

    function readCurrentSector()
    {
        if (BS90.Data && typeof BS90.Data.CurrentSectorIndex === "function")
        {
            const index = numeric(BS90.Data.CurrentSectorIndex());
            if (index !== null && index >= 0)
                return Math.floor(index) + 1;
        }

        return null;
    }

    function currentSectorStart(sessionTime)
    {
        const lap = BS90.Lap && BS90.Lap.State
            ? BS90.Lap.State.current
            : null;

        if (lap && Array.isArray(lap.sectors) && lap.sectors.length > 0)
        {
            const last = lap.sectors[lap.sectors.length - 1];
            if (last && Number.isFinite(Number(last.accumulated)))
                return sessionTime - Number(last.accumulated);
        }

        return null;
    }

    function compute(reference, sectorNumber, elapsedSector, elapsedCumulative)
    {
        const referenceSector = readReference(reference, sectorNumber);

        if (referenceSector === null || elapsedSector === null)
        {
            return {
                available: false,
                sector: null,
                cumulative: null,
                referenceSector: referenceSector
            };
        }

        const deltaSector = elapsedSector - referenceSector;

        // A cumulative delta can only be calculated correctly from the
        // matching reference sectors. If sector timing data isn't exposed,
        // return null instead of pretending a lap-time difference is a
        // sector-by-sector cumulative delta.
        let referenceCumulative = 0;
        let validCumulative = true;

        for (let i = 1; i <= sectorNumber; i++)
        {
            const sectorTime = readReference(reference, i);
            if (sectorTime === null)
            {
                validCumulative = false;
                break;
            }
            referenceCumulative += sectorTime;
        }

        return {
            available: true,
            sector: deltaSector,
            cumulative: validCumulative && elapsedCumulative !== null
                ? elapsedCumulative - referenceCumulative
                : null,
            referenceSector: referenceSector
        };
    }

    BS90.Delta.Update = function ()
    {
        const sessionTime = numeric(prop(
            "DataCorePlugin.GameRawData.Telemetry.SessionTime"
        ));
        const lapDistPct = numeric(prop(
            "DataCorePlugin.GameRawData.Telemetry.LapDistPct"
        ));
        const currentLapTime = numeric(prop(
            "DataCorePlugin.GameData.CurrentLapTime"
        ));
        const identity = String(
            prop("IRacingExtraProperties.SpectatedCar_Name") ?? ""
        );
        const sectorNumber = readCurrentSector();

        if (sessionTime === null || sectorNumber === null)
            return BS90.Delta.Get();

        if (!State.initialized || State.identity !== identity)
        {
            State.initialized = true;
            State.identity = identity;
            State.lapNumber = numeric(prop("DataCorePlugin.GameData.CompletedLaps"));
            State.sectorNumber = sectorNumber;
            State.sectorStartSessionTime = sessionTime;
            State.currentSectorDeltaBestLap = null;
            State.currentSectorDeltaFastestLap = null;
            State.cumulativeDeltaBestLap = null;
            State.cumulativeDeltaFastestLap = null;
            return BS90.Delta.Get();
        }

        const completedLaps = numeric(prop("DataCorePlugin.GameData.CompletedLaps"));
        if (
            completedLaps !== null &&
            State.lapNumber !== null &&
            completedLaps !== State.lapNumber
        )
        {
            State.lastCompleted = BS90.Delta.Get();
            State.lapNumber = completedLaps;
            State.sectorStartSessionTime = sessionTime;
            State.sectorNumber = sectorNumber;
            State.currentSectorDeltaBestLap = null;
            State.currentSectorDeltaFastestLap = null;
            State.cumulativeDeltaBestLap = null;
            State.cumulativeDeltaFastestLap = null;
        }

        if (sectorNumber !== State.sectorNumber)
        {
            State.sectorNumber = sectorNumber;
            State.sectorStartSessionTime = currentSectorStart(sessionTime);
            if (State.sectorStartSessionTime === null)
                State.sectorStartSessionTime = sessionTime;

            State.currentSectorDeltaBestLap = null;
            State.currentSectorDeltaFastestLap = null;
        }

        const sectorElapsed = State.sectorStartSessionTime === null
            ? null
            : sessionTime - State.sectorStartSessionTime;

        const cumulativeElapsed = currentLapTime !== null && currentLapTime > 0
            ? currentLapTime
            : null;

        const bestLap = compute(
            "bestLap",
            sectorNumber,
            sectorElapsed,
            cumulativeElapsed
        );
        const fastestLap = compute(
            "FastestLap",
            sectorNumber,
            sectorElapsed,
            cumulativeElapsed
        );

        State.currentSectorDeltaBestLap = bestLap.sector;
        State.currentSectorDeltaFastestLap = fastestLap.sector;
        State.cumulativeDeltaBestLap = bestLap.cumulative;
        State.cumulativeDeltaFastestLap = fastestLap.cumulative;

        return BS90.Delta.Get();
    };

    BS90.Delta.Get = function ()
    {
        return {
            sector: State.sectorNumber,
            bestLap: {
                sector: State.currentSectorDeltaBestLap,
                cumulative: State.cumulativeDeltaBestLap
            },
            FastestLap: {
                sector: State.currentSectorDeltaFastestLap,
                cumulative: State.cumulativeDeltaFastestLap
            },
            lastCompleted: State.lastCompleted
        };
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
