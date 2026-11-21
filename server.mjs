#!/usr/bin/env node
/* ==========================================================================
   Black Rite Shop — entrypoint
   ========================================================================== */

import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createShopApp } from "./server/app.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(ROOT, "data", "shop.db");

function direccionesLan() {
  const salida = [];
  const ignorar = /loopback|virtual|vmware|vbox|virtualbox|bluetooth|vethernet|wi-fi direct|wsl/i;
  for (const [nombre, interfaces] of Object.entries(os.networkInterfaces())) {
    if (ignorar.test(nombre)) {
      continue;
    }
    for (const item of interfaces || []) {
      if (item.family === "IPv4" && !item.internal && !item.address.startsWith("169.254.")) {
        salida.push({ nombre, address: item.address });
      }
    }
  }
  return salida;
}

const app = createShopApp({ dbPath: DB_PATH, rootDir: ROOT });

app.server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`El puerto ${PORT} está ocupado. Prueba: $env:PORT=8081; npm start`);
  } else {
    console.error("No se pudo iniciar el servidor:", error.message);
  }
  app.db.close();
  process.exitCode = 1;
});

app.server.listen(PORT, HOST, () => {
  console.log("");
  console.log("BLACK RITE SHOP - servidor activo");
  console.log(`  Tienda:    http://127.0.0.1:${PORT}`);
  for (const item of direccionesLan()) {
    console.log(`  Red local: http://${item.address}:${PORT}  (${item.nombre})`);
  }
  console.log(`  Admin:     http://127.0.0.1:${PORT}/admin`);
  console.log(`  Base:      ${DB_PATH}`);

  if (app.auth && app.auth.passwordInicial) {
    console.log("");
    console.log("  ==================================================");
    console.log("   CONTRASENA INICIAL DEL PANEL (anotala)");
    console.log("  ==================================================");
    console.log(`   usuario:    ${app.auth.usuario}`);
    console.log(`   contrasena: ${app.auth.passwordInicial}`);
    console.log("  ==================================================");
    console.log("   Cambiala con: npm run set-password");
    console.log("");
  }

  console.log("");
});

let cerrando = false;
async function apagar() {
  if (cerrando) {
    return;
  }
  cerrando = true;
  console.log("\nCerrando servidor...");
  await app.close();
  process.exit(0);
}

process.on("SIGINT", apagar);
process.on("SIGTERM", apagar);
