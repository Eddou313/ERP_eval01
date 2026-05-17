export const normalizeText = (value: string): string => value.trim().toLowerCase();

/**
 * Utilitaires et fonctions helper partagées
 * Ce fichier centralise les fonctions communes utilisées dans les différents modules
 */

// ============================================================
// ✅ VALIDATEURS PrestaShop API
// ============================================================

/**
 * Valide un ID non-signé (> 0)
 * Format: isUnsignedId
 */
export function validateUnsignedId(value: unknown): boolean {
  const num = numFromUnknown(value);
  return num > 0;
}

/**
 * Valide un prix (>= 0)
 * Format: isPrice
 */
export function validatePrice(value: unknown): boolean {
  const num = numFromUnknown(value);
  return num >= 0 && Number.isFinite(num);
}

/**
 * Valide un nombre flottant (> 0)
 * Format: isFloat
 */
export function validateFloat(value: unknown): boolean {
  const num = numFromUnknown(value);
  return num > 0 && Number.isFinite(num);
}

/**
 * Valide un booléen (0 ou 1)
 * Format: isBool
 */
export function validateBool(value: unknown): boolean {
  const text = textFromUnknown(value);
  return text === "0" || text === "1" || text === "" || text === "true" || text === "false";
}

/**
 * Valide un nom de module
 * Format: isModuleName - alphanumérique + tirets/underscores
 */
export function validateModuleName(value: unknown): boolean {
  const text = textFromUnknown(value);
  return /^[a-zA-Z0-9_-]+$/.test(text);
}

/**
 * Valide un nom générique
 * Format: isGenericName - alphanumérique + espaces
 */
export function validateGenericName(value: unknown): boolean {
  const text = textFromUnknown(value);
  return /^[a-zA-Z0-9\s\-_'àâäéèêëïîôùûüœæçñ.]+$/i.test(text);
}

/**
 * Valide un hash MD5
 * Format: isMd5 - 32 caractères hexadécimaux
 */
export function validateMd5(value: unknown): boolean {
  const text = textFromUnknown(value);
  return /^[a-f0-9]{32}$/i.test(text) || text.length === 0;
}

/**
 * Valide du HTML sécurisé
 * Format: isCleanHtml
 */
export function validateCleanHtml(value: unknown): boolean {
  const text = textFromUnknown(value);
  // Accepte le HTML basique mais rejette les attributs dangereux
  return !/on\w+\s*=/i.test(text) && !/script/i.test(text);
}

/**
 * Valide une date
 * Format: isDate - YYYY-MM-DD ou YYYY-MM-DD HH:mm:ss
 */
export function validateDate(value: unknown): boolean {
  const text = textFromUnknown(value);
  const dateRegex = /^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}:\d{2})?$/;
  if (!dateRegex.test(text)) return false;

  // Vérifie si c'est une date valide
  const date = new Date(text);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Valide un numéro de suivi
 * Format: isTrackingNumber - alphanumérique
 */
export function validateTrackingNumber(value: unknown): boolean {
  const text = textFromUnknown(value);
  return /^[a-zA-Z0-9\-\s]+$/.test(text) || text.length === 0;
}

/**
 * Extrait du texte à partir d'une valeur inconnue (objet, string, number, etc)
 * Gère les formats XML convertis en JSON (__cdata, #text, valeur directe)
 */
export function textFromUnknown(value: unknown): string {
  if (value === undefined || value === null) return "";

  if (typeof value === "object") {
    // Handle language arrays or multilingual objects
    if (Array.isArray(value)) {
      const first = value[0];
      if (typeof first === "object") {
        return textFromUnknown(first);
      }
      return String(value[0]).trim();
    }

    // Handle nested language objects { language: { __cdata: "..." } }
    const lang = (value as any)["language"];
    if (lang !== undefined && lang !== null) {
      return textFromUnknown(lang);
    }

    // Format détail PrestaShop: __cdata
    const cdata = (value as any)["__cdata"];
    if (cdata !== undefined && cdata !== null) {
      return String(cdata).trim();
    }

    // Format liste PrestaShop: #text
    const text = (value as any)["#text"];
    if (text !== undefined && text !== null) {
      return String(text).trim();
    }
  }

  return String(value).trim();
}

