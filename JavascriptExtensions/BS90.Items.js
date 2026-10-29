//----------------------------------------------------------
// BetaSimCode SHD
// BS90.Items
//
// Public, dashboard-facing timing items.
// Suffix 1 / 2 / 3 selects displayed decimal precision.
// Internal timing values remain unrounded.
//----------------------------------------------------------

(function (global)
{
    "use strict";

    if (!global.BS90) global.BS90 = {};

    const BS90 = global.BS90;
    BS90.Items = BS90.Items || {};

    //------------------------------------------------------
    // Internal helpers
    //------------------------------------------------------

    function seconds(value)
    {
        if (BS90.Time && typeof BS90.Time.Seconds === "function")
            return BS90.Time.Seconds(value);

        if (value == null || value === "")
            return null;

        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function formatTime(value, decimals)
    {
        const number = seconds(value);

        if (number === null || number < 0)
            return "--.--";

        const scale = Math.pow(10, decimals);
        const truncated = Math.floor(number * scale) / scale;

        if (BS90.Time && typeof BS90.Time.Compact === "function")
            return BS90.Time.Compact(truncated, decimals);

        return truncated.toFixed(decimals);
    }

    function formatGap(value, decimals)
    {
        if (value == null || value === "")
            return "";

        const number = Number(value);
        if (!Number.isFinite(number))
            return "";

        // Truncate toward zero to avoid showing a better gap than the data.
        const scale = Math.pow(10, decimals);
        const truncated = Math.trunc(number * scale) / scale;
        const sign = truncated >= 0 ? "+" : "";

        return sign + truncated.toFixed(decimals);
    }

    function readFastestClassLap()
    {
        try
        {
            return seconds($prop(
                "IRacingExtraProperties.iRacing_ClassLeaderboard_Driver_00_BestLapTime"
            ));
        }
        catch (error)
        {
            return null;
        }
    }

    //------------------------------------------------------
    // Last completed lap time
    //------------------------------------------------------

    function lastTime()
    {
        return BS90.Data && typeof BS90.Data.LastLapTime === "function"
            ? BS90.Data.LastLapTime()
            : null;
    }

    BS90.Items.LastTime1 = function () { return formatTime(lastTime(), 1); };
    BS90.Items.LastTime2 = function () { return formatTime(lastTime(), 2); };
    BS90.Items.LastTime3 = function () { return formatTime(lastTime(), 3); };

    //------------------------------------------------------
    // Personal best lap time
    //------------------------------------------------------

    function bestTime()
    {
        return BS90.Data && typeof BS90.Data.BestLapTime === "function"
            ? BS90.Data.BestLapTime()
            : null;
    }

    BS90.Items.BestTime1 = function () { return formatTime(bestTime(), 1); };
    BS90.Items.BestTime2 = function () { return formatTime(bestTime(), 2); };
    BS90.Items.BestTime3 = function () { return formatTime(bestTime(), 3); };

    //------------------------------------------------------
    // Fastest lap in the current class
    //------------------------------------------------------

    BS90.Items.FastestTime1 = function () { return formatTime(readFastestClassLap(), 1); };
    BS90.Items.FastestTime2 = function () { return formatTime(readFastestClassLap(), 2); };
    BS90.Items.FastestTime3 = function () { return formatTime(readFastestClassLap(), 3); };

    //------------------------------------------------------
    // Current sector number and running sector time
    //------------------------------------------------------

    BS90.Items.SectorActual = function ()
    {
        return BS90.Sectors && typeof BS90.Sectors.CurrentNumber === "function"
            ? BS90.Sectors.CurrentNumber()
            : null;
    };

    function currentSectorTime()
    {
        return BS90.Sectors && typeof BS90.Sectors.CurrentTime === "function"
            ? BS90.Sectors.CurrentTime()
            : null;
    }

    BS90.Items.SectorTime1 = function () { return formatTime(currentSectorTime(), 1); };
    BS90.Items.SectorTime2 = function () { return formatTime(currentSectorTime(), 2); };
    BS90.Items.SectorTime3 = function () { return formatTime(currentSectorTime(), 3); };

    //------------------------------------------------------
    // Split gap against personal best lap
    //------------------------------------------------------

    function splitGapBest()
    {
        return BS90.Delta && typeof BS90.Delta.SectorToBestLap === "function"
            ? BS90.Delta.SectorToBestLap()
            : null;
    }

    BS90.Items.SplitGapBest1 = function () { return formatGap(splitGapBest(), 1); };
    BS90.Items.SplitGapBest2 = function () { return formatGap(splitGapBest(), 2); };
    BS90.Items.SplitGapBest3 = function () { return formatGap(splitGapBest(), 3); };

    //------------------------------------------------------
    // Cumulative delta against personal best lap
    //------------------------------------------------------

    function deltaBest()
    {
        return BS90.Delta && typeof BS90.Delta.CumulativeToBestLap === "function"
            ? BS90.Delta.CumulativeToBestLap()
            : null;
    }

    BS90.Items.DeltaBest1 = function () { return formatGap(deltaBest(), 1); };
    BS90.Items.DeltaBest2 = function () { return formatGap(deltaBest(), 2); };
    BS90.Items.DeltaBest3 = function () { return formatGap(deltaBest(), 3); };

})(globalThis);
