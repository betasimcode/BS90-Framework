//----------------------------------------------------------
// BS90.Delta
// Delta engine propio para SimHub / iRacing.
//
// Convenciones:
//   delta > 0: más lento que la referencia
//   delta < 0: más rápido que la referencia
//
// Los deltas sólo cambian al completar un sector. La lectura
// conserva ese resultado durante unos segundos; el cronómetro
// de sectores sigue funcionando independientemente.
//----------------------------------------------------------

(function (global)
{
    "use strict";

    if (!global.BS90) global.BS90 = {};
    const BS90 = global.BS90;
    BS90.Delta = BS90.Delta || {};

    const CONFIG = {
        splitFreezeSeconds: 3,
        finishFreezeSeconds: 8,
        neutralThreshold: 0.05,

        colors: {
            neutral: "#FF444444",
            slower: "#FFFFB52E",
            faster: "#FF00FF02",
            fastest: "#FFC500CE",
            unavailable: "#FF777777"
        }
    };

    const State = {
        initialized: false,
        lastProcessedSessionTime: null,
        seenLapNumber: null,
        seenSectorCount: 0,

        bestLap: null,
        lastCompleted: null,

        sectorNumber: null,
        sectorDelta: null,
        cumulativeDelta: null,

        frozenUntil: 0,
        displayState: "waiting",
        status: "Waiting for telemetry"
    };

    function read(path)
    {
        try { return $prop(path); }
        catch (error) { return null; }
    }

    function toNumber(value)
    {
        if (value === null || value === undefined || value === "") return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }

    function cloneLap(lap)
    {
        return {
            number: lap.number,
            lapTime: lap.lapTime,
            sectors: lap.sectors.map(function (sector)
            {
                return {
                    sector: sector.sector,
                    time: sector.time,
                    accumulated: sector.accumulated
                };
            })
        };
    }

    function validLap(lap)
    {
        if (!lap || !Array.isArray(lap.sectors) || lap.sectors.length < 1 ||
            !(toNumber(lap.lapTime) > 0))
            return false;

        let sum = 0;
        let previousAccumulated = 0;

        for (let i = 0; i < lap.sectors.length; i++)
        {
            const sector = lap.sectors[i];
            const time = toNumber(sector && sector.time);
            const accumulated = toNumber(sector && sector.accumulated);

            if (!sector ||
                toNumber(sector.sector) !== i + 1 ||
                !(time > 0) ||
                !(accumulated > previousAccumulated))
                return false;

            sum += time;
            previousAccumulated = accumulated;
        }

        // Lap.EndLap derives lapTime from the last sector's accumulated time.
        return Math.abs(sum - toNumber(lap.lapTime)) < 0.25 &&
            Math.abs(previousAccumulated - toNumber(lap.lapTime)) < 0.25;
    }

    function snapshot()
    {
        return {
            sector: {
                number: State.sectorNumber,
                delta: State.sectorDelta
            },
            bestLap: {
                sector: State.sectorDelta,
                cumulative: State.cumulativeDelta
            },
            // No inventamos una referencia de sesión: los mejores sectores
            // independientes no garantizan una vuelta real de referencia.
            sessionFastest: {
                sector: null,
                cumulative: null
            },
            lastCompleted: State.lastCompleted,
            personalBestLapTime: State.bestLap ? State.bestLap.lapTime : null,
            displayState: State.displayState,
            status: State.status
        };
    }

    function formatDelta(value)
    {
        const n = toNumber(value);
        if (n === null) return "--.-";

        // Truncar a una décima; no redondear la presentación.
        // Ej.: 4.99 -> +4.9, -4.99 -> -4.9.
        const truncated = Math.trunc(n * 10) / 10;
        const sign = truncated > 0 ? "+" : truncated < 0 ? "-" : "";
        return sign + Math.abs(truncated).toFixed(1);
    }

    function deltaColor(value)
    {
        const n = toNumber(value);

        if (n === null) return CONFIG.colors.unavailable;
        if (Math.abs(n) < CONFIG.neutralThreshold) return CONFIG.colors.neutral;
        return n < 0 ? CONFIG.colors.faster : CONFIG.colors.slower;
    }

    function expectedSectorCount()
    {
        try
        {
            const trackId = String(read(
                "DataCorePlugin.GameRawData.SessionData.WeekendInfo.TrackID"
            ));
            const track = BS90.Data && BS90.Data.Tracks
                ? BS90.Data.Tracks[trackId]
                : null;

            if (track && Array.isArray(track.sectors))
                return track.sectors.length + 1;
        }
        catch (error) {}

        return null;
    }

    function lapMatchesTrack(lap)
    {
        const expected = expectedSectorCount();
        return expected === null || lap.sectors.length === expected;
    }

    function processCompletedLap(sessionTime)
    {
        const lapState = BS90.Lap && BS90.Lap.State;
        if (!lapState || !lapState.current || !lapState.previous)
            return false;

        const currentNumber = toNumber(lapState.current.number);
        if (currentNumber === null)
            return false;

        if (State.seenLapNumber === null)
        {
            State.seenLapNumber = currentNumber;
            return false;
        }

        if (currentNumber === State.seenLapNumber)
            return false;

        State.seenLapNumber = currentNumber;

        const completed = cloneLap(lapState.previous);
        const isValid = validLap(completed) && lapMatchesTrack(completed);
        const previousBest = State.bestLap;

        State.lastCompleted = {
            number: completed.number,
            lapTime: completed.lapTime || null,
            sectorCount: completed.sectors.length,
            valid: isValid
        };

        State.seenSectorCount = 0;

        if (!isValid)
        {
            State.status = "Completed lap rejected: incomplete or invalid sectors";
            State.displayState = "invalid";
            return true;
        }

        // Al cruzar meta, el display muestra el gap de vuelta completa
        // frente a la mejor vuelta PERSONAL anterior.
        if (previousBest)
        {
            const lapDelta = completed.lapTime - previousBest.lapTime;
            State.sectorNumber = completed.sectors.length;
            State.sectorDelta = lapDelta;
            State.cumulativeDelta = lapDelta;
            State.frozenUntil = sessionTime + CONFIG.finishFreezeSeconds;
            State.displayState = "lap";
            State.status = "Frozen completed-lap delta";
        }
        else
        {
            State.sectorNumber = completed.sectors.length;
            State.sectorDelta = null;
            State.cumulativeDelta = null;
            State.frozenUntil = sessionTime + CONFIG.finishFreezeSeconds;
            State.displayState = "lap";
            State.status = "First valid lap recorded; reference established";
        }

        // Comparar primero con la referencia anterior y actualizarla después.
        const personalBest = !State.bestLap ||
            completed.lapTime < State.bestLap.lapTime;

        if (personalBest)
        {
            State.bestLap = completed;
            if (previousBest)
                State.displayState = "personal-best-lap";
        }

        return true;
    }

    function processNewSector(sessionTime)
    {
        const lapState = BS90.Lap && BS90.Lap.State;
        const sectors = lapState && lapState.current &&
            Array.isArray(lapState.current.sectors)
            ? lapState.current.sectors
            : [];

        const count = sectors.length;
        if (count <= State.seenSectorCount)
            return false;

        // Si el script empieza a mitad de vuelta, no convertir sectores
        // antiguos en eventos nuevos. Se procesa sólo el último sector
        // que haya aparecido desde el último refresco.
        const completed = sectors[count - 1];
        State.seenSectorCount = count;

        if (!completed)
            return false;

        const sectorNumber = toNumber(completed.sector);
        const index = sectorNumber === null ? -1 : sectorNumber - 1;

        if (!State.bestLap || index < 0 || !State.bestLap.sectors[index])
        {
            State.sectorNumber = sectorNumber;
            State.sectorDelta = null;
            State.cumulativeDelta = null;
            State.status = "Waiting for a matching personal-best sector";
            State.displayState = "unavailable";
            State.frozenUntil = sessionTime + CONFIG.splitFreezeSeconds;
            return true;
        }

        const reference = State.bestLap.sectors[index];
        const sectorTime = toNumber(completed.time);
        const accumulated = toNumber(completed.accumulated);
        const referenceTime = toNumber(reference.time);
        const referenceAccumulated = toNumber(reference.accumulated);

        if (sectorTime === null || accumulated === null ||
            referenceTime === null || referenceAccumulated === null)
            return false;

        State.sectorNumber = sectorNumber;
        State.sectorDelta = sectorTime - referenceTime;
        State.cumulativeDelta = accumulated - referenceAccumulated;
        State.frozenUntil = sessionTime + CONFIG.splitFreezeSeconds;
        State.displayState = "sector";
        State.status = "Frozen split delta";

        return true;
    }

    BS90.Delta.Update = function ()
    {
        if (!BS90.Sectors || typeof BS90.Sectors.Update !== "function" ||
            !BS90.Lap || !BS90.Lap.State)
        {
            State.status = "BS90.Sectors or BS90.Lap unavailable";
            return snapshot();
        }

        // Sectors.Update is idempotent per telemetry tick, so this remains
        // safe when several dashboard properties call into BS90.Delta.
        BS90.Sectors.Update();

        const sessionTime = toNumber(read(
            "DataCorePlugin.GameRawData.Telemetry.SessionTime"
        ));

        if (sessionTime === null || !BS90.Sectors.State ||
            !BS90.Sectors.State.initialized)
        {
            State.status = "Waiting for telemetry";
            return snapshot();
        }

        if (State.lastProcessedSessionTime === sessionTime)
            return snapshot();

        State.lastProcessedSessionTime = sessionTime;

        const lapChanged = processCompletedLap(sessionTime);
        if (lapChanged)
        {
            State.initialized = true;
            return snapshot();
        }

        if (!State.initialized)
        {
            State.seenLapNumber = toNumber(BS90.Lap.State.current.number);
            State.seenSectorCount = Array.isArray(BS90.Lap.State.current.sectors)
                ? BS90.Lap.State.current.sectors.length
                : 0;
            State.initialized = true;
            State.status = "Waiting for next completed sector";
            return snapshot();
        }

        // A new split takes precedence over an older frozen display.
        if (processNewSector(sessionTime))
            return snapshot();

        if (State.frozenUntil > sessionTime)
            return snapshot();

        State.frozenUntil = 0;

        // El resultado congelado es temporal: al vencer el intervalo,
        // limpiar los valores visibles hasta completar el siguiente sector.
        State.sectorDelta = null;
        State.cumulativeDelta = null;
        State.sectorNumber = null;

        if (!State.bestLap)
        {
            State.displayState = "waiting";
            State.status = "Waiting for first valid completed lap";
        }
        else
        {
            State.displayState = "ready";
            State.status = "Ready; waiting for next sector split";
        }

        return snapshot();
    };

    // Pure snapshot read; it never advances the timing state.
    BS90.Delta.Get = function () { return snapshot(); };
    BS90.Delta.Status = function ()
    {
        BS90.Delta.Update();
        return State.status;
    };
    BS90.Delta.Format = formatDelta;

    // The public value getters refresh the engine. Repeated calls are safe:
    // both Sectors and Delta deduplicate processing by telemetry SessionTime.
    BS90.Delta.SectorToBestLap = function ()
    {
        BS90.Delta.Update();
        return State.sectorDelta;
    };

    BS90.Delta.CumulativeToBestLap = function ()
    {
        BS90.Delta.Update();
        return State.cumulativeDelta;
    };

    BS90.Delta.SectorToBestLapFormatted = function ()
    {
        BS90.Delta.Update();
        return formatDelta(State.sectorDelta);
    };

    BS90.Delta.CumulativeToBestLapFormatted = function ()
    {
        BS90.Delta.Update();
        return formatDelta(State.cumulativeDelta);
    };

    BS90.Delta.SectorColor = function ()
    {
        BS90.Delta.Update();
        return State.displayState === "personal-best-lap"
            ? CONFIG.colors.fastest
            : deltaColor(State.sectorDelta);
    };

    BS90.Delta.CumulativeColor = function ()
    {
        BS90.Delta.Update();
        return State.displayState === "personal-best-lap"
            ? CONFIG.colors.fastest
            : deltaColor(State.cumulativeDelta);
    };

    BS90.Delta.ColorForDelta = deltaColor;

    BS90.Delta.SectorToFastestLap = function () { return null; };
    BS90.Delta.CumulativeToFastestLap = function () { return null; };
    BS90.Delta.SectorToFastestLapFormatted = function () { return "--.-"; };
    BS90.Delta.CumulativeToFastestLapFormatted = function () { return "--.-"; };

})(globalThis);
