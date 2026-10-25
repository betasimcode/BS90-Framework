//----------------------------------------------------------
// BetaSimCode SHD 2510260153
// BS90.Sectors
//----------------------------------------------------------

if (!globalThis.BS90)
    globalThis.BS90 = {};

BS90.Sectors = BS90.Sectors || {};

//----------------------------------------------------------
// Estado interno
//----------------------------------------------------------

BS90.Sectors.State = {

    initialized: false,

    // Último estado conocido
    lastCurrentLapTime: 0,
    lastLapDistPct: 0,

    // Timing
    sectorStartSessionTime: 0,
    currentSectorTime: 0,
    lastSectorTime: 0,
    accumulatedSectorTime: 0,

    // Estado actual
    currentSector: 1,
    nextSplitIndex: 0,

    // Eventos
    newLap: false,
    
	splitCrossed: false,
	
	freeze: false,

	freezeUntil: 0,

	freezeSector: 0,

	freezeAccumulated: 0,

};

//----------------------------------------------------------
// Historial de sectores de la vuelta actual
//----------------------------------------------------------

BS90.Sectors.History = {

    sectors: []

};

//----------------------------------------------------------
// Finaliza el sector actual
//----------------------------------------------------------

BS90.Sectors.FinishSector = function(sessionTime)
{
    // Tiempo definitivo del sector

    BS90.Sectors.State.currentSectorTime =
        sessionTime -
        BS90.Sectors.State.sectorStartSessionTime;

    BS90.Sectors.State.lastSectorTime =
        BS90.Sectors.State.currentSectorTime;

    BS90.Sectors.State.accumulatedSectorTime +=
        BS90.Sectors.State.currentSectorTime;

    // Guardar sector

    BS90.Lap.AddSector({

        sector: BS90.Sectors.State.currentSector,

        time: BS90.Sectors.State.lastSectorTime,

        accumulated: BS90.Sectors.State.accumulatedSectorTime

    });

    // Preparar siguiente sector

    BS90.Sectors.State.sectorStartSessionTime =
        sessionTime;

    BS90.Sectors.State.currentSectorTime = 0;
};

//----------------------------------------------------------
// Actualiza estado
//----------------------------------------------------------

