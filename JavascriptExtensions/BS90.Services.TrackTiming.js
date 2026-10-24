(function (global)
{
    "use strict";

    const BS90 = global.BS90;

    BS90.Services = BS90.Services || {};

    BS90.Services.TrackTiming =
        BS90.Services.TrackTiming || {};

    //--------------------------------------------------
    // Estado privado
    //--------------------------------------------------

    const State = {

        initialized : false,
		
		displayMode : "EMPTY",	
		
		displayUntil : 0,

		identity : "",

        sectorIndex : null,

        previousSectorIndex : null,
		

		//--------------------------------------------------
		// Último parcial
		//--------------------------------------------------

		lastSectorTime : 0,

		showLastSector : false,

		lastSectorUntil : 0,

        sectorStartSessionTime : 0,

        sectorTime : 0,

        previousSectorTime : 0,

        sectorChanged : false,
		
		//--------------------------------------------------
		// Acumulado de sectores
		//--------------------------------------------------

		sectorCumulativeTime : 0,

		lastSectorCumulativeTime : 0,

        lapStarted : false,
		
		lapStartSessionTime : 0,

		currentLapTime : 0,
		
		lapTimingValid : false,

        lapNumber : 0,

        showUntil : 0,
		
		//--------------------------------------------------
		// Referencia de vuelta
		//--------------------------------------------------

		referenceArmed : false,

		showReference : false,

		referencePct : 0.85

    };

    //--------------------------------------------------
    // Tick
    //--------------------------------------------------

    BS90.Services.TrackTiming.Tick = function ()
    {
		const identity =
			$prop("IRacingExtraProperties.SpectatedCar_Name");
	
        const sectorIndex =
            BS90.Data.CurrentSectorIndex();

        const sessionTime =
            Number(
                $prop(
                    "DataCorePlugin.GameRawData.Telemetry.SessionTime"
                )
            );
		const lapDistPct =
			Number(
				$prop(
					"IRacingExtraProperties.SpectatedCar_LapDistPct"
				)
			);
        //--------------------------------------------------
        // Sin datos
        //--------------------------------------------------

        if (sectorIndex == null)
        {
            return null;
        }

        //--------------------------------------------------
        // Primera inicialización
        //--------------------------------------------------

        if (!State.initialized)
        {
            State.initialized = true;

            State.sectorIndex =
                sectorIndex;

            State.sectorStartSessionTime =
                sessionTime;
				
			State.lapStartSessionTime =
				sessionTime;
				
			State.identity = identity;
        }
		//--------------------------------------------------
		// Cambio de coche seguido
		//--------------------------------------------------

		if (identity  != State.identity )
		{
			State.identity = identity;
			
			State.displayMode = "EMPTY";

			State.displayUntil = 0;
			
			State.showReference = false;
			
			State.referenceArmed = false;
		//--------------------------------------------------
		// Reiniciar contexto del coche
		//--------------------------------------------------

		State.lapTimingValid = false;

		State.currentLapTime = 0;

		State.lapStartSessionTime = sessionTime;

		State.sectorStartSessionTime = sessionTime;

		State.previousSectorIndex = null;

		State.previousSectorTime = 0;

		State.sectorChanged = false;
		
		//--------------------------------------------------
		// Preparar referencia de meta
		//--------------------------------------------------

		State.referenceArmed = true;

		State.showUntil = 0;
		}
        //--------------------------------------------------
        // Cambio de sector
        //--------------------------------------------------

        if (sectorIndex != State.sectorIndex)
        {
            State.previousSectorIndex =
                State.sectorIndex;

            State.previousSectorTime =
                sessionTime -
                State.sectorStartSessionTime;

			//--------------------------------------------------
			// Congelar parcial
			//--------------------------------------------------

			State.lastSectorTime =
				State.previousSectorTime;

			if (sectorIndex != 0)
			{
				State.showLastSector = true;

				State.lastSectorUntil =
					sessionTime + 7;
			}

            State.sectorStartSessionTime =
                sessionTime;

            State.sectorIndex =
                sectorIndex;

            State.sectorChanged =
                true;

			State.sectorCumulativeTime +=
				State.previousSectorTime;

			State.lastSectorCumulativeTime =
				State.sectorCumulativeTime;
		
            //--------------------------------------------------
            // Inicio de vuelta
            //--------------------------------------------------

            State.lapStarted = false;

            if (
                State.previousSectorIndex != null &&
                sectorIndex == 0 &&
                State.previousSectorIndex > 0
            )
            {
                State.lapStarted = true;
				
				State.lapStartSessionTime =
					sessionTime;

				State.currentLapTime = 0;

				State.lapTimingValid = true;
				
				
				//--------------------------------------------------
				// Mostrar última vuelta
				//--------------------------------------------------

				State.displayMode = "LAST_LAP";

				State.displayUntil = sessionTime + 9.149;
				
				State.referenceArmed = true;     

                State.lapNumber++;
				
				State.sectorCumulativeTime = 0;
				
            }

            //--------------------------------------------------
            // Mantener visible la Card
            //--------------------------------------------------

            State.showUntil =
                sessionTime + 9;
        }
        else
        {
            State.sectorChanged = false;

            State.lapStarted = false;
        }

        //--------------------------------------------------
        // Tiempo del sector actual
        //--------------------------------------------------

        State.sectorTime =
            sessionTime -
            State.sectorStartSessionTime;

		//--------------------------------------------------
		// Current Lap Time
		//--------------------------------------------------

		if (State.lapTimingValid)
		{
			State.currentLapTime =
				sessionTime -
				State.lapStartSessionTime;
		}
		// else
		// {
			// State.displayMode = "EMPTY";
		// }

		//--------------------------------------------------
		// Eventos de pista
		//--------------------------------------------------

		if (
			State.referenceArmed &&
			lapDistPct >= State.referencePct
		)
		{
			State.referenceArmed = false;
			State.showReference = true;
		}

		//--------------------------------------------------
		// Estado visual
		//--------------------------------------------------

		if (
			State.displayMode == "LAST_LAP" &&
			sessionTime >= State.displayUntil
		)
		{
			State.displayMode = "LIVE";
			State.showReference = false;
		}
		
		if (
			State.showLastSector &&
			sessionTime >= State.lastSectorUntil
		)
		{
			State.showLastSector = false;
		}

        //--------------------------------------------------
        // Resultado
        //--------------------------------------------------

        return {
			showTiming :

				State.displayMode != "EMPTY",

			showReference :

				State.showReference,

			showGap :

				State.showReference &&
				State.displayMode == "LAST_LAP",
				
			displayMode :

				State.displayMode,
				
			showLastSector :

				State.showLastSector,

			lastSectorTime :

				State.lastSectorTime,	
				
			lastSectorCumulativeTime :

				State.lastSectorCumulativeTime,	
				
			referenceArmed :
			
				State.referenceArmed,
				
				
			lapDistPct :
			
				lapDistPct,
	
			identity :

				State.identity,
	
            lapStarted :

                State.lapStarted,

            lapNumber :

                State.lapNumber,

            sectorIndex :

                State.sectorIndex,

            sector :

                State.sectorIndex + 1,

			showSectorReference :

				State.showLastSector &&
				State.displayMode != "LAST_LAP",

            previousSectorIndex :

                State.previousSectorIndex,

            previousSector :

                State.previousSectorIndex == null
                    ? null
                    : State.previousSectorIndex + 1,

            sectorTime :

                State.sectorTime,

            previousSectorTime :

                State.previousSectorTime,

            sectorChanged :

                State.sectorChanged,

            show :

                sessionTime <
                State.showUntil,

            sessionTime :

                sessionTime,

			currentLapTime :

				State.currentLapTime,

			lapTimingValid :

				State.lapTimingValid,

            sectorStartSessionTime :

                State.sectorStartSessionTime

        };

    };

})(globalThis);