/**
 * Convertit une valeur en nombre
 * Utilise textFromUnknown en premier pour extraire le texte, puis convertit en nombre
 * Retourne 0 si la conversion échoue
 */
export function numFromUnknown(value: unknown): number {
  const n = Number(textFromUnknown(value));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convertit une valeur en booléen
 * Retourne true si la valeur extraite est "1" (convention PrestaShop)
 */
export function boolFromUnknown(value: unknown): boolean {
  return textFromUnknown(value) === "1";
}

/**
 * Convertit une valeur en tableau
 * Gère les cas: undefined, valeur simple, tableau
 */
export function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// ==================== Formats multilingues PrestaShop ====================

export type PrestashopLanguageField = {
  language:
  | { "@_id": number | string; "#text"?: string }
  | Array<{ "@_id": number | string; "#text"?: string }>;
};

/**
 * Extrait le texte de la première langue d'un champ multilingue PrestaShop
 * Ex: { language: [{ "@_id": 1, "#text": "Nom" }] } => "Nom"
 */
export function getFirstLanguageText(field?: PrestashopLanguageField): string {
  if (!field) return "";
  const languages = asArray(field.language);
  return textFromUnknown(languages[0]?.["#text"]);
}

/**
 * Extrait les mots-clés d'un champ PrestaShop multilingue
 * Divise par virgules, retours à la ligne ou point-virgules
 */
export function keywordsFromField(field?: PrestashopLanguageField): string[] {
  const raw = getFirstLanguageText(field);
  if (!raw) return [];
  return raw
    .split(/[\n,;]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

// ==================== Formatage et conversion ====================

/**
 * Échappe une valeur pour le format CSV
 * Entoure de guillemets et échappe les guillemets internes
 */
export function toCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Formate une date lisible (français)
 * Entrée: "2025-05-10 14:30:00" ou ISO string
 * Sortie: "10/05/2025 14:30" ou "-"
 */
export function formatDate(value?: string): string {
  if (!value) return "-";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return value;
  }
}

/**
 * Formate un prix en devise générique
 * Par défaut: "Ar" (Ariary malgache)
 * Ex: 1500.50 => "1 500,50 Ar"
 */
export function formatCurrency(value: number, currency = "€"): string {
  // Pre-round to exactly 2 decimals to avoid toLocaleString rounding issues
  const rounded = Math.round(value * 100) / 100;
  return `${rounded.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

/**
 * Calcule le prix TTC à partir du prix HT
 * Applique le taux de TVA (par défaut 20%)
 * Ex: 100 HT + 20% TVA = 120 TTC
 */
export function withTax(priceHt: number, taxRate = 20): number {
  return Number((priceHt * (1 + taxRate / 100)).toFixed(6));
}

/**
 * Convertit un prix HT en prix TTC (alias de withTax)
 */
export function computeTtc(priceHt: number, taxRate = 20): number {
  return withTax(priceHt, taxRate);
}

// ==================== Transformations de texte ====================

/**
 * Convertit une phrase en slug URL-friendly
 * Ex: "Mon Produit" => "mon-produit"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ==================== Conversions de types ====================

/**
 * Convertit booléen ou nombre en format PrestaShop (0 ou 1)
 * Utilisé pour les PUT/POST requests
 */
export function toPrestashopBool(value: boolean | number): number {
  if (typeof value === "number") return value ? 1 : 0;
  return value ? 1 : 0;
}

/**
 * Construit un champ de langue PrestaShop standard
 * Ex: languageField("Mon texte") => { language: { "@_id": 1, "#text": "Mon texte" } }
 */
export function languageField(value: string, languageId = 1) {
  return {
    language: {
      "@_id": languageId,
      "#text": value,
    },
  };
}

// ==================== Horodatage ====================

/**
 * Génère un timestamp au format: YYYY-MM-DD
 * Utilisé pour les noms de fichiers d'export (ex: export-2026-05-10.csv)
 */
export function dateStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ==================== Fonctions aliases pour compatibilité ====================

/**
 * Alias de textFromUnknown pour les modules qui utilisent un nommage différent
 */
export function stringFromPrestashop(value: unknown): string {
  return textFromUnknown(value);
}

/**
 * Alias de boolFromUnknown pour les modules qui utilisent un nommage différent
 */
export function boolFromPrestashop(value: unknown): boolean {
  return boolFromUnknown(value);
}

/**
 * Alias de numFromUnknown pour les modules qui utilisent un nommage différent
 */
export function numFromPrestashop(value: unknown): number {
  return numFromUnknown(value);
}

/**
 * Formate un prix EUR avec symbole €
 * Ex: 15.50 => "15,50 €"
 */
export function formatCurrencyEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Alias de keywordsFromField pour les modules qui utilisent un nommage différent
 */
export function keywordsFromPrestashop(field?: PrestashopLanguageField): string[] {
  return keywordsFromField(field);
}

// ==================== Images de produits ====================
function getPrestashopImageBaseUrl(): string {
  const prestashopBase = (import.meta.env.VITE_BASE_URL_FULL || "").replace(/\/$/, "");

  if (!prestashopBase) {
    const apiBase = (import.meta.env.VITE_BASE_URL || "/api").replace(/\/$/, "");
    return `${window.location.origin}${apiBase}`;
  }

  return `${prestashopBase}/api`;
}

function getPrestashopApiKey(): string {
  return String(import.meta.env.VITE_API_KEY || "").trim();
}

/**
 * Construit l'URL d'une image produit via le proxy Vite
 *
 * Exemple :
 * http://localhost:5173/api/images/products/7/7
 */
export function getProductImageUrl(
  productId: number,
  imageId: number,
): string {
  const baseUrl = getPrestashopImageBaseUrl();
  const wsKey = getPrestashopApiKey();

  const query = wsKey ? `?ws_key=${encodeURIComponent(wsKey)}` : "";

  return `${baseUrl}/images/products/${productId}/${imageId}${query}`;
}

/**
 * Retourne l'image produit ou un placeholder
 */
export function getProductImageUrlWithFallback(
  productId: number,
  imageId?: number,
  placeholderUrl: string = "",
): string {
  if (!imageId || imageId <= 0) {
    return placeholderUrl;
  }

  return getProductImageUrl(productId, imageId);
}
// transformation de chaine grouper em json// Définition d'une interface pour la clarté
interface ProductAchat {
  reference_produit: string;
  quantity: number;
  attribut: string;
}

const transformMultipleStringsToJSON = (str: string): (string | number)[][] => {
  if (!str) return [];

  const matches = str.match(/\(([^)]+)\)/g);
  if (!matches) return [];

  return matches.map(group => {
    const cleanGroup = group.replace(/[()]/g, '');
    const parts = cleanGroup.split(';');

    return parts.map(item => {
      let value = item.trim().replace(/"/g, '');
      if (value === "") return "";

      // On vérifie si c'est un nombre, mais on s'assure de ne pas transformer "T_01" en NaN
      const num = Number(value);
      return !isNaN(num) && value !== "" ? num : value;
    });
  });
};

export const transformToObjects = (str: string): ProductAchat[] => {
  const data = transformMultipleStringsToJSON(str);

  return data.map(item => ({
    // On force le typage ici pour correspondre à l'interface
    reference_produit: String(item[0] || ""),
    quantity: Number(item[1] || 0),
    attribut: String(item[2] || "")
  }));
};