/* ==========================================================================
   Black Rite Shop — autenticación
   Contraseña con scrypt, sesiones en base de datos y bloqueo por intentos.
   ========================================================================== */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const ALGORITMO = "scrypt";
const LARGO_HASH = 64;
const LARGO_MINIMO = 8;
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const SESION_HORAS = 12;

const ALFABETO = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function hashPassword(password) {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), sal, LARGO_HASH).toString("hex");
  return `${ALGORITMO}$${sal}$${hash}`;
}

export function verifyPassword(password, almacenado) {
  if (typeof almacenado !== "string") {
    return false;
  }
  const partes = almacenado.split("$");
  if (partes.length !== 3 || partes[0] !== ALGORITMO) {
    return false;
  }
  const [, sal, esperadoHex] = partes;
  let esperado;
  try {
    esperado = Buffer.from(esperadoHex, "hex");
  } catch {
    return false;
  }
  if (esperado.length !== LARGO_HASH) {
    return false;
  }
  const intento = scryptSync(String(password), sal, LARGO_HASH);
  return timingSafeEqual(intento, esperado);
}

export function generarPassword(largo = 12) {
  const bytes = randomBytes(largo);
  let salida = "";
  for (let i = 0; i < largo; i += 1) {
    salida += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return salida;
}

export function validarPassword(password) {
  if (typeof password !== "string" || password.length < LARGO_MINIMO) {
    return { ok: false, motivo: `La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.` };
  }
  return { ok: true };
}

/**
 * Crea el gestor de autenticación.
 * La contraseña se toma de `passwordHash` (env) o de la base de datos.
 * Si no hay ninguna, se genera una aleatoria de un solo uso y se avisa.
 */
export function createAuth({ db, passwordHash = "", usuario = "admin" }) {
  let hash = String(passwordHash || "").trim() || db.getMeta("admin_hash");
  let passwordInicial = null;

  if (!hash) {
    passwordInicial = generarPassword();
    hash = hashPassword(passwordInicial);
    db.setMeta("admin_hash", hash);
  }

  const nombreUsuario = String(usuario || db.getMeta("admin_user") || "admin");
  const intentos = new Map();

  function claveIp(ip) {
    return String(ip || "desconocida");
  }

  function bloqueado(ip) {
    const registro = intentos.get(claveIp(ip));
    if (!registro) {
      return 0;
    }
    if (Date.now() > registro.hasta) {
      intentos.delete(claveIp(ip));
      return 0;
    }
    return registro.fallos >= MAX_INTENTOS ? registro.hasta - Date.now() : 0;
  }

  function registrarFallo(ip) {
    const clave = claveIp(ip);
    const actual = intentos.get(clave) || { fallos: 0, hasta: Date.now() + VENTANA_MS };
    actual.fallos += 1;
    actual.hasta = Date.now() + VENTANA_MS;
    intentos.set(clave, actual);
    return Math.max(0, MAX_INTENTOS - actual.fallos);
  }

  function limpiarIntentos(ip) {
    intentos.delete(claveIp(ip));
  }

  function autenticar(usuarioIn, passwordIn, ip) {
    const espera = bloqueado(ip);
    if (espera > 0) {
      return {
        ok: false,
        codigo: "BLOQUEADO",
        motivo: `Demasiados intentos. Espera ${Math.ceil(espera / 60000)} minutos.`
      };
    }

    const usuarioOk = String(usuarioIn || "").trim().toLowerCase() === nombreUsuario.toLowerCase();
    const claveOk = verifyPassword(String(passwordIn || ""), hash);

    if (!usuarioOk || !claveOk) {
      const restantes = registrarFallo(ip);
      return {
        ok: false,
        codigo: "CREDENCIALES",
        motivo:
          restantes > 0
            ? `Usuario o contraseña incorrectos. Te quedan ${restantes} intentos.`
            : "Demasiados intentos. Espera unos minutos."
      };
    }

    limpiarIntentos(ip);
    return { ok: true };
  }

  const ahora = () => new Date();

  function crearSesion(ip) {
    const id = randomBytes(32).toString("hex");
    const expira = new Date(ahora().getTime() + SESION_HORAS * 3600 * 1000);
    db.createSession({ id, usuario: nombreUsuario, ip: String(ip || ""), expiraEn: expira.toISOString() });
    return id;
  }

  function sesionDe(id) {
    if (!id || !/^[a-f0-9]{64}$/.test(id)) {
      return null;
    }
    const sesion = db.getSession(id);
    if (!sesion) {
      return null;
    }
    if (new Date(sesion.expira_en).getTime() <= Date.now()) {
      db.deleteSession(id);
      return null;
    }
    return sesion;
  }

  function cerrarSesion(id) {
    if (id) {
      db.deleteSession(id);
    }
  }

  return {
    usuario: nombreUsuario,
    passwordInicial,
    autenticar,
    crearSesion,
    sesionDe,
    cerrarSesion,
    duracionHoras: SESION_HORAS
  };
}
