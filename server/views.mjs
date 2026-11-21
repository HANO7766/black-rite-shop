/* ==========================================================================
   Black Rite Shop — vistas HTML renderizadas en el servidor
   Sin framework: funciones que devuelven strings. Todo el catálogo es
   indexable porque el HTML llega armado desde el servidor.
   ========================================================================== */

import { CATEGORIAS } from "./seed.mjs";
import { TALLAS } from "./db.mjs";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
});

export function money(valor) {
  return clp.format(Number(valor) || 0);
}

export function esc(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Normaliza la ruta de una imagen a absoluta: en /producto/:slug las rutas
 * relativas se resolverían contra el directorio del producto y no cargarían.
 */
export function asset(ruta) {
  const valor = String(ruta || "").trim();
  if (!valor) {
    return "/assets/placeholder.svg";
  }
  if (/^(?:https?:)?\/\//i.test(valor) || /^data:/i.test(valor) || valor.startsWith("/")) {
    return valor;
  }
  return `/${valor}`;
}

const MARCAS = [
  { slug: "heavy-metal", nombre: "Heavy Metal" },
  { slug: "thrash", nombre: "Thrash" },
  { slug: "death-metal", nombre: "Death Metal" },
  { slug: "rock-clasico", nombre: "Rock Clásico" },
  { slug: "groove-metal", nombre: "Groove" }
];

const MONOGRAMA = `<svg viewBox="0 0 64 64" aria-hidden="true" class="brand__svg">
  <path d="M32 3c16 0 28 12.6 28 28.4C60 47.8 47.6 61 32 61S4 47.8 4 31.4C4 15.6 16 3 32 3Z" fill="currentColor"/>
  <path d="M20 46V18h16.8c8.1 0 12.8 4.8 12.8 11.3 0 4.3-2.1 7.2-5.8 9L51 46h-9.7l-5.7-6.2h-6.1V46H20Zm9.5-13.6h7c3.6 0 5.1-1.5 5.1-3.8s-1.7-3.6-5.2-3.6h-6.9v7.4Z" fill="#0b0b0c"/>
</svg>`;

const ICONO = {
  search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.8"/><path d="m16 16 4.2 4.2"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h2l2.2 9.4a2 2 0 0 0 2 1.6h6.6a2 2 0 0 0 2-1.6L20 9H7"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z"/><path d="m9 12 2 2 4-4"/></svg>`,
  swap: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>`,
  star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z"/></svg>`
};

/* ------------------------------------------------------------------ layout */

export function layout({ titulo, descripcion = "", carrito = 0, cuerpo, activo = "" }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Black Rite</title>
<meta name="description" content="${esc(descripcion || "Poleras de bandas de metal, estampadas a mano en Santiago. Envíos a todo Chile.")}">
<meta name="theme-color" content="#0b0b0c">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/store.css">
</head>
<body>
<a class="skip" href="#main">Saltar al contenido</a>

<div class="promo">
  <div class="shell promo__in">
    <span>Envío gratis en Santiago sobre ${money(40000)}</span>
    <span class="promo__sep" aria-hidden="true">·</span>
    <span>Retiro coordinado sin costo</span>
  </div>
</div>

<header class="head">
  <div class="shell head__in">
    <a class="brand" href="/" aria-label="Black Rite, ir al inicio">
      <span class="brand__mark">${MONOGRAMA}</span>
      <span class="brand__copy"><strong>Black Rite</strong><small>Poleras de culto</small></span>
    </a>

    <nav class="nav" aria-label="Categorías">
      ${MARCAS.map(
        (m) =>
          `<a class="nav__link${activo === m.slug ? " is-active" : ""}" href="/tienda?cat=${m.slug}">${esc(m.nombre)}</a>`
      ).join("")}
    </nav>

    <form class="search" role="search" action="/tienda" method="get">
      <span class="search__icon">${ICONO.search}</span>
      <input type="search" name="q" placeholder="Buscar banda o diseño" aria-label="Buscar en el catálogo">
    </form>

    <a class="cartlink" href="/carrito" aria-label="Ver carrito (${carrito} ${carrito === 1 ? "unidad" : "unidades"})">
      ${ICONO.cart}
      <span class="cartlink__n">${carrito}</span>
    </a>
  </div>
</header>

<main id="main">${cuerpo}</main>

<footer class="foot">
  <div class="shell foot__in">
    <div class="foot__col">
      <p class="foot__brand">Black Rite</p>
      <p>Poleras de bandas de metal estampadas en Santiago. Tirada corta, algodón pesado.</p>
    </div>
    <div class="foot__col">
      <p class="foot__title">Tienda</p>
      <a href="/tienda">Todo el catálogo</a>
      <a href="/tienda?cat=heavy-metal">Heavy Metal</a>
      <a href="/tienda?cat=thrash">Thrash</a>
      <a href="/tienda?cat=death-metal">Death Metal</a>
    </div>
    <div class="foot__col">
      <p class="foot__title">Ayuda</p>
      <p>Despachos a todo Chile</p>
      <p>Cambios hasta 10 días</p>
      <p>Pedidos por WhatsApp</p>
    </div>
    <div class="foot__col">
      <p class="foot__title">Contacto</p>
      <p>hola@blackrite.cl</p>
      <p>+56 9 6623 2369</p>
    </div>
  </div>
  <div class="shell foot__base">
    <span>© ${new Date().getFullYear()} Black Rite</span>
    <a href="/admin">Administración</a>
  </div>
</footer>
</body>
</html>`;
}

/* ------------------------------------------------------------ componentes */

function badge(producto) {
  if (producto.precio_anterior && producto.precio_anterior > producto.precio) {
    return `<span class="badge badge--oferta">Oferta</span>`;
  }
  if (producto.stock_total === 0) {
    return `<span class="badge badge--out">Agotado</span>`;
  }
  if (producto.stock_total !== undefined && producto.stock_total <= 5) {
    return `<span class="badge badge--low">Últimas</span>`;
  }
  return "";
}

function variantesDisponibles(producto) {
  const variantes = producto.variants || [];
  return variantes.filter((v) => v.stock > 0);
}

export function productCard(producto) {
  const disponibles = variantesDisponibles(producto);
  const agotado = disponibles.length === 0;
  const precioAnterior =
    producto.precio_anterior && producto.precio_anterior > producto.precio
      ? `<s class="card__old">${money(producto.precio_anterior)}</s>`
      : "";

  const selector =
    disponibles.length > 1
      ? `<select class="card__select" name="variant" aria-label="Talla de ${esc(producto.nombre)}">
           ${disponibles
             .map((v) => `<option value="${esc(v.id)}">${esc(v.talla)}</option>`)
             .join("")}
         </select>`
      : disponibles.length === 1
        ? `<input type="hidden" name="variant" value="${esc(disponibles[0].id)}">`
        : "";

  return `<article class="card">
    <a class="card__media" href="/producto/${esc(producto.slug)}" aria-label="Ver ${esc(producto.nombre)}">
      <img src="${esc(asset(producto.imagen))}" alt="${esc(producto.nombre)}" loading="lazy" decoding="async">
      ${badge(producto)}
    </a>
    <div class="card__body">
      <h3 class="card__name"><a href="/producto/${esc(producto.slug)}">${esc(producto.nombre)}</a></h3>
      <p class="card__prices">
        <span class="card__price">${money(producto.precio)}</span>
        ${precioAnterior}
      </p>
      ${
        agotado
          ? `<a class="btn btn--ghost btn--sm card__cta" href="/producto/${esc(producto.slug)}">Ver ficha</a>`
          : `<form class="card__form" method="post" action="/carrito/agregar">
               <input type="hidden" name="slug" value="${esc(producto.slug)}">
               ${selector}
               <button class="btn btn--primary btn--sm card__cta" type="submit">Añadir</button>
             </form>`
      }
    </div>
  </article>`;
}

export function grid(productos) {
  return `<div class="grid">${productos.map(productCard).join("")}</div>`;
}

export function ribbon(texto) {
  return `<div class="ribbon"><span class="ribbon__mark" aria-hidden="true"></span><h2>${esc(texto)}</h2></div>`;
}

function paginacion(base, { pagina, paginas }) {
  if (paginas <= 1) {
    return "";
  }
  const enlace = (n) => `${base}${base.includes("?") ? "&" : "?"}pagina=${n}`;
  const items = [];
  for (let n = 1; n <= paginas; n += 1) {
    items.push(
      `<a class="page${n === pagina ? " is-active" : ""}" href="${enlace(n)}"${n === pagina ? ' aria-current="page"' : ""}>${n}</a>`
    );
  }
  return `<nav class="pages" aria-label="Paginación">${items.join("")}</nav>`;
}

/* -------------------------------------------------------------------- home */

export function homePage({ destacados, recientes, categorias, carrito }) {
  const hero = destacados[0] || recientes[0];

  const cuerpo = `
  <section class="hero">
    <div class="shell hero__in">
      <div class="hero__copy">
        <p class="kicker"><span class="kicker__line"></span>Tirada corta · Temporada 2026</p>
        <h1>Poleras de culto<span class="dot">.</span></h1>
        <p class="hero__lead">Algodón pesado, estampado a dos caras y diseños que no se reponen. Hechas en Santiago, enviadas a todo Chile.</p>
        <div class="hero__actions">
          <a class="btn btn--primary" href="/tienda">Ver catálogo</a>
          <a class="btn" href="/tienda?orden=precio-asc">Desde ${money(14990)}</a>
        </div>
      </div>
      ${
        hero
          ? `<a class="hero__art" href="/producto/${esc(hero.slug)}" aria-label="Ver ${esc(hero.nombre)}">
               <img src="${esc(asset(hero.imagen))}" alt="${esc(hero.nombre)}">
             </a>`
          : ""
      }
    </div>
  </section>

  <section class="band">
    <div class="shell">
      ${ribbon("Destacados")}
      ${grid(destacados)}
    </div>
  </section>

  <section class="shell cats">
    <h2 class="cats__title">Categorías</h2>
    <div class="cats__list">
      ${categorias
        .map(
          (c) =>
            `<a class="cat" href="/tienda?cat=${esc(c.categoria)}">
               <strong>${esc(CATEGORIAS[c.categoria] || c.categoria)}</strong>
               <span>${c.total} ${c.total === 1 ? "modelo" : "modelos"}</span>
             </a>`
        )
        .join("")}
    </div>
  </section>

  <section class="shell band--flush">
    ${ribbon("Recién llegados")}
    ${grid(recientes)}
  </section>

  <section class="trust">
    <div class="shell trust__in">
      <div class="trust__item">${ICONO.truck}<div><strong>Despacho a todo Chile</strong><span>Starken y Blue Express</span></div></div>
      <div class="trust__item">${ICONO.shield}<div><strong>Compra protegida</strong><span>Datos y stock verificados</span></div></div>
      <div class="trust__item">${ICONO.swap}<div><strong>Cambios hasta 10 días</strong><span>Ley 19.496</span></div></div>
      <div class="trust__item">${ICONO.star}<div><strong>Tirada corta</strong><span>No se repone</span></div></div>
    </div>
  </section>`;

  return layout({
    titulo: "Poleras de bandas de metal",
    descripcion: "Poleras de bandas de metal estampadas en Santiago. Tirada corta, envíos a todo Chile.",
    carrito,
    cuerpo
  });
}

/* ---------------------------------------------------------------- catálogo */

export function catalogPage({ productos, total, paginas, pagina, categoria, talla, q, orden, carrito }) {
  const titulo = categoria ? CATEGORIAS[categoria] || categoria : q ? `Búsqueda: ${q}` : "Catálogo completo";
  const base = `/tienda?${new URLSearchParams({
    ...(categoria ? { cat: categoria } : {}),
    ...(talla ? { talla } : {}),
    ...(q ? { q } : {}),
    orden
  }).toString()}`;

  const filtroTallas = TALLAS.map(
    (t) =>
      `<a class="chip${talla === t ? " is-active" : ""}" href="/tienda?${new URLSearchParams({
        ...(categoria ? { cat: categoria } : {}),
        ...(q ? { q } : {}),
        ...(talla === t ? {} : { talla: t }),
        orden
      }).toString()}">${t}</a>`
  ).join("");

  const cuerpo = `
  <section class="shell pagehead">
    <nav class="crumbs" aria-label="Ruta"><a href="/">Inicio</a><span>/</span><span>${esc(titulo)}</span></nav>
    <div class="pagehead__row">
      <h1>${esc(titulo)}</h1>
      <p class="pagehead__count">${total} ${total === 1 ? "modelo" : "modelos"}</p>
    </div>
    <div class="toolbar">
      <div class="chips">
        <a class="chip${!talla ? " is-active" : ""}" href="/tienda?${new URLSearchParams({
          ...(categoria ? { cat: categoria } : {}),
          ...(q ? { q } : {}),
          orden
        }).toString()}">Todas</a>
        ${filtroTallas}
      </div>
      <form class="sort" method="get" action="/tienda">
        ${categoria ? `<input type="hidden" name="cat" value="${esc(categoria)}">` : ""}
        ${q ? `<input type="hidden" name="q" value="${esc(q)}">` : ""}
        ${talla ? `<input type="hidden" name="talla" value="${esc(talla)}">` : ""}
        <label for="orden">Ordenar</label>
        <select id="orden" name="orden" onchange="this.form.submit()">
          <option value="nuevo"${orden === "nuevo" ? " selected" : ""}>Más recientes</option>
          <option value="precio-asc"${orden === "precio-asc" ? " selected" : ""}>Precio: menor a mayor</option>
          <option value="precio-desc"${orden === "precio-desc" ? " selected" : ""}>Precio: mayor a menor</option>
          <option value="nombre"${orden === "nombre" ? " selected" : ""}>Nombre</option>
        </select>
      </form>
    </div>
  </section>

  <section class="shell">
    ${
      productos.length
        ? grid(productos)
        : `<div class="empty"><p class="empty__title">Sin resultados</p><p class="empty__copy">Prueba con otra banda, talla o categoría.</p><a class="btn btn--primary" href="/tienda">Ver todo el catálogo</a></div>`
    }
    ${paginacion(base, { pagina, paginas })}
  </section>`;

  return layout({ titulo, descripcion: `${titulo} en Black Rite.`, carrito, cuerpo, activo: categoria || "" });
}

