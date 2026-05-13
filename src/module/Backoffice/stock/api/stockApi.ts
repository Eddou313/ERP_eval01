import {
  PrestashopWebserviceError,
  requestPrestashopXml,
} from "../../../../utils/prestashopClient";
import { asArray, textFromUnknown, numFromUnknown } from "../../../../utils/helper";

// ========== TYPES STOCK ==========

export type StockItem = {
  id: number;
  id_product: number;
  id_product_attribute: number;
  productName: string;
  reference: string;
  supplier?: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  status: "in_stock" | "low_stock" | "out_of_stock";

  id_shop?: number;
  id_shop_group?: number;
  quantity: number;
  depends_on_stock: boolean;
  // 0 deny / 1 allow / 2 default
  out_of_stock: 0 | 1 | 2;
  location?: string;
};

export type StockMovement = {
  id: number;
  id_product: number;
  id_order?: number;
  id_supply_order?: number;
  id_stock_mvt_reason?: number;
  productName: string;
  reference: string;
  movementType: "import" | "sale" | "adjustment" | "other";
  quantity: number;
  sign?: number;
  date: string;
  employeeName: string;
  price_te?: number;
  reason?: string;
};

export type StockCreateForm = {
  id_product: number;
  id_product_attribute?: number;
  id_shop?: number;
  id_shop_group?: number;
  quantity: number;
  location?: string;
  depends_on_stock?: boolean;
  out_of_stock?: 0 | 1 | 2;
};

export type StockImportForm = StockCreateForm & {
  reference?: string;
  productName?: string;
  movementType?: StockMovement["movementType"];
};

export type PrestashopStockAvailableResponse = {
  prestashop: {
    stock_available?: {
      id?: unknown;
      id_product?: unknown;
      id_product_attribute?: unknown;
      id_shop?: unknown;
      id_shop_group?: unknown;
      quantity?: unknown;
      physical_quantity?: unknown;
      reserved_quantity?: unknown;
      depends_on_stock?: unknown;
      out_of_stock?: unknown;
      location?: unknown;
    };
    stock_availables?: {
      stock_available?: unknown | unknown[];
    };
  };
};

type PrestashopStockAvailableEntry = {
      id?: unknown;
      id_product?: unknown;
      id_product_attribute?: unknown;
      id_shop?: unknown;
      id_shop_group?: unknown;
      quantity?: unknown;
      physical_quantity?: unknown;
      reserved_quantity?: unknown;
      depends_on_stock?: unknown;
      out_of_stock?: unknown;
      location?: unknown;
};

function extractStockAvailableEntries(response: PrestashopStockAvailableResponse): PrestashopStockAvailableEntry[] {
  const fromCollection = response?.prestashop?.stock_availables?.stock_available;
  if (fromCollection) {
    return asArray(fromCollection) as PrestashopStockAvailableEntry[];
  }

  const fromSingle = response?.prestashop?.stock_available;
  if (fromSingle) {
    return [fromSingle as PrestashopStockAvailableEntry];
  }

  return [];
};

export const DEFAULT_STOCK_FORM: StockCreateForm =
  {
    id_product: 0,
    id_product_attribute: 0,
    id_shop: 1,
    id_shop_group: 1,
    quantity: 0,
    depends_on_stock: false,
    out_of_stock: 2,
    location: "",
  };
  // 
  // 

export type PrestashopStockAvailableListResponse = {
  prestashop: {
    stock_availables: {
      stock_available: unknown | unknown[];
    };
  };
};

export type PrestashopStockMovementResponse = {
  prestashop: {
    stock_mvt: {
      id?: unknown;
      id_product?: unknown;
      id_order?: unknown;
      id_supply_order?: unknown;
      id_stock_mvt_reason?: unknown;
      employee_lastname?: unknown;
      employee_firstname?: unknown;
      physical_quantity?: unknown;
      date_add?: unknown;
      sign?: unknown;
      price_te?: unknown;
    };
  };
};

export type PrestashopStockMovementListResponse = {
  prestashop: {
    stock_movements?: {
      stock_movement?: unknown | unknown[];
    };
    stock_mvts?: {
      stock_mvt?: unknown | unknown[];
    };
  };
};

