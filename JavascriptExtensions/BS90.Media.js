//----------------------------------------------------------
//
// BS90 Media
//
// Comunicación con iRTM
//
//----------------------------------------------------------

BS90.Media = {};

//----------------------------------------------------------
// Configuración
//----------------------------------------------------------

BS90.Media.ApiUrl =
    "http://127.0.0.1:8000/api";
	
	
	//----------------------------------------------------------
	// Ping
	//----------------------------------------------------------

	BS90.Media.Ping = async function ()
	{
		try
		{
			const response = await fetch(

				BS90.Media.ApiUrl + "/media/ping"

			);

			if (!response.ok)
				return "Sin conexión";

			const json = await response.json();

			return json.service;
		}
		catch
		{
			return "Sin conexión";
		}
	};
	
	BS90.Media.Test = function ()
{
    return typeof fetch;
};