/* ----------------------------------------------------------------- producto */

export function productPage({ producto, relacionados, carrito, error = "" }) {
  const disponibles = producto.variants.filter((v) => v.stock > 0);
  const agotado = disponibles.length === 0;
  const precioAnterior =
    producto.precio_anterior && producto.precio_anterior > producto.precio
      ? `<s class="pdp__old">${money(producto.precio_anterior)}</s>`
      : "";

  const tallas = producto.variants
    .map(
      (v) => `<label class="size${v.stock === 0 ? " is-out" : ""}">
        <input type="radio" name="variant" value="${esc(v.id)}" ${v.stock === 0 ? "disabled" : ""} required>
        <span>${esc(v.talla)}</span>
        <em>${v.stock === 0 ? "agotado" : `${v.stock} u.`}</em>
      </label>`
    )
    .join("");

  const cuerpo = `
  <section class="shell pdp">
    <nav class="crumbs" aria-label="Ruta">
      <a href="/">Inicio</a><span>/</span>
      <a href="/tienda">Catálogo</a><span>/</span>
      <a href="/tienda?cat=${esc(producto.categoria)}">${esc(CATEGORIAS[producto.categoria] || producto.categoria)}</a>
    </nav>

    ${error ? `<p class="alert" role="alert">${esc(error)}</p>` : ""}

    <div class="pdp__in">
      <div class="pdp__media">
        <img src="${esc(asset(producto.imagen))}" alt="${esc(producto.nombre)}">
        <div class="pdp__badges">${badge({ ...producto, stock_total: producto.stockTotal })}</div>
      </div>

      <div class="pdp__info">
        <p class="pdp__cat">${esc(CATEGORIAS[producto.categoria] || producto.categoria)}</p>
        <h1>${esc(producto.nombre)}</h1>
        <p class="pdp__prices">
          <span class="pdp__price">${money(producto.precio)}</span>
          ${precioAnterior}
        </p>
        <p class="pdp__cuotas">Hasta 3 cuotas sin interés de ${money(Math.round(producto.precio / 3))}</p>

        <form class="pdp__form" method="post" action="/carrito/agregar">
          <input type="hidden" name="slug" value="${esc(producto.slug)}">
          <fieldset class="sizes" ${agotado ? "disabled" : ""}>
            <legend>Talla</legend>
            <div class="sizes__row">${tallas}</div>
          </fieldset>
          <div class="pdp__buy">
            <label class="qty">
              <span>Cantidad</span>
              <input type="number" name="cantidad" value="1" min="1" max="9" inputmode="numeric">
            </label>
            <button class="btn btn--primary btn--wide" type="submit" ${agotado ? "disabled" : ""}>
              ${agotado ? "Agotado" : "Añadir al carrito"}
            </button>
          </div>
          <p class="pdp__stock">${agotado ? "Sin stock por ahora." : `${producto.stockTotal} unidades disponibles en total.`}</p>
        </form>

        <div class="pdp__trust">
          <span>${ICONO.truck} Envío a todo Chile</span>
          <span>${ICONO.shield} Compra protegida</span>
          <span>${ICONO.swap} Cambios hasta 10 días</span>
        </div>

        <div class="pdp__details">
          <details open>
            <summary>Descripción</summary>
            <p>${esc(producto.descripcion)}</p>
          </details>
          <details>
            <summary>Envíos y devoluciones</summary>
            <p>Despacho por Starken o Blue Express en 3 a 5 días hábiles. Retiro coordinado sin costo en Santiago. Cambios hasta 10 días desde la recepción, según la Ley 19.496.</p>
          </details>
        </div>
      </div>
    </div>
  </section>

  ${
    relacionados.length
      ? `<section class="shell band--flush">
           ${ribbon("También te puede gustar")}
           ${grid(relacionados)}
         </section>`
      : ""
  }`;

  return layout({
    titulo: producto.nombre,
    descripcion: producto.descripcion.slice(0, 150),
    carrito,
    cuerpo,
    activo: producto.categoria
  });
}

