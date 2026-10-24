//----------------------------------------------------------
// BetaSimCode SHD 2510260156
// BS90.Relative
//----------------------------------------------------------
if (!globalThis.BS90)
    globalThis.BS90 = {};

BS90.Relative = BS90.Relative || {};
//----------------------------------------------------------
//
// BS90.Relative
//
// Public API
//
// PlayerInfo()
//
// TrackAheadInfo()
//
// TrackBehindInfo()
//
// Cars() (advanced)
//
//----------------------------------------------------------


//----------------------------------------------------------
// Estado
//----------------------------------------------------------

BS90.Relative.State = {

	playerIndex: -1,
    
	playerCarIdx: -1,

    playerPosition: -1,

    playerClassPosition: -1,
	
	cars: [],
	
	ahead: null,

	behind: null,

	aheadDelta: 999,

	behindDelta: -999,
	
	trackAhead: null,

	trackBehind: null,
	
	trackAheadDelta: Number.MAX_VALUE,

	trackBehindDelta: -Number.MAX_VALUE,

};

//----------------------------------------------------------
// Actualiza datos del jugador
//----------------------------------------------------------

BS90.Relative.Update = function ()
{
    BS90.Relative.State.playerCarIdx =
        Number($prop("DataCorePlugin.GameRawData.Telemetry.PlayerCarIdx"));

    BS90.Relative.State.playerPosition =
        Number($prop("DataCorePlugin.GameData.Position"));

    BS90.Relative.State.playerClassPosition =
        Number($prop("DataCorePlugin.GameRawData.Telemetry.PlayerCarClassPosition"));
		
			
	BS90.Relative.BuildCars();
	
	BS90.Relative.FindTrackRelative();

};

//----------------------------------------------------------
// Construye lista de coches
//----------------------------------------------------------
//----------------------------------------------------------
// TODO(PR#3)
//
// Extraer:
//
// • FindRelativeRace()
// • SortCars()
// • FindPlayer()
//
// BuildCars() sólo debe construir los coches.
//
//----------------------------------------------------------
BS90.Relative.BuildCars = function ()
{
    BS90.Relative.State.cars = [];

    const lapCompleted =
        $prop("DataCorePlugin.GameRawData.Telemetry.CarIdxLapCompleted");

    const lapDistPct =
        $prop("DataCorePlugin.GameRawData.Telemetry.CarIdxLapDistPct");

    const classPosition =
        $prop("DataCorePlugin.GameRawData.Telemetry.CarIdxClassPosition");

    const position =
        $prop("DataCorePlugin.GameRawData.Telemetry.CarIdxPosition");

    const estTime =
        $prop("DataCorePlugin.GameRawData.Telemetry.CarIdxEstTime");
		
	const lastLapTime =
		$prop("DataCorePlugin.GameRawData.Telemetry.CarIdxLastLapTime");

    for (let carIdx = 0; carIdx < lapCompleted.length; carIdx++)
    {
        if (lapCompleted[carIdx] < 0)
            continue;

        const driver =
            BS90.Relative.DriverInfo(carIdx);

        BS90.Relative.State.cars.push({

            carIdx: carIdx,
			
			 isPlayer:
				carIdx == BS90.Relative.State.playerCarIdx,

            lapCompleted: lapCompleted[carIdx],

            lapDistPct: lapDistPct[carIdx],

            racePosition:
				lapCompleted[carIdx] +
				lapDistPct[carIdx],

			trackPosition:
				lapDistPct[carIdx],
			
			lastLapTime:
				lastLapTime[carIdx],

            position: position[carIdx],

            classPosition: classPosition[carIdx],

            estTime: estTime[carIdx],

            userName: driver ? driver.userName : "",

            abbrevName: driver ? driver.abbrevName : "",

            initials: driver ? driver.initials : "",

            carNumber: driver ? driver.carNumber : ""

        });
    }
	
	//------------------------------------------------------
	// Ordenar por posición en pista
	//------------------------------------------------------

	BS90.Relative.State.cars.sort(function (a, b)
	{
		return b.trackPosition - a.trackPosition;
	});
	
	//------------------------------------------------------
	// Índice relativo en la lista ordenada
	//------------------------------------------------------

	for (let i = 0; i < BS90.Relative.State.cars.length; i++)
	{
		BS90.Relative.State.cars[i].index = i;
	}
	
	//------------------------------------------------------
	// Localizar jugador
	//------------------------------------------------------

	const playerIndex =
		BS90.Relative.State.cars.findIndex(
			c => c.isPlayer
		);
	BS90.Relative.State.playerIndex =
    playerIndex;
	
	// TODO(PR#1): Extraer este bloque a FindRelativeRace() en el siguiente commit.

	//------------------------------------------------------
	// Distancia relativa al jugador
	//------------------------------------------------------

	if (playerIndex >= 0)
	{
		const player =
			BS90.Relative.State.cars[playerIndex];

		//------------------------------------------------------
		// Reiniciar Relative
		//------------------------------------------------------

		BS90.Relative.State.ahead = null;
		BS90.Relative.State.behind = null;

		BS90.Relative.State.aheadDelta = 999;
		BS90.Relative.State.behindDelta = -999;


		for (const car of BS90.Relative.State.cars)
		{
			car.deltaTrackPosition =
				car.trackPosition -
				player.trackPosition;
		}
		
		for (const car of BS90.Relative.State.cars)
		{
			if (car.isPlayer)
				continue;
            const delta =
                BS90.Relative.Delta(
                    car,
                    player,
                    "race"
                );

            car.deltaTrackPosition = delta;

			car.trackGap =
				BS90.Relative.TrackGap(
					car,
					player
				);

			//--------------------------------------------------
			// Coche delante más cercano
			//--------------------------------------------------

			if (
				delta > 0 &&
				delta < BS90.Relative.State.aheadDelta
			)
			{
				BS90.Relative.State.aheadDelta = delta;

				BS90.Relative.State.ahead = car;
			}

			//--------------------------------------------------
			// Coche detrás más cercano
			//--------------------------------------------------

			if (
				delta < 0 &&
				delta > BS90.Relative.State.behindDelta
			)
			{
				BS90.Relative.State.behindDelta = delta;

				BS90.Relative.State.behind = car;
			}
		}
		
	}
	
	
};
/////////////////////////////////// end BuildCars /////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////