function extractStockMovementItems(response: PrestashopStockMovementListResponse): unknown[] {
  const fromStockMovements = response?.prestashop?.stock_movements?.stock_movement;
  if (fromStockMovements) {
    return asArray(fromStockMovements);
  }

  const fromStockMvts = response?.prestashop?.stock_mvts?.stock_mvt;
  if (fromStockMvts) {
    return asArray(fromStockMvts);
  }

  return [];
}

async function fetchStockMovementsResponse(): Promise<PrestashopStockMovementListResponse> {
  const candidates: Array<{
    path: string;
    query?: Record<string, string>;
  }> = [
    { path: "/stock_movements", query: { display: "full" } },
    { path: "/stock_mvts", query: { display: "full" } },
    { path: "/stock_movements" },
    { path: "/stock_mvts" },
  ];

  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return await requestPrestashopXml<PrestashopStockMovementListResponse>(
        candidate.path,
        candidate.query ? { query: candidate.query } : undefined,
      );
    } catch (error) {
      lastError = error;
      if (
        error instanceof PrestashopWebserviceError &&
        error.status !== 400 &&
        error.status !== 404
      ) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Unable to fetch stock movements");
}

// ========== API STOCK ITEMS ==========

export async function listStockItems(): Promise<StockItem[]> {
  try {
    const response = await requestPrestashopXml<PrestashopStockAvailableListResponse>(
      "/stock_availables",
      { query: { display: "full" } }
    );

    if (!response?.prestashop?.stock_availables?.stock_available) {
      return [];
    }

    const items = asArray(response.prestashop.stock_availables.stock_available);

    // Récupérer les infos produit pour chaque stock
    const stocks = await Promise.all(
      items.map(async (item: any) => {
        const id = numFromUnknown(item?.id);
        const id_product = numFromUnknown(item?.id_product);
        const id_product_attribute = numFromUnknown(item?.id_product_attribute);
        const physicalQuantity = numFromUnknown(item?.physical_quantity);
        const reservedQuantity = numFromUnknown(item?.reserved_quantity);
        const availableQuantity = numFromUnknown(item?.quantity);
        const id_shop = numFromUnknown(item?.id_shop);
        const id_shop_group = numFromUnknown(item?.id_shop_group);
        const quantity = availableQuantity;
        const depends_on_stock = Boolean(numFromUnknown(item?.depends_on_stock));
        const out_of_stock_raw = numFromUnknown(item?.out_of_stock);
        const out_of_stock: 0 | 1 | 2 = [0, 1, 2].includes(out_of_stock_raw)
          ? (out_of_stock_raw as 0 | 1 | 2)
          : 2;
        const location = textFromUnknown(item?.location) || undefined;

        let productName = "Produit";
        let reference = "";
        let supplier = "";

        if (id_product > 0) {
          try {
            const productResponse = await requestPrestashopXml<any>(
              `/products/${id_product}`,
              { query: { display: "full" } }
            );

            if (productResponse?.prestashop?.product) {
              const prod = productResponse.prestashop.product;
              const nameField = prod.name;
              if (nameField) {
                const nameObj = asArray(nameField)[0];
                productName =
                  textFromUnknown(nameObj?.["#text"]) || textFromUnknown(nameField);
              }
              reference = textFromUnknown(prod.reference);
            }
          } catch (e) {
            // Erreur silencieuse
          }
        } else {
          productName = "Produit introuvable";
        }

        // Déterminer le statut
        let status: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
        if (availableQuantity === 0) {
          status = "out_of_stock";
        } else if (availableQuantity < 5) {
          status = "low_stock";
        }

        return {
          id,
          id_product,
          id_product_attribute,
          productName,
          reference,
          supplier,
          physicalQuantity,
          reservedQuantity,
          availableQuantity,
          status,

          id_shop,
          id_shop_group,
          quantity,
          depends_on_stock,
          out_of_stock,
          location,
        };
      })
    );

    return stocks;
  } catch (error) {
    console.error("Error fetching stock items:", error);
    return [];
  }
}

// ========== API STOCK MOVEMENTS ==========

