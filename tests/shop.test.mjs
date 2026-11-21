/* ==========================================================================
   Black Rite Shop — pruebas de integración
   Cubre catálogo, ficha, carrito, checkout y administración.
   ========================================================================== */

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createShopApp } from "../server/app.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let tmp;
let app;
let base;
let cookie = "";

async function pedir(ruta, opciones = {}) {
  const { metodo = "GET", form, seguir = false } = opciones;
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    redirect: seguir ? "follow" : "manual",
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body: form ? new URLSearchParams(form).toString() : undefined
  });
  const setCookie = respuesta.headers.get("set-cookie");
  if (setCookie) {
    cookie = setCookie.split(";")[0];
  }
  return { status: respuesta.status, location: respuesta.headers.get("location"), html: await respuesta.text() };
}

before(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), "black-rite-shop-"));
  app = createShopApp({
    dbPath: path.join(tmp, "shop.db"),
    rootDir: ROOT,
    logger: { log() {}, error() {} }
  });
  await new Promise((resolver) => app.server.listen(0, "127.0.0.1", resolver));
  base = `http://127.0.0.1:${app.server.address().port}`;
});

after(async () => {
  await app.close();
  await rm(tmp, { recursive: true, force: true });
});

test("la home lista destacados y recientes", async () => {
  const { status, html } = await pedir("/");
  assert.equal(status, 200);
  assert.match(html, /Poleras de culto/);
  assert.match(html, /Destacados/);
  assert.match(html, /Metallica/);
  assert.match(html, /Recién llegados/);
});

test("el catálogo filtra por categoría y talla", async () => {
  const todo = await pedir("/tienda");
  assert.equal(todo.status, 200);
  assert.match(todo.html, /6 modelos/);

  const thrash = await pedir("/tienda?cat=thrash");
  assert.match(thrash.html, /Slayer/);
  assert.doesNotMatch(thrash.html, /Metallica/);

  const sinTallaXXL = await pedir("/tienda?talla=XXL");
  assert.match(sinTallaXXL.html, /Metallica/);
  assert.doesNotMatch(sinTallaXXL.html, /Pantera/);
});

test("la búsqueda ignora tildes", async () => {
  const { html } = await pedir(`/tienda?q=${encodeURIComponent("clasico")}`);
  assert.match(html, /Black Sabbath/);
});

test("la ficha muestra tallas y agotados", async () => {
  const { status, html } = await pedir("/producto/slayer-reign-in-blood");
  assert.equal(status, 200);
  assert.match(html, /Reign in Blood/);
  assert.match(html, /Talla/);
  assert.match(html, /agotado/);
  assert.match(html, /Añadir al carrito/);
});

test("el carrito recibe productos y calcula totales", async () => {
  const producto = app.db.getProductBySlug("metallica-master-of-puppets");
  const variante = producto.variants.find((v) => v.talla === "L");

  const agregar = await pedir("/carrito/agregar", {
    metodo: "POST",
    form: { slug: "metallica-master-of-puppets", variant: variante.id, cantidad: "2" }
  });
  assert.equal(agregar.status, 303);
  assert.ok(cookie.startsWith("br_cart="));

  const carrito = await pedir("/carrito");
  assert.equal(carrito.status, 200);
  assert.match(carrito.html, /Master of Puppets/);
  assert.match(carrito.html, /2 unidades/);
});

test("no se puede añadir sin elegir talla", async () => {
  const { status, html } = await pedir("/carrito/agregar", {
    metodo: "POST",
    form: { slug: "metallica-master-of-puppets", cantidad: "1" }
  });
  assert.equal(status, 400);
  assert.match(html, /Elige una talla/);
});

