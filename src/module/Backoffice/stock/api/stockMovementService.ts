/**
 * Service métier pour la gestion des mouvements de stock
 * Gère les règles de création et modification de stock
 */

import { buildPrestashopXml, PrestashopWebserviceError, requestPrestashopXml } from "../../../../utils/prestashopClient";
import { numFromUnknown } from "../../../../utils/helper";

/**
 * Enregistre un mouvement de stock avec signe automatique
 * @param idProduct ID du produit
 * @param quantityDelta Différence de quantité (positif = augmentation, négatif = diminution)
 * @param idProductAttribute ID de la variante (optionnel)
 * @param reason Raison du mouvement (manuel, vente, etc.)
 * @param idEmployee ID de l'employé (optionnel, par défaut 1)
 * @returns { success, movementId, message }
 */
export async function recordStockMovement(
  idProduct: number,
  quantityDelta: number,
  idProductAttribute?: number,
  reason: string = "adjustment",
  idEmployee: number = 1
): Promise<{
  success: boolean;
  movementId?: number;
  message: string;
}> {
  // ✓ Validations entrantes
  if (!idProduct || idProduct <= 0) {
    return { success: false, message: "ID produit invalide" };
  }

  if (quantityDelta === 0) {
    return { success: false, message: "La quantité doit être différente de 0" };
  }

  if (Math.abs(quantityDelta) > 999999) {
    return { success: false, message: "Quantité hors limites (max 999999)" };
  }

  if (idEmployee <= 0) {
    return { success: false, message: "ID employé invalide" };
  }

  try {
    // ✓ Déterminer le signe selon le sens du mouvement
    const sign = quantityDelta > 0 ? 1 : -1;
    const absoluteQuantity = Math.abs(quantityDelta);

    // ✓ Format date compatible Prestashop (YYYY-MM-DD HH:mm:ss)
    const now = new Date();
    const dateAdd = now.toISOString().split("T")[0] + " " + now.toTimeString().slice(0, 8);

    // ✓ Résoudre l'ID stock attendu par certains endpoints PrestaShop
    const productAttributeId = idProductAttribute && idProductAttribute > 0 ? idProductAttribute : 0;
    const stockAvailableResponse = await requestPrestashopXml<any>("/stock_availables", {
      query: {
        display: "full",
        "filter[id_product_attribute]": `[${productAttributeId}]`,
      },
    });

    const rawEntries = stockAvailableResponse?.prestashop?.stock_availables?.stock_available;
    const stockEntries = Array.isArray(rawEntries)
      ? rawEntries
      : rawEntries
        ? [rawEntries]
        : [];

    const stockEntry = stockEntries[0];
    let idStock = numFromUnknown(stockEntry?.id_stock ?? stockEntry?.id_stock_available);
    if (!idStock || idStock <= 0) {
      try {
        const stocksResponse = await requestPrestashopXml<any>("/stocks", {
          query: {
            display: "[id]",
            "filter[id_product_attribute]": `[${productAttributeId}]`,
          },
        });
        const rawStocks = stocksResponse?.prestashop?.stocks?.stock;
        const stocks = Array.isArray(rawStocks) ? rawStocks : rawStocks ? [rawStocks] : [];
        idStock = numFromUnknown(stocks[0]?.id ?? stocks[0]?.["@_id"]);
      } catch {
        // Fallback handled below
      }
    }
    if (!idStock || idStock <= 0) {
      // Fallback: certaines configs exposent id_stock via la ressource stock_available elle-même
      idStock = numFromUnknown(stockEntry?.id);
    }
    if (!idStock || idStock <= 0) {
      return {
        success: false,
        message: `Aucun stock disponible trouvé pour le produit ${idProduct} (attribut ${productAttributeId})`,
      };
    }

    let priceTe = numFromUnknown(stockEntry?.price_te);
    if (!Number.isFinite(priceTe) || priceTe < 0) {
      try {
        const productResponse = await requestPrestashopXml<any>(`/products/${idProduct}`, {
          query: { display: "[wholesale_price]" },
        });
        priceTe = numFromUnknown(productResponse?.prestashop?.product?.wholesale_price);
      } catch {
        priceTe = 0;
      }
    }
    if (!Number.isFinite(priceTe) || priceTe < 0) {
      priceTe = 0;
    }

    const movementPayload = {
      id_stock: idStock,
      id_stock_mvt_reason: reasonToReasonId(reason),
      id_employee: idEmployee,
      physical_quantity: absoluteQuantity,
      sign,
      price_te: priceTe,
      date_add: dateAdd,
    };

    const candidates: Array<{ path: string; root: "stock_movement" }> = [
      { path: "/stock_movements", root: "stock_movement" },
    ];

    let lastErrorMessage = "";

    for (const candidate of candidates) {
      try {
        const xmlPayload = buildPrestashopXml({
          prestashop: {
            [candidate.root]: movementPayload,
          },
        });

        const response = await requestPrestashopXml<any>(candidate.path, {
          method: "POST",
          bodyXml: xmlPayload,
        });

        const createdMovement = response?.prestashop?.[candidate.root];
        const movementId = numFromUnknown(createdMovement?.id ?? createdMovement?.["@_id"]);

        if (movementId && movementId > 0) {
          console.log(`✓ Mouvement de stock créé: ID ${movementId}, produit ${idProduct}, Δ${sign > 0 ? "+" : ""}${absoluteQuantity}`);
          return {
            success: true,
            movementId,
            message: `Mouvement enregistré (ID ${movementId})`,
          };
        }
      } catch (error) {
        const errorMsg = error instanceof PrestashopWebserviceError
          ? `${error.message}${error.responseText ? ` - ${error.responseText}` : ""}`
          : error instanceof Error
            ? error.message
            : String(error);
        lastErrorMessage = `${candidate.path}: ${errorMsg}`;
      }
    }

    return {
      success: false,
      message: `Création mouvement refusée par PrestaShop${lastErrorMessage ? ` (${lastErrorMessage})` : ""}`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Erreur enregistrement mouvement:", errorMsg);
    return {
      success: false,
      message: `Erreur API: ${errorMsg}`,
    };
  }
}


/**
 * Met à jour le stock via l'API custom stockapi
 * @param idProduct ID du produit
 * @param quantityDelta Différence de quantité à appliquer
 * @param idProductAttribute ID de la variante (optionnel)
 * @returns true si succès, false sinon
 */
export async function updateStockViaApi(
  idProduct: number,
  quantityDelta: number,
  idProductAttribute?: number
): Promise<boolean> {
  try {
    if (!idProduct || idProduct <= 0) {
      console.error("ID produit invalide");
      return false;
    }

    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
      console.error("Delta de quantité invalide");
      return false;
    }

    const productAttributeId = idProductAttribute && idProductAttribute > 0 ? idProductAttribute : 0;

    const response = await requestPrestashopXml<any>("/stock_availables", {
      query: {
        display: "full",
        "filter[id_product]": `[${idProduct}]`,
        "filter[id_product_attribute]": `[${productAttributeId}]`,
      },
    });

    const rawEntries = response?.prestashop?.stock_availables?.stock_available;
    const entries = Array.isArray(rawEntries)
      ? rawEntries
      : rawEntries
        ? [rawEntries]
        : [];

    const stockEntry = entries[0];
    if (!stockEntry) {
      console.error(`Stock disponible introuvable pour le produit ${idProduct} (attribut ${productAttributeId})`);
      return false;
    }

    const stockAvailableId = numFromUnknown(stockEntry.id ?? stockEntry["@_id"]);
    const currentQuantity = numFromUnknown(stockEntry.quantity);
    const nextQuantity = currentQuantity + quantityDelta;

    if (!stockAvailableId || stockAvailableId <= 0) {
      console.error("ID stock_available invalide");
      return false;
    }

    if (nextQuantity < 0) {
      console.error(`Mise à jour refusée: quantité négative (${nextQuantity})`);
      return false;
    }

    const xmlPayload = buildPrestashopXml({
      prestashop: {
        stock_available: {
          id: stockAvailableId,
          id_product: numFromUnknown(stockEntry.id_product) || idProduct,
          id_product_attribute: numFromUnknown(stockEntry.id_product_attribute),
          id_shop: numFromUnknown(stockEntry.id_shop) || 1,
          id_shop_group: numFromUnknown(stockEntry.id_shop_group) || 1,
          quantity: nextQuantity,
          depends_on_stock: numFromUnknown(stockEntry.depends_on_stock),
          out_of_stock: numFromUnknown(stockEntry.out_of_stock) || 2,
          location: stockEntry.location || "",
        },
      },
    });

    await requestPrestashopXml(`/stock_availables/${stockAvailableId}`, {
      method: "PUT",
      bodyXml: xmlPayload,
    });

    console.log(`✓ Stock mis à jour via stock_availables: produit ${idProduct}, ${currentQuantity} -> ${nextQuantity}`);
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du stock via API:", error);
    return false;
  }
}

