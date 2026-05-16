/**
 * Service métier pour la gestion des mouvements de stock
 * Gère les règles de création et modification de stock
 */

import { buildPrestashopXml, requestPrestashopXml } from "../../../../utils/prestashopClient";
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

    // ✓ Construire l'objet mouvement de stock
    const xmlPayload = buildPrestashopXml({
      prestashop: {
        stock_movement: {
          id_product: idProduct,
          id_product_attribute: idProductAttribute && idProductAttribute > 0 ? idProductAttribute : 0,
          id_stock_mvt_reason: reasonToReasonId(reason),
          id_employee: idEmployee,
          physical_quantity: absoluteQuantity,
          sign,
          date_add: dateAdd,
        },
      },
    });

    // ✓ Envoyer à l'API Prestashop
    const response = await requestPrestashopXml<any>(
      "/stock_movements",
      {
        method: "POST",
        bodyXml: xmlPayload,
      }
    );

    const createdMovement = response?.prestashop?.stock_movement;
    const movementId = numFromUnknown(createdMovement?.id);
    
    if (movementId && movementId > 0) {
      console.log(`✓ Mouvement de stock créé: ID ${movementId}, produit ${idProduct}, Δ${sign > 0 ? "+" : ""}${absoluteQuantity}`);
      return {
        success: true,
        movementId,
        message: `Mouvement enregistré (ID ${movementId})`,
      };
    }

    return {
      success: false,
      message: "Réponse API invalide: pas d'ID de mouvement créé",
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
 * @param newQuantity Nouvelle quantité absolue
 * @param idProductAttribute ID de la variante (optionnel)
 * @returns true si succès, false sinon
 */
export async function updateStockViaApi(
  idProduct: number,
  newQuantity: number,
  idProductAttribute?: number
): Promise<boolean> {
  try {
    const token = import.meta.env.VITE_STOCKAPI_TOKEN;
    if (!token) {
      console.error("Token stockapi manquant dans .env (VITE_STOCKAPI_TOKEN)");
      return false;
    }


    // Production: appel direct au PrestaShop
    const baseUrl = import.meta.env.VITE_BASE_URL_FULL || window.location.origin;
    let url = `${baseUrl}/module/stockapi/update?token=${encodeURIComponent(token)}&id_product=${idProduct}&quantity=${newQuantity}`;
    if (idProductAttribute && idProductAttribute > 0) {
      url += `&id_product_attribute=${idProductAttribute}`;
    }
    console.log(`Appel API stockapi: ${url}`);

    const response = await fetch(url, { method: 'GET' });
    if (response.ok) {
      console.log(`✓ Stock mis à jour: produit ${idProduct} → ${newQuantity} unités`);
      return true;
    }
    console.error(`Erreur API stockapi: ${response.status}`);
    return false;
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
    const stockUpdated = await updateStockViaApi(idProduct, newQuantity, idProductAttribute);
    if (!stockUpdated) {
      return {
        success: false,
        message: "Erreur lors de la mise à jour du stock",
      };
    }

    // 2. Enregistrer le mouvement
    const movementResult = await recordStockMovement(
      idProduct,
      quantityDelta,
      idProductAttribute,
      reason,
      idEmployee
    );

    if (!movementResult.success) {
      console.warn(`Stock mis à jour mais mouvement non enregistré: ${movementResult.message}`);
      // On ne retourne pas d'erreur car le stock a été modifié
    }

    const direction = quantityDelta > 0 ? "augmenté" : "diminué";
    const sign = quantityDelta > 0 ? "+" : "";
    return {
      success: true,
      message: `Stock ${direction} de ${sign}${quantityDelta} (${currentQuantity} → ${newQuantity})${movementResult.success ? ` - ${movementResult.message}` : ""}`,
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
