//----------------------------------------------------------
// BetaSimCode SHD
// BS90.Fuel
//----------------------------------------------------------

if (!globalThis.BS90)
    globalThis.BS90 = {};

BS90.Fuel = BS90.Fuel || {};

//----------------------------------------------------------
//
// Public API
//
// FuelInfo()
//
//----------------------------------------------------------

	BS90.Fuel.State = {

		fuelRemaining: 0,

		fuelCapacity: 0,

		fuelPerLap: 0,

		averageLapTime: 0,

		lapsRemaining: 0,

		timeRemaining: 0

	};
	
	