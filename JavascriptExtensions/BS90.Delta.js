//----------------------------------------------------------
// BS90.Delta
// Sector and cumulative deltas against reference sectors.
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
        lapStartSessionTime: null,
        lastCompleted: null,
        bestLap: { sector: null, cumulative: null },
        FastestLap: { sector: null, cumulative: null }
    };

    function asNumber(value)
    {
        if (value === null || value === undefined || value === "")
            return null;

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function positive(value)
    {
        const parsed = asNumber(value);
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

        const index = asNumber(BS90.Data.CurrentSectorIndex());
        return index !== null && index >= 0 ? Math.floor(index) + 1 : null;
    }

    function referenceSector(kind, sectorNumber)
    {
        // IMPORTANT: replace/confirm these candidate paths against the
        // active SimHub property provider. SectorStartPct is a position,
        // not a lap-time reference.
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
            const value = positive(read(paths[i]));
            if (value !== null)
                return value;
        }

        return null;
    }

    function referenceCumulative(kind, sectorNumber)
    {
        let cumulative = 0;

        for (let i = 1; i <= sectorNumber; i++)
        {
            const sectorTime = referenceSector(kind, i);
            if (sectorTime === null)
                return null;

            cumulative += sectorTime;
        }

        return cumulative;
    }

    function resetLap(sessionTime, lapNumber, sectorNumber)
    {
        State.lapNumber = lapNumber;
        State.sectorNumber = sectorNumber;
        State.sectorStartSessionTime = sessionTime;
        State.lapStartSessionTime = sessionTime;
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
            lastCompleted: State.lastCompleted
        };
    }

    BS90.Delta.Update = function ()
    {
        const sessionTime = asNumber(read(
            "DataCorePlugin.GameRawData.Telemetry.SessionTime"
        ));
        const currentLapTime = asNumber(read(
            "DataCorePlugin.GameData.CurrentLapTime"
        ));
        const lapNumber = asNumber(read(
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
            resetLap(sessionTime, lapNumber, sectorNumber);
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
        const lapElapsed = currentLapTime !== null && currentLapTime >= 0
            ? currentLapTime
            : sessionTime - State.lapStartSessionTime;

        if (sectorElapsed < 0 || lapElapsed < 0)
            return snapshot();

        const personalSector = referenceSector("bestLap", sectorNumber);
        const sessionSector = referenceSector("FastestLap", sectorNumber);
        const personalCumulative = referenceCumulative("bestLap", sectorNumber);
        const sessionCumulative = referenceCumulative("FastestLap", sectorNumber);

        State.bestLap.sector = personalSector === null
            ? null
            : sectorElapsed - personalSector;

        State.FastestLap.sector = sessionSector === null
            ? null
            : sectorElapsed - sessionSector;

        State.bestLap.cumulative = personalCumulative === null
            ? null
            : lapElapsed - personalCumulative;

        State.FastestLap.cumulative = sessionCumulative === null
            ? null
            : lapElapsed - sessionCumulative;

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
