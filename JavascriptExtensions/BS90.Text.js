//----------------------------------------------------------
// BetaSimCode SHD
// BS90.Text
//----------------------------------------------------------

if (!globalThis.BS90)
    globalThis.BS90 = {};

BS90.Text = BS90.Text || {};

//----------------------------------------------------------
// Convertir texto a MAYÚSCULAS
//----------------------------------------------------------

BS90.Text.ToUpper = function (text)
{
    if (text == null)
        return "";

    return String(text).toUpperCase();
};

//----------------------------------------------------------
// Convertir texto a minúsculas
//----------------------------------------------------------

BS90.Text.ToLower = function (text)
{
    if (text == null)
        return "";

    return String(text).toLowerCase();
};

//----------------------------------------------------------
// Capitalizar primera letra
//----------------------------------------------------------

BS90.Text.Capitalize = function (text)
{
    if (!text)
        return "";

    text = String(text);

    return text.charAt(0).toUpperCase() +
           text.slice(1).toLowerCase();
};

//----------------------------------------------------------
// Obtener apellido para Broadcast
//----------------------------------------------------------

BS90.Text.LastName = function (text)
{
    if (!text)
        return "";

    const ignore = [

        "JR",
        "JR.",
        "SR",
        "SR.",
        "II",
        "III",
        "IV"

    ];

    const parts =
        String(text)
            .trim()
            .split(/\s+/);

    while (parts.length)
    {
        const word =
            parts.pop().toUpperCase();

        if (!ignore.includes(word))
        {
            return word;
        }
    }

    return "";
};