/* ==========================================================================
   Black Rite Shop — catálogo demo
   ========================================================================== */

export const CATEGORIAS = {
  "heavy-metal": "Heavy Metal",
  thrash: "Thrash Metal",
  "death-metal": "Death Metal",
  "rock-clasico": "Rock Clásico",
  "groove-metal": "Groove Metal"
};

export const SEED_PRODUCTS = [
  {
    slug: "metallica-master-of-puppets",
    nombre: "Metallica · Master of Puppets",
    categoria: "heavy-metal",
    descripcion:
      "Polera negra de algodón pesado con el arte de Master of Puppets al frente y el logo de la banda en la espalda. Corte regular, cuello reforzado y estampado de alta cobertura.",
    precio: 17990,
    precioAnterior: 21990,
    imagen: "assets/metallica-master-of-puppets.svg",
    destacado: true,
    stock: { S: 6, M: 14, L: 18, XL: 9, XXL: 3 }
  },
  {
    slug: "slayer-reign-in-blood",
    nombre: "Slayer · Reign in Blood",
    categoria: "thrash",
    descripcion:
      "El águila de Reign in Blood en impresión a todo color sobre algodón negro. Estampado frontal grande y tipografía de gira en la espalda.",
    precio: 15990,
    precioAnterior: null,
    imagen: "assets/slayer-reign-in-blood.svg",
    destacado: true,
    stock: { S: 4, M: 9, L: 12, XL: 7, XXL: 0 }
  },
  {
    slug: "death-symbolic",
    nombre: "Death · Symbolic",
    categoria: "death-metal",
    descripcion:
      "Edición de Symbolic con el ojo del arte original al centro. Tinta mate, algodón 180 g y costura doble en hombros.",
    precio: 17990,
    precioAnterior: null,
    imagen: "assets/death-symbolic.svg",
    destacado: false,
    stock: { S: 2, M: 5, L: 8, XL: 4, XXL: 1 }
  },
  {
    slug: "black-sabbath-paranoid",
    nombre: "Black Sabbath · Paranoid",
    categoria: "rock-clasico",
    descripcion:
      "El disco que inventó todo. Arte de Paranoid en versión monocromo de alto contraste sobre polera negra de corte clásico.",
    precio: 14990,
    precioAnterior: 16990,
    imagen: "assets/black-sabbath-paranoid.svg",
    destacado: true,
    stock: { S: 8, M: 11, L: 15, XL: 6, XXL: 4 }
  },
  {
    slug: "iron-maiden-the-trooper",
    nombre: "Iron Maiden · The Trooper",
    categoria: "heavy-metal",
    descripcion:
      "Eddie con la bandera británica, estampado a dos caras. La polera de gira por excelencia, en algodón peinado.",
    precio: 18990,
    precioAnterior: null,
    imagen: "assets/iron-maiden-the-trooper.svg",
    destacado: true,
    stock: { S: 3, M: 7, L: 10, XL: 8, XXL: 2 }
  },
  {
    slug: "pantera-vulgar-display-of-power",
    nombre: "Pantera · Vulgar Display of Power",
    categoria: "groove-metal",
    descripcion:
      "La portada más directa del groove metal, impresa en grande al frente y con el logo en la espalda. Algodón denso, caída recta.",
    precio: 16990,
    precioAnterior: 19990,
    imagen: "assets/pantera-vulgar-display.svg",
    destacado: false,
    stock: { S: 5, M: 6, L: 9, XL: 5, XXL: 0 }
  }
];
