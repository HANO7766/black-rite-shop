/* ==========================================================================
   Black Rite Shop — persistencia SQLite
   Driver nativo de Node (node:sqlite). Sin dependencias ni builds.
   ========================================================================== */

import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { SEED_PRODUCTS } from "./seed.mjs";

export const TALLAS = ["S", "M", "L", "XL", "XXL"];

const POR_PAGINA = 12;

export function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function slugify(texto) {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export class ShopDatabase {
  constructor(filename) {
    if (!filename) {
      throw new Error("ShopDatabase requiere una ruta de base de datos.");
    }
    this.filename = filename;

    if (filename !== ":memory:") {
      mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
    }

    this.db = new DatabaseSync(filename);
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec("PRAGMA busy_timeout = 4000;");
    if (filename !== ":memory:") {
      this.db.exec("PRAGMA journal_mode = WAL;");
      this.db.exec("PRAGMA synchronous = NORMAL;");
    }

    this.createSchema();
    this.ensureSeed();
  }

  /* ------------------------------------------------------------- esquema */

  createSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL,
        busqueda TEXT NOT NULL DEFAULT '',
        categoria TEXT NOT NULL,
        descripcion TEXT NOT NULL DEFAULT '',
        precio INTEGER NOT NULL CHECK (precio > 0),
        precio_anterior INTEGER,
        imagen TEXT NOT NULL DEFAULT '',
        destacado INTEGER NOT NULL DEFAULT 0 CHECK (destacado IN (0, 1)),
        activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
        creado_en TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS variants (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        talla TEXT NOT NULL CHECK (talla IN ('S', 'M', 'L', 'XL', 'XXL')),
        stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        UNIQUE (product_id, talla)
      );

      CREATE TABLE IF NOT EXISTS carts (
        id TEXT PRIMARY KEY,
        creado_en TEXT NOT NULL,
        actualizado_en TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cart_items (
        cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        variant_id TEXT NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
        cantidad INTEGER NOT NULL CHECK (cantidad > 0),
        PRIMARY KEY (cart_id, variant_id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        numero TEXT NOT NULL UNIQUE,
        estado TEXT NOT NULL DEFAULT 'pendiente',
        subtotal INTEGER NOT NULL,
        envio INTEGER NOT NULL,
        total INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL,
        telefono TEXT NOT NULL,
        direccion TEXT NOT NULL,
        comuna TEXT NOT NULL,
        region TEXT NOT NULL,
        metodo_envio TEXT NOT NULL,
        notas TEXT NOT NULL DEFAULT '',
        creado_en TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        variant_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        nombre TEXT NOT NULL,
        talla TEXT NOT NULL,
        precio INTEGER NOT NULL,
        cantidad INTEGER NOT NULL,
        imagen TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        usuario TEXT NOT NULL,
        ip TEXT NOT NULL DEFAULT '',
        creado_en TEXT NOT NULL,
        expira_en TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_expira ON sessions (expira_en);

      CREATE INDEX IF NOT EXISTS idx_products_cat ON products (categoria);
      CREATE INDEX IF NOT EXISTS idx_products_created ON products (creado_en DESC);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
    `);
  }

  getMeta(key) {
    const row = this.db.prepare("SELECT value FROM meta WHERE key = ?").get(key);
    return row ? row.value : null;
  }

  setMeta(key, value) {
    this.db
      .prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, String(value));
  }

  /* --------------------------------------------------------------- sesiones */

  createSession({ id, usuario, ip, expiraEn }) {
    this.db
      .prepare("INSERT INTO sessions (id, usuario, ip, creado_en, expira_en) VALUES (?, ?, ?, ?, ?)")
      .run(id, usuario, ip || "", new Date().toISOString(), expiraEn);
    this.deleteExpiredSessions();
  }

  getSession(id) {
    return this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) || null;
  }

  deleteSession(id) {
    this.db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  }

  deleteExpiredSessions() {
    this.db.prepare("DELETE FROM sessions WHERE expira_en <= ?").run(new Date().toISOString());
  }

  setAdminHash(hash) {
    this.setMeta("admin_hash", hash);
  }

  getAdminHash() {
    return this.getMeta("admin_hash");
  }

  ensureSeed() {
    if (this.getMeta("initialized") === "1") {
      return;
    }
    const insertProduct = this.db.prepare(`
      INSERT INTO products (id, slug, nombre, busqueda, categoria, descripcion, precio, precio_anterior, imagen, destacado, activo, creado_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    const insertVariant = this.db.prepare(
      "INSERT INTO variants (id, product_id, talla, stock) VALUES (?, ?, ?, ?)"
    );

    const ahora = new Date().toISOString();
    this.db.exec("BEGIN");
    try {
      SEED_PRODUCTS.forEach((producto, indice) => {
        const id = randomUUID();
        const creado = new Date(Date.now() - indice * 36e5).toISOString();
        insertProduct.run(
          id,
          producto.slug,
          producto.nombre,
          normalizar(`${producto.nombre} ${producto.categoria}`),
          producto.categoria,
          producto.descripcion,
          producto.precio,
          producto.precioAnterior ?? null,
          producto.imagen,
          producto.destacado ? 1 : 0,
          creado
        );
        for (const [talla, stock] of Object.entries(producto.stock)) {
          insertVariant.run(randomUUID(), id, talla, stock);
        }
      });
      this.setMeta("initialized", "1");
      this.setMeta("order_seq", "0");
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    void ahora;
  }

  /* ------------------------------------------------------------ catálogo */

  /**
   * Adjunta las variantes a una lista de productos con una sola consulta,
   * para evitar N+1 al pintar la grilla.
   */
  attachVariants(items) {
    if (!items.length) {
      return items;
    }
    const marcas = items.map(() => "?").join(",");
    const filas = this.db
      .prepare(
        `SELECT * FROM variants WHERE product_id IN (${marcas})
         ORDER BY CASE talla WHEN 'S' THEN 1 WHEN 'M' THEN 2 WHEN 'L' THEN 3 WHEN 'XL' THEN 4 ELSE 5 END`
      )
      .all(...items.map((item) => item.id));

    const porProducto = new Map();
    for (const fila of filas) {
      if (!porProducto.has(fila.product_id)) {
        porProducto.set(fila.product_id, []);
      }
      porProducto.get(fila.product_id).push(fila);
    }
    for (const item of items) {
      item.variants = porProducto.get(item.id) || [];
    }
    return items;
  }

  listProducts({ categoria = "", talla = "", q = "", orden = "nuevo", pagina = 1, porPagina = POR_PAGINA } = {}) {
    const where = ["p.activo = 1"];
    const params = [];

    if (categoria) {
      where.push("p.categoria = ?");
      params.push(categoria);
    }
    if (talla) {
      where.push(
        "EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.talla = ? AND v.stock > 0)"
      );
      params.push(talla);
    }
    if (q) {
      where.push("p.busqueda LIKE ?");
      params.push(`%${normalizar(q)}%`);
    }

    const filtro = where.join(" AND ");
    const ordenSql = {
      nuevo: "p.creado_en DESC",
      "precio-asc": "p.precio ASC",
      "precio-desc": "p.precio DESC",
      nombre: "p.nombre ASC"
    }[orden] || "p.creado_en DESC";

    const total = this.db
      .prepare(`SELECT COUNT(*) AS n FROM products p WHERE ${filtro}`)
      .get(...params).n;

    const paginas = Math.max(1, Math.ceil(total / porPagina));
    const actual = Math.min(Math.max(1, Number(pagina) || 1), paginas);
    const offset = (actual - 1) * porPagina;

    const items = this.db
      .prepare(
        `SELECT p.*, (SELECT COALESCE(SUM(v.stock), 0) FROM variants v WHERE v.product_id = p.id) AS stock_total
         FROM products p WHERE ${filtro}
         ORDER BY ${ordenSql}
         LIMIT ? OFFSET ?`
      )
      .all(...params, porPagina, offset);

    return { items: this.attachVariants(items), total, paginas, pagina: actual };
  }

  getProductBySlug(slug) {
    const producto = this.db.prepare("SELECT * FROM products WHERE slug = ? AND activo = 1").get(slug);
    if (!producto) {
      return null;
    }
    producto.variants = this.db
      .prepare("SELECT * FROM variants WHERE product_id = ? ORDER BY CASE talla WHEN 'S' THEN 1 WHEN 'M' THEN 2 WHEN 'L' THEN 3 WHEN 'XL' THEN 4 ELSE 5 END")
      .all(producto.id);
    producto.stockTotal = producto.variants.reduce((suma, v) => suma + v.stock, 0);
    return producto;
  }

  getProductById(id) {
    const producto = this.db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!producto) {
      return null;
    }
    producto.variants = this.db
      .prepare("SELECT * FROM variants WHERE product_id = ? ORDER BY CASE talla WHEN 'S' THEN 1 WHEN 'M' THEN 2 WHEN 'L' THEN 3 WHEN 'XL' THEN 4 ELSE 5 END")
      .all(producto.id);
    return producto;
  }

  listDestacados(limite = 4) {
    const filas = this.db
      .prepare(
        `SELECT p.*, (SELECT COALESCE(SUM(v.stock), 0) FROM variants v WHERE v.product_id = p.id) AS stock_total
         FROM products p WHERE p.activo = 1 AND p.destacado = 1
         ORDER BY p.creado_en DESC LIMIT ?`
      )
      .all(limite);
    return this.attachVariants(filas);
  }

  listRecientes(limite = 8) {
    const filas = this.db
      .prepare(
        `SELECT p.*, (SELECT COALESCE(SUM(v.stock), 0) FROM variants v WHERE v.product_id = p.id) AS stock_total
         FROM products p WHERE p.activo = 1
         ORDER BY p.creado_en DESC LIMIT ?`
      )
      .all(limite);
    return this.attachVariants(filas);
  }

  listAllProducts() {
    const filas = this.db
      .prepare(
        `SELECT p.*, (SELECT COALESCE(SUM(v.stock), 0) FROM variants v WHERE v.product_id = p.id) AS stock_total
         FROM products p ORDER BY p.creado_en DESC`
      )
      .all();
    return this.attachVariants(filas);
  }

  listCategorias() {
    return this.db
      .prepare(
        `SELECT categoria, COUNT(*) AS total FROM products WHERE activo = 1 GROUP BY categoria ORDER BY total DESC`
      )
      .all();
  }

  listRelacionados(producto, limite = 4) {
    const filas = this.db
      .prepare(
        `SELECT p.*, (SELECT COALESCE(SUM(v.stock), 0) FROM variants v WHERE v.product_id = p.id) AS stock_total
         FROM products p WHERE p.activo = 1 AND p.categoria = ? AND p.id != ?
         ORDER BY p.creado_en DESC LIMIT ?`
      )
      .all(producto.categoria, producto.id, limite);
    return this.attachVariants(filas);
  }

  /* -------------------------------------------------------------- carrito */

  ensureCart(id) {
    const existente = this.db.prepare("SELECT id FROM carts WHERE id = ?").get(id);
    if (existente) {
      return;
    }
    const ahora = new Date().toISOString();
    this.db.prepare("INSERT INTO carts (id, creado_en, actualizado_en) VALUES (?, ?, ?)").run(id, ahora, ahora);
  }

  getCart(cartId) {
    const items = this.db
      .prepare(
        `SELECT ci.variant_id AS variantId, ci.cantidad AS cantidad,
                v.talla AS talla, v.stock AS stock,
                p.id AS productId, p.nombre AS nombre, p.slug AS slug,
                p.precio AS precio, p.imagen AS imagen
         FROM cart_items ci
         JOIN variants v ON v.id = ci.variant_id
         JOIN products p ON p.id = v.product_id
         WHERE ci.cart_id = ?
         ORDER BY p.nombre`
      )
      .all(cartId);

    const subtotal = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
    const unidades = items.reduce((suma, item) => suma + item.cantidad, 0);
    return { items, subtotal, unidades };
  }

  cartUnidades(cartId) {
    const row = this.db
      .prepare("SELECT COALESCE(SUM(cantidad), 0) AS n FROM cart_items WHERE cart_id = ?")
      .get(cartId);
    return row.n;
  }

  addToCart(cartId, variantId, cantidad) {
    const variante = this.db.prepare("SELECT * FROM variants WHERE id = ?").get(variantId);
    if (!variante || variante.stock <= 0) {
      return { ok: false, motivo: "Esa talla está agotada." };
    }
    this.ensureCart(cartId);
    const actual = this.db
      .prepare("SELECT cantidad FROM cart_items WHERE cart_id = ? AND variant_id = ?")
      .get(cartId, variantId);
    const deseado = (actual ? actual.cantidad : 0) + Math.max(1, Number(cantidad) || 1);
    const final = Math.min(deseado, variante.stock);

    this.db
      .prepare(
        `INSERT INTO cart_items (cart_id, variant_id, cantidad) VALUES (?, ?, ?)
         ON CONFLICT(cart_id, variant_id) DO UPDATE SET cantidad = excluded.cantidad`
      )
      .run(cartId, variantId, final);
    this.touchCart(cartId);
    return { ok: true, cantidad: final, limitado: deseado > final };
  }

  setCartQuantity(cartId, variantId, cantidad) {
    const variante = this.db.prepare("SELECT * FROM variants WHERE id = ?").get(variantId);
    if (!variante) {
      return { ok: false, motivo: "La variante no existe." };
    }
    const n = Number(cantidad) || 0;
    if (n <= 0) {
      this.db.prepare("DELETE FROM cart_items WHERE cart_id = ? AND variant_id = ?").run(cartId, variantId);
      this.touchCart(cartId);
      return { ok: true, cantidad: 0, limitado: false };
    }
    const final = Math.min(n, variante.stock);
    this.db
      .prepare(
        `INSERT INTO cart_items (cart_id, variant_id, cantidad) VALUES (?, ?, ?)
         ON CONFLICT(cart_id, variant_id) DO UPDATE SET cantidad = excluded.cantidad`
      )
      .run(cartId, variantId, final);
    this.touchCart(cartId);
    return { ok: true, cantidad: final, limitado: n > final };
  }

  removeFromCart(cartId, variantId) {
    this.db.prepare("DELETE FROM cart_items WHERE cart_id = ? AND variant_id = ?").run(cartId, variantId);
    this.touchCart(cartId);
  }

  clearCart(cartId) {
    this.db.prepare("DELETE FROM cart_items WHERE cart_id = ?").run(cartId);
    this.touchCart(cartId);
  }

  touchCart(cartId) {
    this.db.prepare("UPDATE carts SET actualizado_en = ? WHERE id = ?").run(new Date().toISOString(), cartId);
  }

  /* --------------------------------------------------------------- órdenes */

  nextOrderNumber() {
    const actual = Number(this.getMeta("order_seq") || 0) + 1;
    this.setMeta("order_seq", actual);
    return `BR-${String(actual).padStart(6, "0")}`;
  }

  createOrder({ cartId, cliente, envio, metodoEnvio, notas }) {
    const carrito = this.getCart(cartId);
    if (!carrito.items.length) {
      return { ok: false, motivo: "El carrito está vacío." };
    }

    const sinStock = carrito.items.find((item) => item.cantidad > item.stock);
    if (sinStock) {
      return { ok: false, motivo: `No hay stock suficiente de ${sinStock.nombre} (${sinStock.talla}).` };
    }

    const subtotal = carrito.subtotal;
    const total = subtotal + envio;
    const id = randomUUID();
    const numero = this.nextOrderNumber();
    const ahora = new Date().toISOString();

    const descontar = this.db.prepare(
      "UPDATE variants SET stock = stock - ? WHERE id = ? AND stock >= ?"
    );
    const insertItem = this.db.prepare(
      `INSERT INTO order_items (order_id, variant_id, product_id, nombre, talla, precio, cantidad, imagen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    this.db.exec("BEGIN");
    try {
      this.db
        .prepare(
          `INSERT INTO orders (id, numero, estado, subtotal, envio, total, nombre, email, telefono,
                               direccion, comuna, region, metodo_envio, notas, creado_en)
           VALUES (?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          numero,
          subtotal,
          envio,
          total,
          cliente.nombre,
          cliente.email,
          cliente.telefono,
          cliente.direccion,
          cliente.comuna,
          cliente.region,
          metodoEnvio,
          notas || "",
          ahora
        );

      for (const item of carrito.items) {
        const cambio = descontar.run(item.cantidad, item.variantId, item.cantidad);
        if (cambio.changes !== 1) {
          throw new Error(`Sin stock de ${item.nombre} (${item.talla}).`);
        }
        insertItem.run(
          id,
          item.variantId,
          item.productId,
          item.nombre,
          item.talla,
          item.precio,
          item.cantidad,
          item.imagen
        );
      }

      this.db.prepare("DELETE FROM cart_items WHERE cart_id = ?").run(cartId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      return { ok: false, motivo: error.message };
    }

    return { ok: true, order: this.getOrder(numero) };
  }

  getOrder(numero) {
    const orden = this.db.prepare("SELECT * FROM orders WHERE numero = ?").get(numero);
    if (!orden) {
      return null;
    }
    orden.items = this.db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orden.id);
    return orden;
  }

  listOrders(limite = 50) {
    return this.db
      .prepare(
        `SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS lineas
         FROM orders o ORDER BY o.creado_en DESC LIMIT ?`
      )
      .all(limite);
  }

  setOrderStatus(orderId, estado) {
    const permitidos = ["pendiente", "pagado", "enviado", "entregado", "cancelado"];
    if (!permitidos.includes(estado)) {
      return { ok: false, motivo: "Estado inválido." };
    }
    const orden = this.db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
    if (!orden) {
      return { ok: false, motivo: "La orden no existe." };
    }

    this.db.exec("BEGIN");
    try {
      // Cancelar devuelve el stock reservado.
      if (estado === "cancelado" && orden.estado !== "cancelado") {
        const items = this.db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId);
        const devolver = this.db.prepare("UPDATE variants SET stock = stock + ? WHERE id = ?");
        for (const item of items) {
          devolver.run(item.cantidad, item.variant_id);
        }
      }
      this.db.prepare("UPDATE orders SET estado = ? WHERE id = ?").run(estado, orderId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      return { ok: false, motivo: error.message };
    }
    return { ok: true };
  }

  /* ----------------------------------------------------------- administración */

  saveProduct(data) {
    const nombre = String(data.nombre || "").trim();
    if (nombre.length < 2) {
      return { ok: false, motivo: "El nombre necesita al menos 2 caracteres." };
    }
    const precio = Math.round(Number(data.precio));
    if (!Number.isFinite(precio) || precio <= 0) {
      return { ok: false, motivo: "El precio debe ser mayor a cero." };
    }
    const categoria = slugify(data.categoria || "otros") || "otros";
    const slugBase = slugify(data.slug || nombre);
    const descripcion = String(data.descripcion || "").trim();
    const imagen = String(data.imagen || "").trim();
    const destacado = data.destacado ? 1 : 0;
    const activo = data.activo === undefined ? 1 : data.activo ? 1 : 0;
    const variantes = TALLAS.map((talla) => ({
      talla,
      stock: Math.max(0, Math.min(9999, Math.round(Number(data[`stock_${talla}`]) || 0)))
    }));

    const id = data.id || randomUUID();
    const existente = data.id ? this.db.prepare("SELECT * FROM products WHERE id = ?").get(data.id) : null;

    let slug = slugBase;
    const enUso = this.db.prepare("SELECT id FROM products WHERE slug = ? AND id != ?").get(slug, id);
    if (enUso) {
      slug = `${slugBase}-${String(Date.now()).slice(-4)}`;
    }

    this.db.exec("BEGIN");
    try {
      if (existente) {
        this.db
          .prepare(
            `UPDATE products SET slug = ?, nombre = ?, busqueda = ?, categoria = ?, descripcion = ?,
                    precio = ?, precio_anterior = ?, imagen = ?, destacado = ?, activo = ?
             WHERE id = ?`
          )
          .run(
            slug,
            nombre,
            normalizar(`${nombre} ${categoria}`),
            categoria,
            descripcion,
            precio,
            data.precioAnterior ? Math.round(Number(data.precioAnterior)) : null,
            imagen,
            destacado,
            activo,
            id
          );
      } else {
        this.db
          .prepare(
            `INSERT INTO products (id, slug, nombre, busqueda, categoria, descripcion, precio,
                                   precio_anterior, imagen, destacado, activo, creado_en)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            id,
            slug,
            nombre,
            normalizar(`${nombre} ${categoria}`),
            categoria,
            descripcion,
            precio,
            data.precioAnterior ? Math.round(Number(data.precioAnterior)) : null,
            imagen,
            destacado,
            activo,
            new Date().toISOString()
          );
      }

      const upsert = this.db.prepare(
        `INSERT INTO variants (id, product_id, talla, stock) VALUES (?, ?, ?, ?)
         ON CONFLICT(product_id, talla) DO UPDATE SET stock = excluded.stock`
      );
      for (const variante of variantes) {
        upsert.run(randomUUID(), id, variante.talla, variante.stock);
      }

      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      return { ok: false, motivo: error.message };
    }

    return { ok: true, id, slug };
  }

  deleteProduct(id) {
    this.db.prepare("DELETE FROM products WHERE id = ?").run(id);
  }

  close() {
    this.db.close();
  }
}
