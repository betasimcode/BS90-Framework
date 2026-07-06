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