BS90.Sectors.Update = function ()
{
    //------------------------------------------------------
    // Lectura de propiedades
    //------------------------------------------------------

    const currentLapTime =
        Number($prop("DataCorePlugin.GameData.CurrentLapTime"));

    const speed =
        Number($prop("DataCorePlugin.GameData.SpeedKmh"));

    const lapDistPct =
        Number($prop("DataCorePlugin.GameRawData.Telemetry.LapDistPct"));

    const trackId =
        String($prop("DataCorePlugin.GameRawData.SessionData.WeekendInfo.TrackID"));
		
	const sessionTime =
		Number($prop("DataCorePlugin.GameRawData.Telemetry.SessionTime"));

    //------------------------------------------------------
    // Reset de eventos
    //------------------------------------------------------

    BS90.Sectors.State.newLap = false;
    BS90.Sectors.State.splitCrossed = false;

    //------------------------------------------------------
    // Primer refresco
    //------------------------------------------------------

    if (!BS90.Sectors.State.initialized)
    {
        BS90.Sectors.State.initialized = true;

        BS90.Sectors.State.lastCurrentLapTime = currentLapTime;
        BS90.Sectors.State.lastLapDistPct = lapDistPct;

        return;
    }

    //------------------------------------------------------
    // Detectar nueva vuelta
    //------------------------------------------------------

	const newLap =
		BS90.Sectors.State.lastLapDistPct > 0.95 &&
		lapDistPct < 0.05 &&
		speed > 50;

    if (newLap)
    {
		//--------------------------------------------------
		// Finalizar el último sector de la vuelta
		//--------------------------------------------------

		BS90.Sectors.State.currentSectorTime =
			sessionTime -
			BS90.Sectors.State.sectorStartSessionTime;

		BS90.Sectors.State.lastSectorTime =
			BS90.Sectors.State.currentSectorTime;

		BS90.Sectors.State.accumulatedSectorTime +=
			BS90.Sectors.State.currentSectorTime;
			
		

        // Register the final sector before closing the lap.
        BS90.Lap.AddSector({
            sector: BS90.Sectors.State.currentSector,
            time: BS90.Sectors.State.lastSectorTime,
            accumulated: BS90.Sectors.State.accumulatedSectorTime
        });

        BS90.Lap.EndLap();
		
		BS90.Sectors.History.sectors = [];
		
        BS90.Sectors.State.newLap = true;

		BS90.Sectors.State.freeze = true;

		BS90.Sectors.State.freezeUntil = sessionTime + 8;

		BS90.Sectors.State.freezeSector =
			BS90.Sectors.State.lastSectorTime;

		BS90.Sectors.State.freezeAccumulated =
			BS90.Sectors.State.accumulatedSectorTime;

        BS90.Sectors.State.currentSector = 1;
        
		BS90.Sectors.State.nextSplitIndex = 0;
		
		BS90.Sectors.State.sectorStartSessionTime = sessionTime;

		BS90.Sectors.State.currentSectorTime = 0;

		BS90.Sectors.State.lastSectorTime = 0;

		BS90.Sectors.State.accumulatedSectorTime = 0;
    }
	
	BS90.Sectors.State.currentSectorTime =
    sessionTime -
    BS90.Sectors.State.sectorStartSessionTime;

    //------------------------------------------------------
    // Detectar cruce del siguiente split
    //------------------------------------------------------

    const track = BS90.Data.Tracks[trackId];

    if (track)
    {
        const splits = track.sectors;

        if (BS90.Sectors.State.nextSplitIndex < splits.length)
        {
            const split = splits[BS90.Sectors.State.nextSplitIndex];

            if (
				BS90.Sectors.State.lastLapDistPct < split &&
				lapDistPct >= split
			)
			{
				BS90.Sectors.State.splitCrossed = true;

				//--------------------------------------------------
				// Finaliza el sector actual
				//--------------------------------------------------

				BS90.Sectors.State.lastSectorTime =
					BS90.Sectors.State.currentSectorTime;

				BS90.Sectors.State.accumulatedSectorTime +=
					BS90.Sectors.State.currentSectorTime;

				BS90.Lap.AddSector({

					sector: BS90.Sectors.State.currentSector,

					time: BS90.Sectors.State.lastSectorTime,

					accumulated: BS90.Sectors.State.accumulatedSectorTime

				});

				//--------------------------------------------------
				// Comienza el siguiente sector
				//--------------------------------------------------

				BS90.Sectors.State.sectorStartSessionTime =
					sessionTime;

				BS90.Sectors.State.currentSectorTime = 0;

				BS90.Sectors.State.currentSector++;

				BS90.Sectors.State.nextSplitIndex++;
			}
        }
    }

    //------------------------------------------------------
    // Guardar estado
    //------------------------------------------------------

    BS90.Sectors.State.lastCurrentLapTime = currentLapTime;
    BS90.Sectors.State.lastLapDistPct = lapDistPct;
};

//----------------------------------------------------------
// Sector actual
//----------------------------------------------------------

BS90.Sectors.CurrentNumber = function ()
{
    BS90.Sectors.Update();

    return BS90.Sectors.State.currentSector;
};

//----------------------------------------------------------
// Tiempo del sector actual
//----------------------------------------------------------

BS90.Sectors.CurrentTime = function ()
{
    BS90.Sectors.Update();

    return BS90.Sectors.State.currentSectorTime;
};



//----------------------------------------------------------
// Último sector completado
//----------------------------------------------------------

BS90.Sectors.LastSector = function ()
{
    const sectors = BS90.Lap.State.current.sectors;

    if (sectors.length === 0)
    {
        return {
            sector: 0,
            time: 0,
            accumulated: 0
        };
    }

    return sectors[sectors.length - 1];
};



//----------------------------------------------------------
// Debug
//----------------------------------------------------------

BS90.Sectors.Debug = function ()
{
    BS90.Sectors.Update();

    const last = BS90.Sectors.LastSector();

    if (!last)
        return "No sectors";

    return (
        "S" +
        last.sector +
        "  " +
        BS90.Time.Format(last.time)
    );
};

//----------------------------------------------------------
// Tiempo acumulado hasta el último sector completado
//----------------------------------------------------------

BS90.Sectors.AccumulatedTime = function ()
{
    BS90.Sectors.Update();

    const sessionTime =
        Number(
            $prop("DataCorePlugin.GameRawData.Telemetry.SessionTime")
        );

    //------------------------------------------------------
    // Congelar último acumulado tras meta
    //------------------------------------------------------

    if (
        BS90.Sectors.State.freeze &&
        sessionTime < BS90.Sectors.State.freezeUntil
    )
    {
        return BS90.Sectors.State.freezeAccumulated;
    }

    //------------------------------------------------------
    // Fin del freeze
    //------------------------------------------------------

    BS90.Sectors.State.freeze = false;

    return BS90.Sectors.State.accumulatedSectorTime;
};