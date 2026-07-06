//----------------------------------------------------------
// BetaSimCode SHD
// BS90.Relative
//----------------------------------------------------------

if (!globalThis.BS90)
    globalThis.BS90 = {};

BS90.Relative = BS90.Relative || {};

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
		
};

//----------------------------------------------------------
// Construye lista de coches
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

			const lapDelta =
				car.lapCompleted -
				player.lapCompleted;

			const pctDelta =
				car.lapDistPct -
				player.lapDistPct;

			const delta =
				BS90.Relative.Delta(
					car,
					player,
					"race"
				);

			const delta =
				BS90.Relative.Delta(
					car,
					player,
					"track"
				);

			car.deltaTrackPosition = delta;

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



//----------------------------------------------------------
// API pública
//----------------------------------------------------------

BS90.Relative.PlayerCarIdx = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.playerCarIdx;
};

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

BS90.Relative.CarPosition = function (carIdx)
{
    const positions =
        $prop("DataCorePlugin.GameRawData.Telemetry.CarIdxPosition");

    return positions[carIdx];
};

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
// Debug posición de un CarIdx
//----------------------------------------------------------

BS90.Relative.DebugPosition = function (carIdx)
{
    const positions =
        $prop("DataCorePlugin.GameRawData.Telemetry.CarIdxPosition");

    return positions[carIdx];
};

//----------------------------------------------------------
// Lista de coches
//----------------------------------------------------------

BS90.Relative.Cars = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.cars;
};

//----------------------------------------------------------
// Coche del jugador
//----------------------------------------------------------

BS90.Relative.Player = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.cars.find(
        c => c.isPlayer
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

//----------------------------------------------------------
// Coche delante
//----------------------------------------------------------

BS90.Relative.Ahead = function ()
{
    return BS90.Relative.CarAt(-1);
};


//----------------------------------------------------------
// Coche detrás
//----------------------------------------------------------

BS90.Relative.Behind = function ()
{
    return BS90.Relative.CarAt(+1);
};


/////////////////////////////////////////////////////

BS90.Relative.NewAhead = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.ahead;
};

BS90.Relative.NewBehind = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.behind;
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

//----------------------------------------------------------
// Coordenada utilizada por el Relative
//----------------------------------------------------------

BS90.Relative.Coordinate = function(car, mode)
{
    if (mode == "race")
        return car.racePosition;

    return car.trackPosition;
};

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

BS90.Relative.TrackAhead = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.trackAhead;
};

BS90.Relative.TrackBehind = function ()
{
    BS90.Relative.Update();

    return BS90.Relative.State.trackBehind;
};