//----------------------------------------------------------
// API pública
//----------------------------------------------------------

BS90.Relative.PlayerCarIdx = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.playerCarIdx;
};

// TODO(PR#2):
// Sustituir por PlayerInfo()
BS90.Relative.PlayerPosition = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.playerPosition;
};

BS90.Relative.PlayerClassPosition = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.playerClassPosition;
};


//----------------------------------------------------------
// Posición de un CarIdx
//----------------------------------------------------------

// BS90.Relative.CarPosition = function (carIdx)
// {
    // const positions =
        // $prop("DataCorePlugin.GameRawData.Telemetry.CarIdxPosition");

    // return positions[carIdx];
// };

//----------------------------------------------------------
// DriverInfo por CarIdx
//----------------------------------------------------------

BS90.Relative.DriverInfo = function (carIdx)
{
    for (let i = 1; i < 64; i++)
    {
        const driver =
            String(i).padStart(2, "0");

        const path =
            "DataCorePlugin.GameRawData.SessionData.DriverInfo.Drivers" +
            driver;

        if (Number($prop(path + ".CarIdx")) === carIdx)
        {
            return {

                carIdx: carIdx,

                userName:
                    $prop(path + ".UserName"),

                abbrevName:
                    $prop(path + ".AbbrevName"),

                initials:
                    $prop(path + ".Initials"),

                carNumber:
                    $prop(path + ".CarNumber")

            };
        }
    }

    return null;
};



//----------------------------------------------------------
// Car list
//----------------------------------------------------------

BS90.Relative.Cars = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.cars;
};

//----------------------------------------------------------
// Driver info
//----------------------------------------------------------

BS90.Relative.PlayerInfo = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.CarInfo(

        BS90.Relative.State.cars[
            BS90.Relative.State.playerIndex
        ]

    );
};

//----------------------------------------------------------
// Índice del jugador
//----------------------------------------------------------

BS90.Relative.PlayerIndex = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.cars.findIndex(
        c => c.isPlayer
    );
};

//----------------------------------------------------------
// Devuelve un coche relativo al jugador
//----------------------------------------------------------

BS90.Relative.CarAt = function (offset)
{
    BS90.Relative.Update();

    const index =
        BS90.Relative.State.playerIndex + offset;

    if (index < 0)
        return null;

    if (index >= BS90.Relative.State.cars.length)
        return null;

    return BS90.Relative.State.cars[index];
};

