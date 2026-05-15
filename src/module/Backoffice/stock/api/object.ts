// ========== TYPES STOCK ==========

import { asArray } from "../../../../utils/helper";
import { PrestashopWebserviceError, requestPrestashopXml } from "../../../../utils/prestashopClient";

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

export type PrestashopStockAvailableEntry = {
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

export function extractStockAvailableEntries(response: PrestashopStockAvailableResponse): PrestashopStockAvailableEntry[] {
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

export function extractStockMovementItems(response: PrestashopStockMovementListResponse): unknown[] {
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

export async function fetchStockMovementsResponse(): Promise<PrestashopStockMovementListResponse> {
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