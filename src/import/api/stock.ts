import { recordStockMovement } from "../../module/Backoffice/stock/api/stockMovementService";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type StockMovementSign = 1 | -1;

type StockEntry = { id: string; id_product_attribute: string; quantity: string };

// ─────────────────────────────────────────────
// FETCH TOUS LES STOCKS D'UN PRODUIT
// ─────────────────────────────────────────────

async function fetchAllStocks(productId: number): Promise<StockEntry[]> {
  const res = await requestPrestashopXml<any>("/stock_availables", {
    query: {
      display: "[id,id_product_attribute,quantity]",
      "filter[id_product]": `[${productId}]`,
      limit: "999",
    },
  });

  const items = res?.prestashop?.stock_availables?.stock_available;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

// ─────────────────────────────────────────────
// TROUVER LE STOCK D'UNE COMBINATION
// via l'endpoint dédié PrestaShop :
// GET /stock_availables?filter[id_product]=X&filter[id_product_attribute]=Y
// ─────────────────────────────────────────────

async function findStockForCombination(
  productId: number,
  combinationId: number
): Promise<StockEntry | null> {
  const res = await requestPrestashopXml<any>("/stock_availables", {
    query: {
      display: "[id,id_product_attribute,quantity]",
      "filter[id_product]":           `[${productId}]`,
      "filter[id_product_attribute]": `[${combinationId}]`,
      limit: "1",
    },
  });

  const items = res?.prestashop?.stock_availables?.stock_available;
  if (!items) return null;

  const list: StockEntry[] = Array.isArray(items) ? items : [items];
  return list[0] ?? null;
}

// ─────────────────────────────────────────────
// SET STOCK AVAILABLE
// ─────────────────────────────────────────────

export async function setStockAvailable(
  stockId: number,
  productId: number,
  combinationId: number,
  quantity: number
): Promise<void> {
  await requestPrestashopXml<any>(`/stock_availables/${stockId}`, {
    method: "PUT",
    bodyXml: buildPrestashopXml({
      prestashop: {
        stock_available: {
          id:                   stockId,
          id_product:           productId,
          id_product_attribute: combinationId,
          id_shop:              1,
          id_shop_group:        0,
          quantity,
          depends_on_stock:     0,
          out_of_stock:         2,
        },
      },
    }),
  });
}

// ─────────────────────────────────────────────
// RECALCUL STOCK PARENT
// ─────────────────────────────────────────────

async function recalculerStockParent(
  productId: number,
  updatedCombinationId: number,
  updatedQuantity: number
): Promise<void> {
  const list = await fetchAllStocks(productId);

  let totalStock = 0;
  let parentStockId: number | null = null;

  for (const s of list) {
    const combId = Number(s.id_product_attribute);
    if (combId === 0) {
      parentStockId = Number(s.id);
    } else {
      const qty = combId === updatedCombinationId
        ? updatedQuantity
        : Number(s.quantity) || 0;
      totalStock += qty;
    }
  }

  if (parentStockId !== null) {
    await setStockAvailable(parentStockId, productId, 0, totalStock);
    console.log(`[stock] Parent produit ${productId} → ${totalStock}`);
  }
}

// ─────────────────────────────────────────────
// UPDATE STOCK + MOUVEMENT
// ─────────────────────────────────────────────

export async function updateStockWithMovement(
  productId: number,
  quantity: number,
  combinationId = 0,
  sign: StockMovementSign = 1,
  employeeId = 1
): Promise<void> {
  // ── 1. Chercher le stock_available de la combination ──
  //    Utiliser un double filtre pour cibler précisément la bonne ligne
  const stockEntry = combinationId > 0
    ? await findStockForCombination(productId, combinationId)
    : (await fetchAllStocks(productId)).find((s) => Number(s.id_product_attribute) === 0) ?? null;

  if (!stockEntry) {
    // ── Fallback : PrestaShop a peut-être créé la stock_available
    //    mais elle n'est pas encore indexée — attendre 500ms et réessayer
    await new Promise((r) => setTimeout(r, 500));
    const retry = combinationId > 0
      ? await findStockForCombination(productId, combinationId)
      : (await fetchAllStocks(productId)).find((s) => Number(s.id_product_attribute) === 0) ?? null;

    if (!retry) {
      console.error(`[stock] stock_available introuvable — produit ${productId}, combination ${combinationId}`);
      return;
    }

    return updateStockWithMovement(productId, quantity, combinationId, sign, employeeId);
  }

  // ── 2. Mettre à jour la quantité ──
  await setStockAvailable(Number(stockEntry.id), productId, combinationId, quantity);
  console.log(`[stock] Stock mis à jour — produit ${productId}, combination ${combinationId} → ${quantity}`);

  // ── 3. Enregistrer le mouvement ──
  const quantityDelta = sign === 1 ? quantity : -quantity;
  await recordStockMovement(
    productId,
    quantityDelta,
    combinationId > 0 ? combinationId : undefined,
    "adjustment",
    employeeId
  );

  // ── 4. Recalculer le stock parent si c'est une combination ──
  if (combinationId !== 0) {
    await recalculerStockParent(productId, combinationId, quantity);
  }
}