/////////////////////////////////////////////////////////////////////////////////////////////////
//----------------------------------------------------------
// Car Ahead
//----------------------------------------------------------
// TODO(PR#2):
// Renombrar a RaceAheadCar()
BS90.Relative.Ahead = function ()
{
    return BS90.Relative.CarAt(-1);
};


//----------------------------------------------------------
// Car Behind
//----------------------------------------------------------
// TODO(PR#2):
// Renombrar a RaceAheadCar()
BS90.Relative.Behind = function ()
{
    return BS90.Relative.CarAt(+1);
};
/////////////////////////////////////////////////////////////////////////////////////////////////

//----------------------------------------------------------
// Calcula delta entre dos coches
//----------------------------------------------------------

BS90.Relative.Delta = function (car, player, mode)
{
    //------------------------------------------------------
    // Relative de carrera
    //------------------------------------------------------

    if (mode == "race")
    {
        return (
            (car.lapCompleted + car.lapDistPct) -
            (player.lapCompleted + player.lapDistPct)
        );
    }

    //------------------------------------------------------
    // Relative físico
    //------------------------------------------------------

    if (mode == "track")
    {
        let delta =
            car.lapDistPct -
            player.lapDistPct;

        //--------------------------------------------------
        // Corrección circular
        //--------------------------------------------------

        if (delta > 0.5)
            delta -= 1;

        if (delta < -0.5)
            delta += 1;

        return delta;
    }

    return 0;
};



BS90.Relative.TrackGap = function (car, player)
{
    //------------------------------------------------------
    // Sin vuelta válida
    //------------------------------------------------------

    if (
        car.lastLapTime <= 0 ||
        player.lastLapTime <= 0
    )
        return null;

    //------------------------------------------------------
    // Delta físico sobre la pista
    //------------------------------------------------------

    let delta =
        car.lapDistPct -
        player.lapDistPct;

    //------------------------------------------------------
    // Corrección circular
    //------------------------------------------------------

    if (delta > 0.5)
        delta -= 1;

    if (delta < -0.5)
        delta += 1;

    //------------------------------------------------------
    // Tiempo de vuelta de referencia
    //------------------------------------------------------

    const referenceLapTime =
        (
            car.lastLapTime +
            player.lastLapTime
        ) / 2;

    //------------------------------------------------------
    // Gap estimado
    //------------------------------------------------------

    return delta * referenceLapTime;
};

BS90.Relative.FindTrackRelative = function ()
{
    //------------------------------------------------------
    // Reset
    //------------------------------------------------------

    BS90.Relative.State.trackAhead = null;
    BS90.Relative.State.trackBehind = null;

    BS90.Relative.State.trackAheadDelta = Number.MAX_VALUE;
    BS90.Relative.State.trackBehindDelta = -Number.MAX_VALUE;

    //------------------------------------------------------
    // Player
    //------------------------------------------------------

    const player =
		BS90.Relative.State.cars[
			BS90.Relative.State.playerIndex
		];

    if (!player)
        return;

    //------------------------------------------------------
    // Buscar coches
    //------------------------------------------------------

    for (const car of BS90.Relative.State.cars)
    {
        if (car.isPlayer)
            continue;

        //--------------------------------------------------
        // Delta físico
        //--------------------------------------------------

        let delta =
            car.lapDistPct -
            player.lapDistPct;

        //--------------------------------------------------
        // Corrección circular
        //--------------------------------------------------

        if (delta > 0.5)
            delta -= 1;

        if (delta < -0.5)
            delta += 1;

        //--------------------------------------------------
        // Guardamos para debug
        //--------------------------------------------------

        car.trackDelta = delta;

        //--------------------------------------------------
        // Gap
        //--------------------------------------------------

        car.trackGap =
            BS90.Relative.TrackGap(
                car,
                player
            );

        //--------------------------------------------------
        // Ahead
        //--------------------------------------------------

        if (
            delta > 0 &&
            delta < BS90.Relative.State.trackAheadDelta
        )
        {
            BS90.Relative.State.trackAhead = car;
            BS90.Relative.State.trackAheadDelta = delta;
        }

        //--------------------------------------------------
        // Behind
        //--------------------------------------------------

        if (
            delta < 0 &&
            delta > BS90.Relative.State.trackBehindDelta
        )
        {
            BS90.Relative.State.trackBehind = car;
            BS90.Relative.State.trackBehindDelta = delta;
        }
    }
}






