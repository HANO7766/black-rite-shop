/* ==========================================================================
   Black Rite Shop — servidor HTTP
   Rutas server-rendered, formularios clásicos y cero dependencias.
   ========================================================================== */

import http from "node:http";
import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { ShopDatabase, TALLAS } from "./db.mjs";
import {
  adminOrdersPage,
  adminProductFormPage,
  adminProductsPage,
  cartPage,
  catalogPage,
  checkoutPage,
  homePage,
  layout,
  notFoundPage,
  orderPage,
  productPage
} from "./views.mjs";

const MAX_BODY = 64 * 1024;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "script-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'"
].join("; ");

const ENVIO = { santiago: 3500, regiones: 4500, gratisSantiago: 40000, gratisRegiones: 60000 };

/* ---------------------------------------------------------------- helpers */

function parseCookies(header) {
  const salida = {};
  String(header || "")
    .split(";")
    .forEach((par) => {
      const i = par.indexOf("=");
      if (i > 0) {
        salida[par.slice(0, i).trim()] = decodeURIComponent(par.slice(i + 1).trim());
      }
    });
  return salida;
}

async function readForm(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY) {
      throw new Error("La solicitud es demasiado grande.");
    }
    chunks.push(chunk);
  }
  const cuerpo = Buffer.concat(chunks).toString("utf8");
  const datos = {};
  new URLSearchParams(cuerpo).forEach((valor, clave) => {
    datos[clave] = valor;
  });
  return datos;
}

function calcularEnvio(subtotal, region, metodo) {
  if (metodo === "retiro") {
    return 0;
  }
  const esSantiago = /metropolitana|santiago/i.test(region || "");
  if (esSantiago && subtotal >= ENVIO.gratisSantiago) {
    return 0;
  }
  if (!esSantiago && subtotal >= ENVIO.gratisRegiones) {
    return 0;
  }
  return esSantiago ? ENVIO.santiago : ENVIO.regiones;
}

function enviarHtml(response, status, html) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": CSP
  });
  response.end(html);
}

function redirigir(response, ubicacion, extraHeaders = {}) {
  response.writeHead(303, { Location: ubicacion, "Cache-Control": "no-store", ...extraHeaders });
  response.end();
}

/* ---------------------------------------------------------------- estáticos */

