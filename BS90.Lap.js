//----------------------------------------------------------
// BetaSimCode SHD
// BS90.Lap
//----------------------------------------------------------

if (!globalThis.BS90)
    globalThis.BS90 = {};

BS90.Lap = BS90.Lap || {};

BS90.Lap.State = {

    current: {

        number: 0,

        sectors: [],

        lapTime: 0

    },

    previous: {

        number: 0,

        sectors: [],

        lapTime: 0

    }

};


//----------------------------------------------------------
// Añade un sector a la vuelta actual
//----------------------------------------------------------

BS90.Lap.AddSector = function (sectorData)
{
    BS90.Lap.State.current.sectors.push({

        sector: sectorData.sector,

        time: sectorData.time,

        accumulated: sectorData.accumulated

    });
};



//----------------------------------------------------------
// Finaliza la vuelta actual
//----------------------------------------------------------

BS90.Lap.EndLap = function ()
{
    // Guardar la vuelta terminada

    BS90.Lap.State.previous = {

        number: BS90.Lap.State.current.number,

        sectors: [...BS90.Lap.State.current.sectors],

        lapTime:
            BS90.Lap.State.current.sectors.length > 0
                ? BS90.Lap.State.current.sectors[
                    BS90.Lap.State.current.sectors.length - 1
                ].accumulated
                : 0

    };

    // Preparar nueva vuelta

    BS90.Lap.State.current = {

        number: BS90.Lap.State.current.number + 1,

        sectors: [],

        lapTime: 0

    };
};

//----------------------------------------------------------
// Última vuelta completada
//----------------------------------------------------------

BS90.Lap.Previous = function ()
{
    return BS90.Lap.State.previous;
};

//----------------------------------------------------------
// Vuelta actual
//----------------------------------------------------------

BS90.Lap.Current = function ()
{
    return BS90.Lap.State.current;
};