/* ----------------------------------------------------------------- carrito */

export function cartPage({ carrito, productos, error = "" }) {
  if (!productos.length) {
    return layout({
      titulo: "Carrito",
      carrito: 0,
      cuerpo: `<section class="shell empty">
        <p class="empty__title">Tu carrito está vacío</p>
        <p class="empty__copy">Todavía no agregaste ninguna polera.</p>
        <a class="btn btn--primary" href="/tienda">Ver catálogo</a>
      </section>`
    });
  }

  const filas = productos
    .map(
      (item) => `<tr>
        <td class="cart__prod">
          <img src="${esc(asset(item.imagen))}" alt="" loading="lazy">
          <div>
            <a href="/producto/${esc(item.slug)}">${esc(item.nombre)}</a>
            <span>Talla ${esc(item.talla)}</span>
          </div>
        </td>
        <td class="cart__price">${money(item.precio)}</td>
        <td class="cart__qty">
          <form method="post" action="/carrito/cantidad" class="qtyform">
            <input type="hidden" name="variant" value="${esc(item.variantId)}">
            <input type="number" name="cantidad" value="${item.cantidad}" min="0" max="${item.stock}" aria-label="Cantidad">
            <button class="btn btn--ghost btn--xs" type="submit">Actualizar</button>
          </form>
        </td>
        <td class="cart__sub">${money(item.precio * item.cantidad)}</td>
        <td class="cart__del">
          <form method="post" action="/carrito/quitar">
            <input type="hidden" name="variant" value="${esc(item.variantId)}">
            <button class="link" type="submit" aria-label="Quitar ${esc(item.nombre)}">Quitar</button>
          </form>
        </td>
      </tr>`
    )
    .join("");

  const cuerpo = `
  <section class="shell pagehead">
    <nav class="crumbs" aria-label="Ruta"><a href="/">Inicio</a><span>/</span><span>Carrito</span></nav>
    <div class="pagehead__row"><h1>Carrito</h1><p class="pagehead__count">${carrito.unidades} ${carrito.unidades === 1 ? "unidad" : "unidades"}</p></div>
  </section>

  <section class="shell cart">
    ${error ? `<p class="alert" role="alert">${esc(error)}</p>` : ""}
    <div class="cart__grid">
      <div class="cart__table">
        <table>
          <thead><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Total</th><th></th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <a class="link" href="/tienda">← Seguir comprando</a>
      </div>

      <aside class="summary">
        <h2>Resumen</h2>
        <dl>
          <div><dt>Subtotal</dt><dd>${money(carrito.subtotal)}</dd></div>
          <div><dt>Envío</dt><dd>Se calcula en el siguiente paso</dd></div>
          <div class="summary__total"><dt>Total</dt><dd>${money(carrito.subtotal)}</dd></div>
        </dl>
        <p class="summary__note">Envío gratis en Santiago sobre ${money(40000)}.</p>
        <a class="btn btn--primary btn--wide" href="/checkout">Continuar con el pedido</a>
      </aside>
    </div>
  </section>`;

  return layout({ titulo: "Carrito", carrito: carrito.unidades, cuerpo });
}