export async function listStockMovements(): Promise<StockMovement[]> {
  try {
    const response = await fetchStockMovementsResponse();
    const items = extractStockMovementItems(response);
    if (items.length === 0) {
      return [];
    }

    // Traiter les mouvements
    const movements = await Promise.all(
      items.map(async (item: any) => {
        const id = numFromUnknown(item?.id);
        const id_product = numFromUnknown(item?.id_product);
        const quantity = numFromUnknown(item?.physical_quantity);
        const dateAdd = textFromUnknown(item?.date_add);
        const employeeLastname = textFromUnknown(item?.employee_lastname);
        const employeeFirstname = textFromUnknown(item?.employee_firstname);
        const sign = numFromUnknown(item?.sign);

        let productName = "Produit";
        let reference = "";

        if (id_product > 0) {
          try {
            const productResponse = await requestPrestashopXml<any>(
              `/products/${id_product}`,
              { query: { display: "full" } }
            );

            if (productResponse?.prestashop?.product) {
              const prod = productResponse.prestashop.product;
              const nameField = prod.name;
              if (nameField) {
                const nameObj = asArray(nameField)[0];
                productName =
                  textFromUnknown(nameObj?.["#text"]) || textFromUnknown(nameField);
              }
              reference = textFromUnknown(prod.reference);
            }
          } catch (e) {
            // Erreur silencieuse
          }
        } else {
          productName = "Produit introuvable";
        }

        // Déterminer le type de mouvement selon le signe
        let movementType: "import" | "sale" | "adjustment" | "other" = "other";
        if (sign > 0) {
          movementType = "import";
        } else if (sign < 0) {
          movementType = "sale";
        }

        const employeeName =
          employeeFirstname || employeeLastname
            ? `${employeeFirstname} ${employeeLastname}`
            : "Système";

        return {
          id,
          id_product,
          productName,
          reference,
          movementType,
          quantity: Math.abs(quantity),
          date: dateAdd,
          employeeName,
        };
      })
    );

    // Trier par date décroissante (plus récent en premier)
    return movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    return [];
  }
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function getStatusLabel(status: StockItem["status"]): string {
  switch (status) {
    case "in_stock":
      return "En stock";
    case "low_stock":
      return "Stock faible";
    case "out_of_stock":
      return "Rupture de stock";
    default:
      return "Inconnu";
  }
}

export function getStatusColor(status: StockItem["status"]): string {
  switch (status) {
    case "in_stock":
      return "#10b981";
    case "low_stock":
      return "#f59e0b";
    case "out_of_stock":
      return "#ef4444";
    default:
      return "#6b7280";
  }
}

export async function getStockByProductId(productId: number,productAttributeId?: number): Promise<number | null> {
  try {
    const queryWithProduct: Record<string, string> = {
      "filter[id_product]": `[${productId}]`,
      display: "full",
    };

    if (productAttributeId !== undefined) {
      queryWithProduct["filter[id_product_attribute]"] = `[${productAttributeId}]`;
    }

    const response = await requestPrestashopXml<PrestashopStockAvailableResponse>(
      "/stock_availables",
      { query: queryWithProduct }
    );

    const entries = extractStockAvailableEntries(response);
    if (entries.length === 0) {
      return null;
    }

    const normalizedEntries = entries.map((entry) => ({
      id_product_attribute: numFromUnknown(entry?.id_product_attribute),
      quantity: numFromUnknown(entry?.quantity),
    }));

    // Cas déclinaison: on retourne la quantité exacte de la combinaison sélectionnée.
    if (productAttributeId !== undefined && productAttributeId > 0) {
      const matching = normalizedEntries.find(
        (entry) => entry.id_product_attribute === productAttributeId
      );
      if (matching) return matching.quantity;
    }

    // Cas produit simple: ligne principale avec id_product_attribute = 0.
    const simpleProductStock = normalizedEntries.find(
      (entry) => entry.id_product_attribute === 0
    );
    if (simpleProductStock) {
      return simpleProductStock.quantity;
    }

    // Cas sans sélection de déclinaison: somme des déclinaisons.
    const sumOfCombinations = normalizedEntries.reduce(
      (accumulator, entry) => accumulator + entry.quantity,
      0
    );
    return sumOfCombinations;
  } catch (e: any) {
    console.error(
      `Error fetching stock for product ${productId}:`,
      e
    );

    return null;
  }
}