/**
 * Convertit un label de raison en ID Prestashop
 */
function reasonToReasonId(reason: string): number {
  const reasonMap: Record<string, number> = {
    "import": 1,
    "sale": 2,
    "adjustment": 3,
    "other": 4,
  };
  return reasonMap[reason] || 3; // Par défaut: adjustment
}

/**
 * Applique une modification de stock complète:
 * 1. Met à jour le stock via l'API
 * 2. Crée un enregistrement du mouvement
 */
export async function applyStockModification(
  idProduct: number,
  currentQuantity: number,
  quantityDelta: number,
  idProductAttribute?: number,
  reason: string = "adjustment",
  idEmployee: number = 1
): Promise<{
  success: boolean;
  message: string;
}> {
  // ✓ Valider que la quantité n'est pas 0
  if (quantityDelta === 0) {
    return {
      success: false,
      message: "La quantité doit être différente de 0",
    };
  }

  // ✓ Valider que la nouvelle quantité ne sera pas négative
  const newQuantity = currentQuantity + quantityDelta;
  if (newQuantity < 0) {
    return {
      success: false,
      message: `Impossible: la nouvelle quantité serait négative (${newQuantity})`,
    };
  }

  try {
    // 1. Mettre à jour le stock
    const stockUpdated = await updateStockViaApi(idProduct, quantityDelta, idProductAttribute);
    if (!stockUpdated) {
      return {
        success: false,
        message: "Erreur lors de la mise à jour du stock",
      };
    }

    // 2. Enregistrer le mouvement de stock
    const movementResult = await recordStockMovement(
      idProduct,
      quantityDelta,
      idProductAttribute,
      reason,
      idEmployee,
    );
    if (!movementResult.success) {
      return {
        success: false,
        message: `Stock modifié mais mouvement non enregistré: ${movementResult.message}`,
      };
    }

    const direction = quantityDelta > 0 ? "augmenté" : "diminué";
    const sign = quantityDelta > 0 ? "+" : "";
    return {
      success: true,
      message: `Stock ${direction} de ${sign}${quantityDelta} (${currentQuantity} → ${newQuantity})`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Erreur application modification:", errorMsg);
    return {
      success: false,
      message: `Erreur: ${errorMsg}`,
    };
  }
}