/* ---------------------------------------------------------------- checkout */

export function checkoutPage({ carrito, productos, envio, error = "" }) {
  const filas = productos
    .map(
      (item) => `<li>
        <img src="${esc(asset(item.imagen))}" alt="" loading="lazy">
        <div><strong>${esc(item.nombre)}</strong><span>Talla ${esc(item.talla)} × ${item.cantidad}</span></div>
        <b>${money(item.precio * item.cantidad)}</b>
      </li>`
    )
    .join("");

  const cuerpo = `
  <section class="shell pagehead">
    <nav class="crumbs" aria-label="Ruta"><a href="/">Inicio</a><span>/</span><a href="/carrito">Carrito</a><span>/</span><span>Pedido</span></nav>
    <div class="pagehead__row"><h1>Datos del pedido</h1></div>
  </section>

  <section class="shell checkout">
    ${error ? `<p class="alert" role="alert">${esc(error)}</p>` : ""}
    <form class="checkout__form" method="post" action="/checkout" novalidate>
      <fieldset>
        <legend>Contacto</legend>
        <div class="fields">
          <label>Nombre completo<input name="nombre" required minlength="2" autocomplete="name"></label>
          <label>Correo<input type="email" name="email" required autocomplete="email"></label>
          <label>Teléfono<input name="telefono" required autocomplete="tel" placeholder="+56 9"></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Entrega</legend>
        <div class="radios">
          <label class="radio"><input type="radio" name="metodo" value="domicilio" checked><span>Despacho a domicilio</span></label>
          <label class="radio"><input type="radio" name="metodo" value="retiro"><span>Retiro coordinado</span></label>
        </div>
        <div class="fields">
          <label>Región<input name="region" required value="Metropolitana" autocomplete="address-level1"></label>
          <label>Comuna<input name="comuna" required autocomplete="address-level2"></label>
          <label class="fields__wide">Dirección<input name="direccion" required autocomplete="street-address"></label>
          <label class="fields__wide">Notas (opcional)<textarea name="notas" rows="2" placeholder="Referencias, horario de entrega…"></textarea></label>
        </div>
      </fieldset>

      <p class="checkout__note">
        Al confirmar, se reserva el stock y generamos el pedido. Coordinamos el pago por
        transferencia o enlace de pago por correo o WhatsApp.
      </p>

      <button class="btn btn--primary btn--wide" type="submit">Confirmar pedido · ${money(carrito.subtotal + envio)}</button>
    </form>

    <aside class="summary summary--sticky">
      <h2>Tu pedido</h2>
      <ul class="summary__items">${filas}</ul>
      <dl>
        <div><dt>Subtotal</dt><dd>${money(carrito.subtotal)}</dd></div>
        <div><dt>Envío</dt><dd>${envio === 0 ? "Gratis" : money(envio)}</dd></div>
        <div class="summary__total"><dt>Total</dt><dd>${money(carrito.subtotal + envio)}</dd></div>
      </dl>
      <a class="link" href="/carrito">← Volver al carrito</a>
    </aside>
  </section>`;

  return layout({ titulo: "Datos del pedido", carrito: carrito.unidades, cuerpo });
}

