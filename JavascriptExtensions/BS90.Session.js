//----------------------------------------------------------
// BetaSimCode SHD
// BS90.Session
//----------------------------------------------------------

if (!globalThis.BS90)
    globalThis.BS90 = {};

BS90.Session = BS90.Session || {};

//----------------------------------------------------------
// Driver
//----------------------------------------------------------

BS90.Session.Driver = function (carIdx)
{
    const idx =
        String(carIdx).padStart(2, "0");

    const root =
        "DataCorePlugin.GameRawData.SessionData.DriverInfo.Drivers" + idx;

    return {

        driverName:
            $prop(root + ".UserName"),
			
		memberId:
			$prop(root + ".UserID"),	

        teamName:
            $prop(root + ".TeamName"),

        carNumber:
            $prop(root + ".CarNumber"),

        irating:
            $prop(root + ".IRating"),

        carClassId:
            $prop(root + ".CarClassID"),

        carName:
            $prop(root + ".CarScreenNameShort")

    };
};