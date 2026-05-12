export type ProductBadge = {
  label: string;
  tone: "sale" | "new";
};

export type ProductColor = {
  name: string;
  value: string;
};

export type Product = {
  slug: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  description: string;
  image: string;
  gallery: string[];
  badges: ProductBadge[];
  sizes: string[];
  colors: ProductColor[];
  featuredColor: string;
};

const image = (seed: string) => `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=1200&q=80`;

export const products: Product[] = [
  {
    slug: "tshirt-imprime-colibri",
    name: "T-shirt imprimé colibri",
    category: "Vêtements",
    price: 22.94,
    oldPrice: 28.68,
    description:
      "Coupe classique, col rond, manches courtes. T-shirt en coton doux avec une impression lumineuse au centre.",
    image: image("photo-1521572267360-ee0c2909d518"),
    gallery: [
      image("photo-1521572267360-ee0c2909d518"),
      image("photo-1503342217505-b0a15ec3261c"),
    ],
    badges: [
      { label: "-20%", tone: "sale" },
      { label: "NOUVEAU", tone: "new" },
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Blanc", value: "#f5f5f5" },
      { name: "Noir", value: "#3f4752" },
      { name: "Bleu", value: "#3c78a6" },
    ],
    featuredColor: "Blanc",
  },
  {
    slug: "pull-imprime-colibri",
    name: "Pull imprimé colibri",
    category: "Vêtements",
    price: 34.46,
    oldPrice: 43.08,
    description:
      "Un sweat léger et confortable avec impression centrale, parfait pour une silhouette décontractée.",
    image: image("photo-1523398002811-999ca8dec234"),
    gallery: [
      image("photo-1523398002811-999ca8dec234"),
      image("photo-1496747611176-843222e1e57c"),
    ],
    badges: [
      { label: "-20%", tone: "sale" },
      { label: "NOUVEAU", tone: "new" },
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Blanc", value: "#f3f3f3" },
      { name: "Gris", value: "#69707a" },
    ],
    featuredColor: "Blanc",
  },
  {
    slug: "affiche-the-best",
    name: "Affiche encadrée The Best Is Yet To Come",
    category: "Maison",
    price: 34.8,
    description:
      "Affiche décorative encadrée avec un style graphique sobre et moderne pour un intérieur lumineux.",
    image: image("photo-1513519245088-0e12902e35ca"),
    gallery: [image("photo-1513519245088-0e12902e35ca")],
    badges: [{ label: "NOUVEAU", tone: "new" }],
    sizes: ["30 x 40", "40 x 50", "50 x 70"],
    colors: [
      { name: "Noir", value: "#333333" },
      { name: "Blanc", value: "#ffffff" },
    ],
    featuredColor: "Noir",
  },
  {
    slug: "affiche-adventure-begins",
    name: "Affiche encadrée The Adventure Begins",
    category: "Maison",
    price: 34.8,
    description:
      "Affiche inspirante avec typographie expressive et cadre sombre pour un rendu très visuel.",
    image: image("photo-1500530855697-b586d89ba3ee"),
    gallery: [image("photo-1500530855697-b586d89ba3ee")],
    badges: [{ label: "NOUVEAU", tone: "new" }],
    sizes: ["30 x 40", "40 x 50", "50 x 70"],
    colors: [
      { name: "Noir", value: "#2d3238" },
      { name: "Beige", value: "#dfd7c9" },
    ],
    featuredColor: "Noir",
  },
  {
    slug: "affiche-today-good-day",
    name: "Affiche encadrée Today Is A Good Day",
    category: "Maison",
    price: 34.8,
    description:
      "Affiche minimaliste avec fond clair, adaptée à une décoration simple et chaleureuse.",
    image: image("photo-1487412720507-e7ab37603c6f"),
    gallery: [image("photo-1487412720507-e7ab37603c6f")],
    badges: [{ label: "NOUVEAU", tone: "new" }],
    sizes: ["30 x 40", "40 x 50", "50 x 70"],
    colors: [
      { name: "Blanc", value: "#f6f6f6" },
      { name: "Noir", value: "#444444" },
    ],
    featuredColor: "Blanc",
  },
  {
    slug: "mug-the-best",
    name: "Mug The Best Is Yet To Come",
    category: "Maison",
    price: 14.28,
    description:
      "Mug en céramique blanche avec impression contrastée, conçu pour un usage quotidien.",
    image: image("photo-1514228742587-6b1558fcca3d"),
    gallery: [image("photo-1514228742587-6b1558fcca3d")],
    badges: [{ label: "NOUVEAU", tone: "new" }],
    sizes: ["350 ml"],
    colors: [
      { name: "Blanc", value: "#f4f4f4" },
      { name: "Gris", value: "#5b6470" },
    ],
    featuredColor: "Blanc",
  },
  {
    slug: "mug-adventure-begins",
    name: "Mug The Adventure Begins",
    category: "Maison",
    price: 14.28,
    description:
      "Mug décoratif avec visuel centré et contraste élevé pour une collection assortie.",
    image: image("photo-1495474472287-4d71bcdd2085"),
    gallery: [image("photo-1495474472287-4d71bcdd2085")],
    badges: [{ label: "NOUVEAU", tone: "new" }],
    sizes: ["350 ml"],
    colors: [
      { name: "Blanc", value: "#f4f4f4" },
      { name: "Vert", value: "#466b5a" },
    ],
    featuredColor: "Blanc",
  },
  {
    slug: "mug-today-good-day",
    name: "Mug Today Is A Good Day",
    category: "Maison",
    price: 14.28,
    description:
      "Mug lumineux avec motif typographique, pensé pour la liste et le détail d’un produit statique.",
    image: image("photo-1513558161293-cdaf765ed2fd"),
    gallery: [image("photo-1513558161293-cdaf765ed2fd")],
    badges: [{ label: "NOUVEAU", tone: "new" }],
    sizes: ["350 ml"],
    colors: [
      { name: "Blanc", value: "#f7f7f7" },
      { name: "Rose", value: "#d15e7f" },
    ],
    featuredColor: "Blanc",
  },
];

export const productDetail = products[0];

export const getProductBySlug = (slug: string | undefined) =>
  products.find((product) => product.slug === slug) ?? products[0];

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);