test("el checkout crea el pedido y descuenta stock", async () => {
  const antes = app.db.getProductBySlug("metallica-master-of-puppets");
  const stockAntes = antes.variants.find((v) => v.talla === "L").stock;

  const { status, location } = await pedir("/checkout", {
    metodo: "POST",
    form: {
      nombre: "Renato Prueba",
      email: "renato@ejemplo.cl",
      telefono: "+56 9 1234 5678",
      region: "Metropolitana",
      comuna: "Providencia",
      direccion: "Av. Providencia 123",
      metodo: "domicilio"
    }
  });

  assert.equal(status, 303);
  assert.match(location, /^\/orden\/BR-\d{6}\?nuevo=1$/);

  const numero = location.split("/")[2].split("?")[0];
  const orden = await pedir(`/orden/${numero}`);
  assert.equal(orden.status, 200);
  assert.match(orden.html, /Renato Prueba/);
  assert.match(orden.html, /pedido/i);

  const despues = app.db.getProductBySlug("metallica-master-of-puppets");
  const stockDespues = despues.variants.find((v) => v.talla === "L").stock;
  assert.equal(stockDespues, stockAntes - 2);

  const carritoVacio = await pedir("/carrito");
  assert.match(carritoVacio.html, /carrito está vacío/);
});

test("el checkout exige datos obligatorios", async () => {
  const producto = app.db.getProductBySlug("death-symbolic");
  const variante = producto.variants.find((v) => v.talla === "M");
  await pedir("/carrito/agregar", {
    metodo: "POST",
    form: { slug: "death-symbolic", variant: variante.id, cantidad: "1" }
  });

  const { status, html } = await pedir("/checkout", {
    metodo: "POST",
    form: { nombre: "", email: "", telefono: "", region: "", comuna: "", metodo: "domicilio" }
  });
  assert.equal(status, 422);
  assert.match(html, /campos obligatorios/);
});

test("el panel de administración lista productos y pedidos", async () => {
  const productos = await pedir("/admin");
  assert.equal(productos.status, 200);
  assert.match(productos.html, /6 productos/);
  assert.match(productos.html, /Nuevo producto/);

  const ordenes = await pedir("/admin/ordenes");
  assert.equal(ordenes.status, 200);
  assert.match(ordenes.html, /BR-000001/);
});

test("el administrador crea un producto con sus tallas", async () => {
  const creado = await pedir("/admin/producto", {
    metodo: "POST",
    form: {
      nombre: "Test · Producto Nuevo",
      categoria: "thrash",
      precio: "19990",
      imagen: "assets/placeholder.svg",
      descripcion: "Producto de prueba",
      stock_S: "1",
      stock_M: "2",
      stock_L: "3",
      stock_XL: "0",
      stock_XXL: "0",
      destacado: "1",
      activo: "1"
    }
  });
  assert.equal(creado.status, 303);

  const tienda = await pedir("/tienda?q=producto nuevo");
  assert.match(tienda.html, /Test · Producto Nuevo/);
});

test("cancelar un pedido devuelve el stock", async () => {
  const orden = app.db.listOrders()[0];
  const item = app.db.db.prepare("SELECT * FROM order_items WHERE order_id = ?").get(orden.id);
  const antes = app.db.db.prepare("SELECT stock FROM variants WHERE id = ?").get(item.variant_id).stock;

  const respuesta = await pedir(`/admin/orden/${orden.id}/estado`, {
    metodo: "POST",
    form: { estado: "cancelado" }
  });
  assert.equal(respuesta.status, 303);

  const despues = app.db.db.prepare("SELECT stock FROM variants WHERE id = ?").get(item.variant_id).stock;
  assert.equal(despues, antes + item.cantidad);
});

test("los archivos privados no se sirven", async () => {
  for (const ruta of ["/server.mjs", "/server/db.mjs", "/data/shop.db", "/css/../server.mjs"]) {
    const respuesta = await fetch(`${base}${ruta}`);
    assert.equal(respuesta.status, 404, `${ruta} no debe servirse`);
  }
});

test("una ruta inexistente devuelve 404 con la tienda", async () => {
  const { status, html } = await pedir("/producto/no-existe");
  assert.equal(status, 404);
  assert.match(html, /404/);
});
