# Black Rite Shop

Tienda online de poleras de bandas de metal: catálogo, carrito y pedidos. Frontend renderizado en el servidor con HTML y CSS, backend en Node.js con SQLite, sin dependencias npm, sin build y **sin una línea de JavaScript en el cliente**.

## Qué incluye

- **Catálogo** con categorías, filtro por talla, búsqueda sin tildes, orden y paginación.
- **Ficha de producto** con selector de talla, stock por variante y productos relacionados.
- **Carrito** por cookie: agregar, cambiar cantidad y quitar, sin recargar la página con JavaScript.
- **Checkout** con datos de contacto, despacho o retiro, cálculo de envío por zona y creación de pedido.
- **Pedido** con número correlativo, detalle y estado.
- **Administración** en `/admin` con login, edición de producto, stock por talla y gestión de pedidos.
- **Modelo producto → variantes**, para que una misma polera se venda en S, M, L, XL y XXL.

## Ejecutar

```powershell
npm start
```

La consola muestra las direcciones. Por defecto:

```text
Tienda: http://127.0.0.1:8080
Admin:  http://127.0.0.1:8080/admin
```

Desarrollo con recarga automática:

```powershell
npm run dev
```

## Pruebas

```powershell
npm test
```

Cubre catálogo, filtros, búsqueda con tildes, ficha, carrito, checkout, descuento de stock, administración, devolución de stock al cancelar y archivos privados.

## Estructura

```text
.
├── server.mjs              # entrypoint
├── server/
│   ├── app.mjs             # router HTTP y formularios
│   ├── db.mjs              # esquema, consultas y transacciones SQLite
│   ├── seed.mjs            # catálogo demo y categorías
│   └── views.mjs           # vistas HTML renderizadas en el servidor
├── css/
│   └── store.css           # tema oscuro, responsive
├── assets/                 # portadas demo y favicon
└── tests/
    └── shop.test.mjs       # pruebas de integración
```

## Decisiones de diseño

- **Sin JavaScript en el cliente.** Todo funciona con formularios y enlaces, así que la tienda es indexable y accesible por defecto.
- **El stock se descuenta al crear el pedido**, dentro de una transacción, y vuelve si el pedido se cancela.
- **Precios en CLP enteros con IVA incluido.**
- **Carrito anónimo** identificado por una cookie `HttpOnly`, no por `localStorage`.

## Acceso al panel

`/admin` está protegido con usuario y contraseña.

La primera vez que arranca, si no hay contraseña configurada, se genera una aleatoria y se imprime en la consola. Cámbiala de inmediato:

```powershell
npm run set-password -- "miClaveLarga123"
```

La contraseña se guarda con **scrypt** en la base de datos, nunca en texto plano ni en el código.

| Variable | Efecto |
|---|---|
| `ADMIN_USER` | Usuario del panel (por defecto `admin`) |
| `ADMIN_PASSWORD_HASH` | Hash scrypt; si está definida, tiene prioridad sobre la base de datos |
| `DB_PATH` | Ruta de la base SQLite |

Para generar un hash y usarlo en Docker o en un gestor de secretos:

```powershell
node -e "import('./server/auth.mjs').then(m => console.log(m.hashPassword('miClaveLarga123')))"
```

### Medidas incluidas

- Sesión en base de datos (12 h), revocable al cerrar sesión.
- Cookie `HttpOnly`, `SameSite=Lax` y `Secure` cuando la petición llega por HTTPS.
- Bloqueo tras 5 intentos fallidos por IP durante 15 minutos.
- Verificación de `Origin` en los POST del panel (defensa CSRF).
- Comparación de hash en tiempo constante.

## Pendientes antes de publicar

- **No hay cobro en línea.** El pedido queda `pendiente` y el pago se coordina por fuera.
- Faltan páginas legales (términos, privacidad, cambios y devoluciones) y boleta electrónica.
- Conviene poner Cloudflare Access delante de `/admin` como segunda capa.

## Docker

```bash
docker compose up -d --build
```

La base vive en el volumen `black-rite-shop-data` (`/data/shop.db`).
