//----------------------------------------------------------
// BetaSimCode SHD
// BS90.Broadcast
//----------------------------------------------------------

if (!globalThis.BS90)
    globalThis.BS90 = {};

BS90.Broadcast = BS90.Broadcast || {};

//----------------------------------------------------------
//
// Public API
//
// Driver(carIdx)
//
//----------------------------------------------------------
BS90.Broadcast.State = {

    initialized: false,

    //--------------------------------------------------
    // Driver Intro
    //--------------------------------------------------

    currentCar: -1,

    introVisible: false,

    introUntil: 0

};

//----------------------------------------------------------
// Actualización
//----------------------------------------------------------

BS90.Broadcast.Update = function ()
{
    const sessionTime =
        Number(
            $prop("DataCorePlugin.GameRawData.Telemetry.SessionTime")
        );

    const currentCar =
        BS90.Camera.CurrentCar();

    //------------------------------------------------------
    // Cambio de cámara
    //------------------------------------------------------

    if (currentCar != BS90.Broadcast.State.currentCar)
    {
        BS90.Broadcast.State.currentCar = currentCar;

        BS90.Broadcast.State.introVisible = true;

        BS90.Broadcast.State.introUntil = sessionTime + 8;
    }

    //------------------------------------------------------
    // Fin de la presentación
    //------------------------------------------------------

    if (
        BS90.Broadcast.State.introVisible &&
        sessionTime >= BS90.Broadcast.State.introUntil
    )
    {
        BS90.Broadcast.State.introVisible = false;
    }
};

BS90.Broadcast.Driver = function (carIdx)
{

    BS90.Broadcast.Update();

    //------------------------------------------
    // Buscar coche
    //------------------------------------------

    const driver =
		BS90.Session.Driver(carIdx);

    if (!driver)
        return null;

		//------------------------------------------
		// Modelo Broadcast
		//------------------------------------------

		return {

		//--------------------------------------------------
		// Driver
		//--------------------------------------------------

		driverName:
			driver.driverName,

		displayName:
			driver.driverName,
			
		memberId:
			driver.memberId,

		initials:
			"",

		//--------------------------------------------------
		// Car
		//--------------------------------------------------

		carNumber:
			driver.carNumber,

		carName:
			driver.carName || "",

		carClass:
			driver.carClassId || "",

		//--------------------------------------------------
		// Team
		//--------------------------------------------------

		teamName:
			driver.teamName || "",

		//--------------------------------------------------
		// Media
		//--------------------------------------------------

		helmet:
			null,

		photo:
			null,

		livery:
			null

	};

};


//----------------------------------------------------------
// Driver Name
//----------------------------------------------------------

BS90.Broadcast.DriverName = function(carIdx)
{
    const driver =
        BS90.Broadcast.Driver(carIdx);

    if (!driver)
        return "";

    return driver.displayName;
}

//----------------------------------------------------------
// BetaSimCode SHD
// BS90.Camera
//----------------------------------------------------------

if (!globalThis.BS90)
    globalThis.BS90 = {};

BS90.Camera = BS90.Camera || {};

//----------------------------------------------------------
// Coche actual de la cámara
//----------------------------------------------------------

BS90.Camera.CurrentCar = function ()
{
    return Number(
        $prop("DataCorePlugin.GameRawData.Telemetry.CamCarIdx")
    ) + 1;
}

//----------------------------------------------------------
// Driver Intro visible
//----------------------------------------------------------

BS90.Broadcast.DriverIntroVisible = function ()
{
    BS90.Broadcast.Update();

    return BS90.Broadcast.State.introVisible;
};