//----------------------------------------------------------
// Formatea un gap
//----------------------------------------------------------

BS90.Relative.FormatGap = function (gap)
{
    if (gap == null)
        return "-";

    if (gap > 0)
        return "+" + gap.toFixed(1);

    return gap.toFixed(1);
};

//----------------------------------------------------------
// Convierte un coche interno en información pública
//----------------------------------------------------------

BS90.Relative.CarInfo = function (car)
{
    //------------------------------------------------------
    // Sin coche
    //------------------------------------------------------

    if (!car)
    {
        return {

            //--------------------------------------------------
            // Posición
            //--------------------------------------------------

            racePosition: null,

            classPosition: null,

            //--------------------------------------------------
            // Piloto
            //--------------------------------------------------

            driverName: "",

            displayName: "",

            driverInitials: "",

            carNumber: "",

            //--------------------------------------------------
            // Relative
            //--------------------------------------------------

            gapSeconds: null,

            gapText: "-"

        };
    }

    //------------------------------------------------------
    // Información
    //------------------------------------------------------

    return {

        //--------------------------------------------------
        // Posición
        //--------------------------------------------------

        racePosition: 
          "P " + car.position,

        classPosition:
            car.classPosition,

        //--------------------------------------------------
        // Piloto
        //--------------------------------------------------

        driverName:
            car.userName,

        displayName:
            car.abbrevName,

        driverInitials:
            car.initials,

        carNumber:
            car.carNumber,

        //--------------------------------------------------
        // Relative
        //--------------------------------------------------

        gapSeconds:
            car.trackGap,

        gapText:
            BS90.Relative.FormatGap(
                car.trackGap
            )
			// distanceMeters:
			// speedDifference:
			// predictedGap:
    };
};

//----------------------------------------------------------
// Información del coche delante
//----------------------------------------------------------

BS90.Relative.TrackAheadInfo = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.CarInfo(

        BS90.Relative.State.trackAhead

    );
};


//----------------------------------------------------------
// Información del coche detrás
//----------------------------------------------------------

BS90.Relative.TrackBehindInfo = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.CarInfo(

        BS90.Relative.State.trackBehind

    );
};

///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////
//----------------------------------------------------------
// Debug posición de un CarIdx
//----------------------------------------------------------

BS90.Relative.DebugPosition = function (carIdx)
{
    const positions =
        $prop("DataCorePlugin.GameRawData.Telemetry.CarIdxPosition");

    return positions[carIdx];
};

BS90.Relative.DebugRelative = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.cars
        .map(c =>
            (c.isPlayer ? ">> " : "   ") +
            c.userName +
            " : " +
            c.deltaTrackPosition.toFixed(3)
        )
        .join("\n");
};

BS90.Relative.DebugEstTime = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.cars
        .map(c =>
            c.userName +
            " : " +
            c.estTime
        )
        .join("\n");
};

BS90.Relative.DebugTelemetry = function()
{
    return BS90.Relative.Cars()
        .map(c =>
            c.userName +
            "\nRace : " + c.racePosition.toFixed(3) +
            "\nTrack: " + c.trackPosition.toFixed(3) +
            "\nEst  : " + c.estTime.toFixed(2) +
            "\n"
        )
        .join("\n");
}
BS90.Relative.DebugLastLap = function ()
{
    const lastLap =
        $prop("DataCorePlugin.GameRawData.Telemetry.CarIdxLastLapTime");

    return BS90.Relative.Cars()
        .map(c =>
            c.userName +
            " : " +
            lastLap[c.carIdx]
        )
        .join("\n");
};

BS90.Relative.DebugGap = function ()
{
    BS90.Relative.Update();

    const player =
		BS90.Relative.State.cars[
			BS90.Relative.State.playerIndex
		];

    return BS90.Relative.State.cars
        .map(c =>
        {
            const gap =
                BS90.Relative.TrackGap(
                    c,
                    player
                );

            return (
                (c.isPlayer ? ">> " : "   ") +
                c.userName +
                " : " +
                (
                    gap == null
                        ? "-"
                        : gap.toFixed(2) + " s"
                )
            );
        })
        .join("\n");
};