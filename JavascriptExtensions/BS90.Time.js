//----------------------------------------------------------
// BetaSimCode SHD
// BS90.Time
//----------------------------------------------------------

if (!globalThis.BS90)
    globalThis.BS90 = {};

BS90.Time = BS90.Time || {};

//----------------------------------------------------------
// Formatea segundos
// 9.1523 -> 09.152
//----------------------------------------------------------

BS90.Time.Format = function(seconds)
{
    if (!isFinite(seconds) || seconds < 0)
        return "--.--";

    const totalMs = Math.floor(seconds * 1000);

    const minutes = Math.floor(totalMs / 60000);

    const secs = Math.floor((totalMs % 60000) / 1000);

    const millis = totalMs % 1000;

    if (minutes > 0)
    {
        return (
            String(minutes).padStart(2, "0") +
            ":" +
            String(secs).padStart(2, "0") +
            "." +
            String(millis).padStart(3, "0")
        );
    }

    return (
        String(secs).padStart(2, "0") +
        "." +
        String(millis).padStart(3, "0")
    );
};

//----------------------------------------------------------
// Formatos adicionales: conservan Format() sin cambios
//----------------------------------------------------------

// Tiempo de sector con dos decimales.
// Ejemplo: 32.47 / 01:32.47
BS90.Time.Format2 = function(seconds)
{
    if (seconds == null || !isFinite(Number(seconds)) || Number(seconds) < 0)
        return "--.--";

    const totalCentiseconds = Math.floor(Number(seconds) * 100);
    const minutes = Math.floor(totalCentiseconds / 6000);
    const secs = Math.floor((totalCentiseconds % 6000) / 100);
    const centiseconds = totalCentiseconds % 100;

    if (minutes > 0)
    {
        return (
            String(minutes).padStart(2, "0") +
            ":" +
            String(secs).padStart(2, "0") +
            "." +
            String(centiseconds).padStart(2, "0")
        );
    }

    return (
        String(secs).padStart(2, "0") +
        "." +
        String(centiseconds).padStart(2, "0")
    );
};

// Gap con un decimal.
// Acepta segundos numéricos o un delta textual como "+0.4" / "-0.4".
BS90.Time.Gap1 = function(value)
{
    if (value == null || value === "")
        return "";

    const number = Number(value);

    if (!Number.isFinite(number))
        return "";

    const rounded = Math.abs(number) < 0.0000001 ? 0 : number;
    return (rounded >= 0 ? "+" : "") + rounded.toFixed(1);
};


//--------------------------------------------------
// Formato compacto Broadcast
//--------------------------------------------------

BS90.Time.Compact = function (value, decimals = 3)
{
    //--------------------------------------------------
    // Sin datos
    //--------------------------------------------------

    if (value == null)
    {
        return "";
    }

    //--------------------------------------------------
    // TimeSpan (.NET)
    //--------------------------------------------------

    if (typeof value === "object")
    {
        if (value.TotalSeconds != null)
        {
            value = value.TotalSeconds;
        }
        else
        {
            return "";
        }
    }

    //--------------------------------------------------
	// Número
	//--------------------------------------------------

	value = Number(value);

	if (isNaN(value) || value < 0)
	{
		return "";
	}

	decimals = decimals ?? 3;

    //--------------------------------------------------
    // Menos de un minuto
    //--------------------------------------------------

    if (value < 60)
	{
		return value.toFixed(decimals);
	}

    //--------------------------------------------------
    // Minutos
    //--------------------------------------------------

    const minutes = Math.floor(value / 60);

    const seconds = value - (minutes * 60);

    return (
		minutes +
		":" +
		seconds
			.toFixed(decimals)
			.padStart(decimals + 3, "0")
	);
};

//--------------------------------------------------
// Formato cronómetro Broadcast (LIVE)
//--------------------------------------------------

BS90.Time.Live = function (value)
{
    //--------------------------------------------------
    // Sin datos
    //--------------------------------------------------

    if (value == null)
    {
        return "";
    }

    //--------------------------------------------------
    // TimeSpan (.NET)
    //--------------------------------------------------

    if (typeof value === "object")
    {
        if (value.TotalSeconds != null)
        {
            value = value.TotalSeconds;
        }
        else
        {
            return "";
        }
    }

    //--------------------------------------------------
    // Número
    //--------------------------------------------------

    value = Number(value);

    if (isNaN(value) || value < 0)
    {
        return "";
    }

    //--------------------------------------------------
    // Truncar a 1 decimal (NO redondear)
    //--------------------------------------------------

    value = Math.floor(value * 10) / 10;

    //--------------------------------------------------
    // Menos de un minuto
    //--------------------------------------------------

    if (value < 60)
    {
        return value.toFixed(1);
    }

    //--------------------------------------------------
    // Minutos
    //--------------------------------------------------

    const minutes = Math.floor(value / 60);

    const seconds = value - (minutes * 60);

    return (
        minutes +
        ":" +
        seconds.toFixed(1).padStart(4, "0")
    );
};

BS90.Time.Seconds = function(value)
{
    if (value == null)
    {
        return null;
    }

    if (typeof value === "object")
    {
        if (value.TotalSeconds != null)
        {
            return value.TotalSeconds;
        }

        return null;
    }

    value = Number(value);

    return isNaN(value) ? null : value;
};

//--------------------------------------------------
// GAP
//--------------------------------------------------

BS90.Time.Gap = function (value)
{
    //--------------------------------------------------
    // Sin datos
    //--------------------------------------------------

    if (value == null)
    {
        return "";
    }

    value = Number(value);

    if (isNaN(value))
    {
        return "";
    }

    //--------------------------------------------------
    // Signo
    //--------------------------------------------------

    if (value >= 0)
	{
		return "+" + value.toFixed(3);
	}

	return value.toFixed(3);

    //--------------------------------------------------
    // Formato
    //--------------------------------------------------

    return sign + value.toFixed(3);
};