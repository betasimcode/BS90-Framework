//----------------------------------------------------------
// BS90.Delta
// Sector and cumulative deltas against reference sector times.
// Units: seconds. Positive = slower, negative = faster.
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
        lapNumber: null,
        sectorNumber: null,
        sectorStartSessionTime: null,
        lastCompleted: null,
        bestLap: { sector: null, cumulative: null },
        FastestLap: { sector: null, cumulative: null },
        status: "Waiting for telemetry"
    };

    function read(path)
    {
        try
        {
            return $prop(path);
        }
        catch (error)
        {
            return null;
        }
    }

    // SimHub TimeSpan values commonly arrive as "HH:MM:SS.fffffff".
    // Also accepts numeric values already expressed in seconds.
    function seconds(value)
    {
        if (value === null || value === undefined || value === "")
            return null;

        if (typeof value === "number")
            return Number.isFinite(value) ? value : null;

        if (typeof value === "object")
        {
            if (typeof value.TotalSeconds === "number")
                return value.TotalSeconds;

            value = String(value);
        }

        const text = String(value).trim();
        const numeric = Number(text);

        if (text !== "" && Number.isFinite(numeric))
            return numeric;

        const match = text.match(/^(-)?(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.(\d+))?$/);
        if (!match)
            return null;

        const hours = Number(match[2] || 0);
        const minutes = Number(match[3] || 0);
        const wholeSeconds = Number(match[4] || 0);
        const fraction = match[5] ? Number("0." + match[5]) : 0;
        const total = hours * 3600 + minutes * 60 + wholeSeconds + fraction;

        return match[1] ? -total : total;
    }

    function positiveSeconds(value)
    {
        const result = seconds(value);
        return result !== null && result > 0 ? result : null;
    }

    function currentSectorNumber()
    {
        if (!BS90.Data || typeof BS90.Data.CurrentSectorIndex !== "function")
            return null;

        const index = seconds(BS90.Data.CurrentSectorIndex());
        return index !== null && index >= 0
            ? Math.floor(index) + 1
            : null;
    }

    function referenceSector(kind, sectorNumber)
    {
        // Confirmed properties from the SimHub 9.13.3 catalog:
        // SectorNBestLapTime = sector split from the best lap.
        // SectorNBestTime    = best individual time for that sector.
        const suffix = String(sectorNumber);
        const path = kind === "bestLap"
            ? "DataCorePlugin.GameData.Sector" + suffix + "BestLapTime"
            : "DataCorePlugin.GameData.Sector" + suffix + "BestTime";

        return positiveSeconds(read(path));
    }

    function referenceCumulative(kind, sectorNumber)
    {
        let total = 0;

        for (let i = 1; i <= sectorNumber; i++)
        {
            const split = referenceSector(kind, i);
            if (split === null)
                return null;

            total += split;
        }

        return total;
    }

    function resetLap(sessionTime, lapNumber, sectorNumber)
    {
        State.lapNumber = lapNumber;
        State.sectorNumber = sectorNumber;
        State.sectorStartSessionTime = sessionTime;
        State.bestLap = { sector: null, cumulative: null };
        State.FastestLap = { sector: null, cumulative: null };
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
            lastCompleted: State.lastCompleted,
            status: State.status
        };
    }

    BS90.Delta.Update = function ()
    {
        const sessionTime = seconds(read(
            "DataCorePlugin.GameRawData.Telemetry.SessionTime"
        ));
        const currentLapTime = seconds(read(
            "DataCorePlugin.GameData.CurrentLapTime"
        ));
        const lapNumber = seconds(read(
            "DataCorePlugin.GameData.CompletedLaps"
        ));
        const identity = String(
            read("IRacingExtraProperties.SpectatedCar_Name") || ""
        );
        const sectorNumber = currentSectorNumber();

        if (sessionTime === null || sectorNumber === null)
        {
            State.status = "Missing session time or sector index";
            return snapshot();
        }

        if (!State.initialized || identity !== State.identity)
        {
            State.initialized = true;
            State.identity = identity;
            resetLap(sessionTime, lapNumber, sectorNumber);
            State.status = "Initialized; waiting for sector transition";
            return snapshot();
        }

        if (
            lapNumber !== null &&
            State.lapNumber !== null &&
            lapNumber !== State.lapNumber
        )
        {
            State.lastCompleted = snapshot();
            resetLap(sessionTime, lapNumber, sectorNumber);
            State.status = "New lap; waiting for sector transition";
            return snapshot();
        }

        if (sectorNumber !== State.sectorNumber)
        {
            State.sectorNumber = sectorNumber;
            State.sectorStartSessionTime = sessionTime;
        }

        const sectorElapsed = sessionTime - State.sectorStartSessionTime;
        const lapElapsed = currentLapTime;

        if (sectorElapsed < 0 || lapElapsed === null || lapElapsed < 0)
        {
            State.status = "Invalid elapsed time";
            return snapshot();
        }

        const personalSector = referenceSector("bestLap", sectorNumber);
        const fastestSector = referenceSector("FastestLap", sectorNumber);
        const personalCumulative = referenceCumulative("bestLap", sectorNumber);
        const fastestCumulative = referenceCumulative("FastestLap", sectorNumber);

        State.bestLap.sector = personalSector === null
            ? null
            : sectorElapsed - personalSector;

        State.FastestLap.sector = fastestSector === null
            ? null
            : sectorElapsed - fastestSector;

        State.bestLap.cumulative = personalCumulative === null
            ? null
            : lapElapsed - personalCumulative;

        State.FastestLap.cumulative = fastestCumulative === null
            ? null
            : lapElapsed - fastestCumulative;

        State.status = personalSector === null || fastestSector === null
            ? "Reference sector time unavailable"
            : "OK";

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