async function servirEstatico(response, pathname, rootDir) {
  if (!/^\/(?:css|js|assets)\//.test(pathname)) {
    return false;
  }
  const limpio = decodeURIComponent(pathname).replace(/^\/+/, "");
  const destino = path.resolve(rootDir, limpio);
  const raiz = path.resolve(rootDir);
  if (!destino.startsWith(`${raiz}${path.sep}`)) {
    return false;
  }
  try {
    const info = await stat(destino);
    if (!info.isFile()) {
      return false;
    }
    response.writeHead(200, {
      "Content-Type": MIME[path.extname(destino).toLowerCase()] || "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    });
    createReadStream(destino).pipe(response);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------- app */

export function createShopApp(options = {}) {
  if (!options.dbPath) {
    throw new Error("createShopApp requiere dbPath.");
  }

  const rootDir = path.resolve(options.rootDir || process.cwd());
  const db = new ShopDatabase(options.dbPath);
  const logger = options.logger || console;

  function contexto(request, response) {
    const cookies = parseCookies(request.headers.cookie);
    let cartId = cookies.br_cart;
    let cookieNueva = false;

    if (!cartId || !/^[a-f0-9]{32}$/.test(cartId)) {
      cartId = randomBytes(16).toString("hex");
      cookieNueva = true;
      db.ensureCart(cartId);
    }

    if (cookieNueva) {
      response.setHeader(
        "Set-Cookie",
        `br_cart=${cartId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
      );
    }

    return { cartId, carrito: db.getCart(cartId) };
  }

  async function manejar(request, response) {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const pathname = url.pathname;
    const metodo = request.method;

    if (await servirEstatico(response, pathname, rootDir)) {
      return;
    }

    const { cartId, carrito } = contexto(request, response);
    const unidades = carrito.unidades;

    /* ------------------------------------------------------------- home */
    if (pathname === "/" && metodo === "GET") {
      return enviarHtml(
        response,
        200,
        homePage({
          destacados: db.listDestacados(4),
          recientes: db.listRecientes(8),
          categorias: db.listCategorias(),
          carrito: unidades
        })
      );
    }

    /* --------------------------------------------------------- catálogo */
    if (pathname === "/tienda" && metodo === "GET") {
      const categoria = url.searchParams.get("cat") || "";
      const talla = url.searchParams.get("talla") || "";
      const q = url.searchParams.get("q") || "";
      const orden = url.searchParams.get("orden") || "nuevo";
      const pagina = Number(url.searchParams.get("pagina") || 1);

      const resultado = db.listProducts({ categoria, talla, q, orden, pagina });
      return enviarHtml(
        response,
        200,
        catalogPage({
          productos: resultado.items,
          total: resultado.total,
          paginas: resultado.paginas,
          pagina: resultado.pagina,
          categoria,
          talla,
          q,
          orden,
          carrito: unidades
        })
      );
    }

    /* ---------------------------------------------------------- producto */
    const productoMatch = /^\/producto\/([a-z0-9-]+)$/.exec(pathname);
    if (productoMatch && metodo === "GET") {
      const producto = db.getProductBySlug(productoMatch[1]);
      if (!producto) {
        return enviarHtml(response, 404, notFoundPage());
      }
      return enviarHtml(
        response,
        200,
        productPage({
          producto,
          relacionados: db.listRelacionados(producto, 4),
          carrito: unidades
        })
      );
    }

    /* ------------------------------------------------------------ carrito */
    if (pathname === "/carrito/agregar" && metodo === "POST") {
      const datos = await readForm(request);
      const producto = db.getProductBySlug(datos.slug || "");
      const cantidad = Number(datos.cantidad || 1);
      if (!producto) {
        return enviarHtml(response, 404, notFoundPage());
      }
      const variante = producto.variants.find((v) => v.id === datos.variant);
      if (!variante) {
        return enviarHtml(
          response,
          400,
          productPage({
            producto,
            relacionados: db.listRelacionados(producto, 4),
            carrito: unidades,
            error: "Elige una talla antes de añadir al carrito."
          })
        );
      }
      db.addToCart(cartId, variante.id, cantidad);
      const referer = request.headers.referer;
      let destino = "/carrito";
      if (referer) {
        try {
          const ref = new URL(referer);
          if (!ref.pathname.includes("/carrito")) {
            destino = `${ref.pathname}${ref.search}`;
          }
        } catch {
          /* referer inválido: se ignora */
        }
      }
      db.touchCart(cartId);
      return redirigir(response, destino);
    }

    if (pathname === "/carrito/cantidad" && metodo === "POST") {
      const datos = await readForm(request);
      db.setCartQuantity(cartId, datos.variant, datos.cantidad);
      return redirigir(response, "/carrito");
    }

    if (pathname === "/carrito/quitar" && metodo === "POST") {
      const datos = await readForm(request);
      db.removeFromCart(cartId, datos.variant);
      return redirigir(response, "/carrito");
    }

    if (pathname === "/carrito" && metodo === "GET") {
      return enviarHtml(response, 200, cartPage({ carrito, productos: carrito.items }));
    }

    /* ----------------------------------------------------------- checkout */
    if (pathname === "/checkout" && metodo === "GET") {
      if (!carrito.items.length) {
        return redirigir(response, "/carrito");
      }
      return enviarHtml(
        response,
        200,
        checkoutPage({
          carrito,
          productos: carrito.items,
          envio: calcularEnvio(carrito.subtotal, "Metropolitana", "domicilio")
        })
      );
    }

    if (pathname === "/checkout" && metodo === "POST") {
      if (!carrito.items.length) {
        return redirigir(response, "/carrito");
      }
      const datos = await readForm(request);
      const cliente = {
        nombre: String(datos.nombre || "").trim(),
        email: String(datos.email || "").trim(),
        telefono: String(datos.telefono || "").trim(),
        direccion: datos.metodo === "retiro" ? "Retiro coordinado" : String(datos.direccion || "").trim(),
        comuna: String(datos.comuna || "").trim(),
        region: String(datos.region || "").trim()
      };

      const faltante = ["nombre", "email", "telefono", "comuna", "region"].find((campo) => !cliente[campo]);
      if (faltante || (datos.metodo !== "retiro" && !cliente.direccion)) {
        return enviarHtml(
          response,
          422,
          checkoutPage({
            carrito,
            productos: carrito.items,
            envio: calcularEnvio(carrito.subtotal, cliente.region, datos.metodo),
            error: "Revisa los campos obligatorios."
          })
        );
      }

      const metodoEnvio = datos.metodo === "retiro" ? "retiro" : "domicilio";
      const envio = calcularEnvio(carrito.subtotal, cliente.region, metodoEnvio);
      const resultado = db.createOrder({
        cartId,
        cliente,
        envio,
        metodoEnvio,
        notas: String(datos.notas || "").trim()
      });

      if (!resultado.ok) {
        return enviarHtml(
          response,
          409,
          checkoutPage({
            carrito,
            productos: carrito.items,
            envio,
            error: resultado.motivo
          })
        );
      }

      return redirigir(response, `/orden/${resultado.order.numero}?nuevo=1`);
    }

    /* -------------------------------------------------------------- orden */
    const ordenMatch = /^\/orden\/(BR-\d{6})$/.exec(pathname);
    if (ordenMatch && metodo === "GET") {
      const orden = db.getOrder(ordenMatch[1]);
      if (!orden) {
        return enviarHtml(response, 404, notFoundPage());
      }
      return enviarHtml(
        response,
        200,
        orderPage({ orden, recienCreada: url.searchParams.get("nuevo") === "1" })
      );
    }

    /* -------------------------------------------------------------- admin */
    if (pathname === "/admin" && metodo === "GET") {
      return enviarHtml(response, 200, adminProductsPage({ productos: db.listAllProducts() }));
    }

    if (pathname === "/admin/ordenes" && metodo === "GET") {
      return enviarHtml(response, 200, adminOrdersPage({ ordenes: db.listOrders() }));
    }

    if (pathname === "/admin/producto/nuevo" && metodo === "GET") {
      return enviarHtml(response, 200, adminProductFormPage({ producto: null }));
    }

    const editarMatch = /^\/admin\/producto\/([a-f0-9-]{36})$/.exec(pathname);
    if (editarMatch && metodo === "GET") {
      const producto = db.getProductById(editarMatch[1]);
      if (!producto) {
        return enviarHtml(response, 404, notFoundPage());
      }
      return enviarHtml(response, 200, adminProductFormPage({ producto }));
    }

    if (pathname === "/admin/producto" && metodo === "POST") {
      const datos = await readForm(request);
      const resultado = db.saveProduct(datos);
      if (!resultado.ok) {
        return enviarHtml(
          response,
          422,
          adminProductFormPage({ producto: { ...datos, variants: [], id: null }, error: resultado.motivo })
        );
      }
      return redirigir(response, "/admin");
    }

    const guardarMatch = /^\/admin\/producto\/([a-f0-9-]{36})$/.exec(pathname);
    if (guardarMatch && metodo === "POST") {
      const datos = await readForm(request);
      const resultado = db.saveProduct({ ...datos, id: guardarMatch[1] });
      if (!resultado.ok) {
        return enviarHtml(
          response,
          422,
          adminProductFormPage({ producto: db.getProductById(guardarMatch[1]), error: resultado.motivo })
        );
      }
      return redirigir(response, "/admin");
    }

    const borrarMatch = /^\/admin\/producto\/([a-f0-9-]{36})\/eliminar$/.exec(pathname);
    if (borrarMatch && metodo === "POST") {
      db.deleteProduct(borrarMatch[1]);
      return redirigir(response, "/admin");
    }

    const estadoMatch = /^\/admin\/orden\/([a-f0-9-]{36})\/estado$/.exec(pathname);
    if (estadoMatch && metodo === "POST") {
      const datos = await readForm(request);
      db.setOrderStatus(estadoMatch[1], datos.estado);
      return redirigir(response, "/admin/ordenes");
    }

    /* ---------------------------------------------------------------- 404 */
    return enviarHtml(response, 404, notFoundPage());
  }

  const server = http.createServer((request, response) => {
    const inicio = Date.now();
    response.on("finish", () => {
      logger.log(`${request.method} ${request.url} ${response.statusCode} ${Date.now() - inicio}ms`);
    });

    manejar(request, response).catch((error) => {
      logger.error("Error no controlado:", error);
      if (!response.headersSent) {
        enviarHtml(
          response,
          500,
          layout({
            titulo: "Error",
            carrito: 0,
            cuerpo: `<section class="shell empty"><p class="empty__title">Algo salió mal</p><p class="empty__copy">Intenta de nuevo en unos segundos.</p><a class="btn btn--primary" href="/">Volver al inicio</a></section>`
          })
        );
      }
    });
  });

  return {
    server,
    db,
    close: () => {
      db.close();
      return new Promise((resolve) => server.close(resolve));
    }
  };
}

export const TALLAS_VALIDAS = TALLAS;
