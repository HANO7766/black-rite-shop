#!/usr/bin/env node
/**
 * Cambia la contraseña del panel de administración.
 *
 *   npm run set-password -- "miClaveNueva123"
 *   npm run set-password            (la pide por consola, sin dejarla en el historial)
 *
 * La contraseña se guarda con scrypt en la base de datos, nunca en texto plano.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { ShopDatabase } from "../server/db.mjs";
import { hashPassword, validarPassword } from "../server/auth.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(ROOT, "data", "shop.db");

async function pedirPassword() {
  const rl = createInterface({ input: stdin, output: stdout });
  const clave = await rl.question("Nueva contraseña del panel: ");
  const repetida = await rl.question("Repite la contraseña: ");
  rl.close();

  if (clave !== repetida) {
    console.error("Las contraseñas no coinciden.");
    process.exit(1);
  }
  return clave;
}

const argumento = process.argv.slice(2).join(" ").trim();
const clave = argumento || (await pedirPassword());

const validacion = validarPassword(clave);
if (!validacion.ok) {
  console.error(validacion.motivo);
  process.exit(1);
}

const db = new ShopDatabase(DB_PATH);
db.setAdminHash(hashPassword(clave));
db.close();

console.log(`Contraseña actualizada en ${DB_PATH}`);
console.log("Reinicia el servidor si está corriendo con otra base.");
