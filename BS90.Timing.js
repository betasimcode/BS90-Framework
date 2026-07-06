(function (global) {

    "use strict";

    const BS90 = global.BS90;

    BS90.Services.Timing = BS90.Services.Timing || {};

    //--------------------------------------------------
    // Estado privado
    //--------------------------------------------------

    const State = {

        completedLaps : -1,

        freezeUntil : 0,

        gapText : ""

    };

    //--------------------------------------------------
    // CurrentLapTime -> GapToBest -> CurrentLapTime
    //--------------------------------------------------

    BS90.Services.Timing.CurrentLapTimeGapToBest = function () {

        const currentLapTime = $prop('DataCorePlugin.GameData.CurrentLapTime');
        const bestLapTime    = $prop('DataCorePlugin.GameData.BestLapTime');
        const completedLaps  = $prop('DataCorePlugin.GameData.CompletedLaps');
        const sessionTime    = $prop('DataCorePlugin.GameRawData.Telemetry.SessionTime');

        //--------------------------------------------------
        // ¿Se ha completado una vuelta?
        //--------------------------------------------------

        if (completedLaps != State.completedLaps)
        {
            State.completedLaps = completedLaps;

            if (bestLapTime > 0 && currentLapTime > 0)
            {
                const gap = currentLapTime - bestLapTime;

                const sign = gap >= 0 ? "+" : "-";

                State.gapText = sign + Math.abs(gap).toFixed(3);

                State.freezeUntil = sessionTime + 5;
            }
        }

        //--------------------------------------------------
        // Mostrar GAP
        //--------------------------------------------------

        if (sessionTime < State.freezeUntil)
        {
            return State.gapText;
        }

        //--------------------------------------------------
        // Mostrar cronómetro
        //--------------------------------------------------

        return currentLapTime;

    };

})(globalThis);