/* ------------------------------------------------------------------- orden */

export function orderPage({ orden, recienCreada = false }) {
  const filas = orden.items
    .map(
      (item) => `<li>
        <img src="${esc(asset(item.imagen))}" alt="" loading="lazy">
        <div><strong>${esc(item.nombre)}</strong><span>Talla ${esc(item.talla)} × ${item.cantidad}</span></div>
        <b>${money(item.precio * item.cantidad)}</b>
      </li>`
    )
    .join("");

  const cuerpo = `
  <section class="shell order">
    <div class="order__hero">
      <p class="kicker"><span class="kicker__line"></span>${recienCreada ? "Pedido recibido" : "Detalle del pedido"}</p>
      <h1>${esc(orden.numero)}</h1>
      <p class="order__estado">Estado: <strong>${esc(orden.estado)}</strong></p>
      <p class="order__copy">
        ${recienCreada
          ? "Guardamos tu pedido y reservamos el stock. Te escribimos a " + esc(orden.email) + " para coordinar el pago y el despacho."
          : "Este pedido ya está registrado."}
      </p>
    </div>

    <div class="order__grid">
      <div class="order__items">
        <h2>Productos</h2>
        <ul class="summary__items">${filas}</ul>
        <dl class="order__totals">
          <div><dt>Subtotal</dt><dd>${money(orden.subtotal)}</dd></div>
          <div><dt>Envío</dt><dd>${orden.envio === 0 ? "Gratis" : money(orden.envio)}</dd></div>
          <div class="summary__total"><dt>Total</dt><dd>${money(orden.total)}</dd></div>
        </dl>
      </div>

      <aside class="summary">
        <h2>Entrega</h2>
        <p><strong>${esc(orden.nombre)}</strong></p>
        <p>${esc(orden.direccion)}, ${esc(orden.comuna)}, ${esc(orden.region)}</p>
        <p>${esc(orden.telefono)} · ${esc(orden.email)}</p>
        <p class="summary__note">Método: ${esc(orden.metodo_envio === "retiro" ? "Retiro coordinado" : "Despacho a domicilio")}</p>
        ${orden.notas ? `<p class="summary__note">Notas: ${esc(orden.notas)}</p>` : ""}
        <a class="btn btn--wide" href="/tienda">Seguir comprando</a>
      </aside>
    </div>
  </section>`;

  return layout({ titulo: `Pedido ${orden.numero}`, carrito: 0, cuerpo });
}

