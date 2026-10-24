(function (global)
{
    "use strict";

    const BS90 = global.BS90;

    BS90.Data = BS90.Data || {};

    //--------------------------------------------------
    // Proveedor de datos
    //--------------------------------------------------

    BS90.Data.Provider = "RSC";

    //--------------------------------------------------
    // LapDistPct del coche en cámara
    //--------------------------------------------------

    BS90.Data.TrackPosition = function ()
    {
        switch (BS90.Data.Provider)
        {
            case "RSC":

                return $prop(
                    "IRacingExtraProperties.SpectatedCar_LapDistPct"
                );

            default:

                return null;
        }
    };

    //--------------------------------------------------
    // Tiempo actual de sector
    //--------------------------------------------------

    BS90.Data.CurrentSector = function ()
	{
		const sector =
			BS90.Data.CurrentSectorIndex();

		if (sector == null)
		{
			return null;
		}

		return sector + 1;
	};

    //--------------------------------------------------
    // Sector actual
    //--------------------------------------------------

    // BS90.Data.CurrentSector = function ()
    // {
        // switch (BS90.Data.Provider)
        // {
            // case "RSC":

                // return $prop(
                    // "IRacingExtraProperties.CurrentSector_Index"
                // );

            // default:

                // return null;
        // }
    // };

    //--------------------------------------------------
    // Última vuelta
    //--------------------------------------------------

    BS90.Data.LastLapTime = function ()
    {
        switch (BS90.Data.Provider)
        {
            case "RSC":

                return $prop(
                    "IRacingExtraProperties.SpectatedCar_LastLapTime"
                );

            default:

                return null;
        }
    };

    //--------------------------------------------------
    // Mejor vuelta
    //--------------------------------------------------

    BS90.Data.BestLapTime = function ()
    {
        switch (BS90.Data.Provider)
        {
            case "RSC":

                return $prop(
                    "IRacingExtraProperties.SpectatedCar_BestLapTime"
                );

            default:

                return null;
        }
    };

})(globalThis);


//--------------------------------------------------
// Sector actual del coche en cámara
//--------------------------------------------------

BS90.Data.CurrentSector = function ()
{
    const pct =
        BS90.Data.TrackPosition();

    if (pct == null)
    {
        return null;
    }

    const sectorCount =
        Number(
            $prop("DataCorePlugin.GameData.SectorsCount")
        );

    //--------------------------------------------------
    // Buscar el último sector cuyo inicio
    // sea menor o igual al pct actual
    //--------------------------------------------------

    let currentSector = 0;

    for (let i = 1; i <= sectorCount; i++)
    {
        const startPct =
            Number(
                $prop(
                    "DataCorePlugin.GameRawData.SessionData.SplitTimeInfo.Sectors"
                    + String(i).padStart(2, "0")
                    + ".SectorStartPct"
                )
            );

        if (pct >= startPct)
        {
            currentSector = i - 1;
        }
    }

    return currentSector;
};


BS90.Data.CurrentSectorIndex = function ()
{
    const pct =
        BS90.Data.TrackPosition();

    if (pct == null)
    {
        return null;
    }

    const sectorCount =
        Number(
            $prop(
                "DataCorePlugin.GameData.SectorsCount"
            )
        );

    let currentSector = 0;

    for (let i = 1; i <= sectorCount; i++)
    {
        const startPct =
            Number(
                $prop(
                    "DataCorePlugin.GameRawData.SessionData.SplitTimeInfo.Sectors"
                    + String(i).padStart(2, "0")
                    + ".SectorStartPct"
                )
            );

        if (pct >= startPct)
        {
            currentSector = i - 1;
        }
    }

    return currentSector;
};

BS90.Data.Debug = function ()
{
    return {

        pct :

            BS90.Data.TrackPosition(),

        sector :

            BS90.Data.CurrentSectorIndex(),

        sessionTime :

            Number(
                $prop(
                    "DataCorePlugin.GameRawData.Telemetry.SessionTime"
                )
            )

    };
};