/* ------------------------------------------------------------------- admin */

function adminShell({ seccion, cuerpo, carrito = 0, usuario = "admin" }) {
  const tabs = [
    ["productos", "Productos", "/admin"],
    ["ordenes", "Pedidos", "/admin/ordenes"]
  ];
  return layout({
    titulo: "Administración",
    carrito,
    cuerpo: `
    <section class="shell admin">
      <div class="admin__head">
        <h1>Administración</h1>
        <nav class="admin__tabs">
          ${tabs.map(([id, label, href]) => `<a class="tab${seccion === id ? " is-active" : ""}" href="${href}">${label}</a>`).join("")}
        </nav>
        <div class="admin__tools">
          <span class="admin__user" title="Sesión iniciada">${esc(usuario)}</span>
          <form method="post" action="/admin/logout">
            <button class="btn btn--ghost btn--xs" type="submit">Cerrar sesión</button>
          </form>
        </div>
      </div>
      ${cuerpo}
    </section>`
  });
}

export function loginPage({ usuario = "admin", error = "", siguiente = "/admin" }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acceso · Black Rite</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0b0b0c">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/store.css">
</head>
<body class="login-body">
<main class="login">
  <div class="login__card">
    <a class="login__brand" href="/">
      <span class="brand__mark">${MONOGRAMA}</span>
      <span class="brand__copy"><strong>Black Rite</strong><small>Administración</small></span>
    </a>

    <h1 class="login__title">Acceso al panel</h1>
    <p class="login__copy">Ingresa con tu usuario y contraseña para administrar el catálogo y los pedidos.</p>

    ${error ? `<p class="alert" role="alert">${esc(error)}</p>` : ""}

    <form class="login__form" method="post" action="/admin/login">
      <input type="hidden" name="siguiente" value="${esc(siguiente)}">
      <label>Usuario
        <input name="usuario" value="${esc(usuario)}" autocomplete="username" required autofocus>
      </label>
      <label>Contraseña
        <input type="password" name="password" autocomplete="current-password" required minlength="8">
      </label>
      <button class="btn btn--primary btn--wide" type="submit">Entrar</button>
    </form>

    <a class="login__back" href="/">← Volver a la tienda</a>
  </div>
</main>
</body>
</html>`;
}

export function adminProductsPage({ productos, usuario = "admin" }) {
  const filas = productos
    .map(
      (p) => `<tr>
        <td class="admin__prod"><img src="${esc(asset(p.imagen))}" alt=""><div><a href="/admin/producto/${esc(p.id)}">${esc(p.nombre)}</a><span>${esc(CATEGORIAS[p.categoria] || p.categoria)}</span></div></td>
        <td>${money(p.precio)}</td>
        <td class="${p.stock_total === 0 ? "is-zero" : ""}">${p.stock_total}</td>
        <td>${p.destacado ? "Sí" : "—"}</td>
        <td>${p.activo ? "Publicado" : "Oculto"}</td>
        <td class="admin__actions">
          <a class="btn btn--ghost btn--xs" href="/admin/producto/${esc(p.id)}">Editar</a>
          <form method="post" action="/admin/producto/${esc(p.id)}/eliminar" onsubmit="return confirm('¿Eliminar ${esc(p.nombre)}?')">
            <button class="link link--danger" type="submit">Eliminar</button>
          </form>
        </td>
      </tr>`
    )
    .join("");

  return adminShell({
    seccion: "productos",
    usuario,
    cuerpo: `
    <div class="admin__bar">
      <h2>${productos.length} productos</h2>
      <a class="btn btn--primary" href="/admin/producto/nuevo">Nuevo producto</a>
    </div>
    <div class="admin__table">
      <table>
        <thead><tr><th>Producto</th><th>Precio</th><th>Stock</th><th>Destacado</th><th>Estado</th><th></th></tr></thead>
        <tbody>${filas || `<tr><td colspan="6">Todavía no hay productos.</td></tr>`}</tbody>
      </table>
    </div>`
  });
}

export function adminProductFormPage({ producto, error = "", usuario = "admin" }) {
  const esNuevo = !producto;
  const valor = (campo, porDefecto = "") => esc(producto?.[campo] ?? porDefecto);
  const stockDe = (talla) => {
    const variante = producto?.variants?.find((v) => v.talla === talla);
    return variante ? variante.stock : 0;
  };

  return adminShell({
    seccion: "productos",
    usuario,
    cuerpo: `
    <div class="admin__bar">
      <h2>${esNuevo ? "Nuevo producto" : "Editar producto"}</h2>
      <a class="btn btn--ghost" href="/admin">Volver</a>
    </div>
    ${error ? `<p class="alert" role="alert">${esc(error)}</p>` : ""}
    <form class="form" method="post" action="/admin/producto${esNuevo ? "" : `/${esc(producto.id)}`}">
      <div class="fields">
        <label class="fields__wide">Nombre<input name="nombre" required value="${valor("nombre")}" placeholder="Metallica · Master of Puppets"></label>
        <label>Categoría
          <select name="categoria">
            ${Object.entries(CATEGORIAS).map(([slug, nombre]) => `<option value="${slug}"${producto?.categoria === slug ? " selected" : ""}>${esc(nombre)}</option>`).join("")}
          </select>
        </label>
        <label>Precio<input type="number" name="precio" min="1" required value="${valor("precio")}" placeholder="17990"></label>
        <label>Precio anterior<input type="number" name="precioAnterior" min="0" value="${valor("precio_anterior")}" placeholder="opcional"></label>
        <label class="fields__wide">Imagen<input name="imagen" value="${valor("imagen")}" placeholder="assets/mi-diseno.svg o https://…"></label>
        <label class="fields__wide">Descripción<textarea name="descripcion" rows="3">${valor("descripcion")}</textarea></label>
      </div>

      <fieldset>
        <legend>Stock por talla</legend>
        <div class="stockgrid">
          ${TALLAS.map(
            (t) => `<label>${t}<input type="number" name="stock_${t}" min="0" max="9999" value="${stockDe(t)}"></label>`
          ).join("")}
        </div>
      </fieldset>

      <div class="checks">
        <label class="check"><input type="checkbox" name="destacado" value="1"${producto?.destacado ? " checked" : ""}><span>Destacado en la home</span></label>
        <label class="check"><input type="checkbox" name="activo" value="1"${producto === null || producto?.activo ? " checked" : ""}><span>Publicado</span></label>
      </div>

      <button class="btn btn--primary btn--wide" type="submit">${esNuevo ? "Crear producto" : "Guardar cambios"}</button>
    </form>`
  });
}

export function adminOrdersPage({ ordenes, usuario = "admin" }) {
  const filas = ordenes
    .map(
      (o) => `<tr>
        <td><a href="/orden/${esc(o.numero)}">${esc(o.numero)}</a></td>
        <td>${esc(new Date(o.creado_en).toLocaleString("es-CL"))}</td>
        <td>${esc(o.nombre)}<br><span class="muted">${esc(o.comuna)}</span></td>
        <td>${o.lineas} ${o.lineas === 1 ? "línea" : "líneas"}</td>
        <td>${money(o.total)}</td>
        <td>
          <form class="inlineform" method="post" action="/admin/orden/${esc(o.id)}/estado">
            <select name="estado">
              ${["pendiente", "pagado", "enviado", "entregado", "cancelado"]
                .map((e) => `<option value="${e}"${o.estado === e ? " selected" : ""}>${e}</option>`)
                .join("")}
            </select>
            <button class="btn btn--ghost btn--xs" type="submit">Guardar</button>
          </form>
        </td>
      </tr>`
    )
    .join("");

  return adminShell({
    seccion: "ordenes",
    usuario,
    cuerpo: `
    <div class="admin__bar"><h2>${ordenes.length} pedidos</h2></div>
    <div class="admin__table">
      <table>
        <thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Líneas</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody>${filas || `<tr><td colspan="6">Todavía no hay pedidos.</td></tr>`}</tbody>
      </table>
    </div>`
  });
}

export function notFoundPage() {
  return layout({
    titulo: "No encontrado",
    carrito: 0,
    cuerpo: `<section class="shell empty">
      <p class="empty__title">404</p>
      <p class="empty__copy">La página que buscas no existe o el producto ya no está publicado.</p>
      <a class="btn btn--primary" href="/tienda">Ir al catálogo</a>
    </section>`
  });
}
