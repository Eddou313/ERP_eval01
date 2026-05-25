import { asArray, numFromUnknown, textFromUnknown } from "../../../../utils/helper";
import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import { extractStockMovementItems, fetchStockMovementsResponse, type StockMovement } from "./object";

/**
 * Résout les IDs produit/attribut depuis un mouvement de stock avec gestion d'erreur silencieuse.
 * Contrairement à la version originale, capture les erreurs 404 et continue sans les logguer.
 */
async function resolveMovementProductIdsSafe(item: any): Promise<{
  id_product: number;
  id_product_attribute: number;
}> {
  const directProductId = numFromUnknown(item?.id_product);
  const directAttributeId = numFromUnknown(item?.id_product_attribute);

  if (directProductId > 0) {
    return {
      id_product: directProductId,
      id_product_attribute: directAttributeId,
    };
  }

  const id_stock = numFromUnknown(item?.id_stock ?? item?.id_stock_available);
  if (id_stock <= 0) {
    return { id_product: 0, id_product_attribute: 0 };
  }

  try {
    const stockAvailableResponse = await requestPrestashopXml<any>(
      `/stock_availables/${id_stock}`,
      { query: { display: "full" }}
    );
    const stockAvailable = stockAvailableResponse?.prestashop?.stock_available;
    const productIdFromStockAvailable = numFromUnknown(stockAvailable?.id_product);
    const attributeIdFromStockAvailable = numFromUnknown(stockAvailable?.id_product_attribute);
    if (productIdFromStockAvailable > 0) {
      return {
        id_product: productIdFromStockAvailable,
        id_product_attribute: attributeIdFromStockAvailable,
      };
    }
  } catch {
    // Silencieusement ignoré (capture 404 et autres erreurs sans interrompre)
  }

  return { id_product: 0, id_product_attribute: 0 };
}

async function resolveCombinationLabelSafe(productAttributeId: number): Promise<string> {
  if (!productAttributeId || productAttributeId <= 0) {
    return "";
  }

  try {
    const combinationResponse = await requestPrestashopXml<any>(
      `/combinations/${productAttributeId}`,
      { query: { display: "full" } }
    );

    const combination = combinationResponse?.prestashop?.combination;
    const comboReference = textFromUnknown(combination?.reference);
    const optionValuesRaw = combination?.associations?.product_option_values?.product_option_value;
    const optionValues = asArray(optionValuesRaw);

    if (!optionValues.length) {
      return comboReference || "";
    }

    const names = await Promise.all(
      optionValues.map(async (optionValue: any) => {
        const optionValueId = numFromUnknown(optionValue?.id ?? optionValue?.["@_id"]);
        if (!optionValueId) return "";

        try {
          const optionValueResponse = await requestPrestashopXml<any>(
            `/product_option_values/${optionValueId}`,
            { query: { display: "full" } }
          );
          return textFromUnknown(optionValueResponse?.prestashop?.product_option_value?.name);
        } catch {
          return "";
        }
      })
    );

    const label = names.filter(Boolean).join(" / ");
    if (label && comboReference) {
      return `${label} (${comboReference})`;
    }
    return label || comboReference || "";
  } catch {
    return "";
  }
}

/**
 * Version safe de listStockMovements qui continue même si certains mouvements ont des IDs invalides.
 * Filtre silencieusement les mouvements qui ne peuvent pas être résolus (id_product === 0).
 */
export async function listStockMovementsSafe(): Promise<StockMovement[]> {
  try {
    const response = await fetchStockMovementsResponse();
    const items = extractStockMovementItems(response);
    if (items.length === 0) {
      return [];
    }

    // Traiter les mouvements avec gestion d'erreur silencieuse
    const movements: (StockMovement | null)[] = await Promise.all(
      items.map(async (item: any) => {
        try {
          const id = numFromUnknown(item?.id);
          const resolvedIds = await resolveMovementProductIdsSafe(item);
          const id_product = resolvedIds.id_product;
          const id_product_attribute = resolvedIds.id_product_attribute;
          const quantity = numFromUnknown(item?.physical_quantity);
          const dateAdd = textFromUnknown(item?.date_add);
          const employeeLastname = textFromUnknown(item?.employee_lastname);
          const employeeFirstname = textFromUnknown(item?.employee_firstname);
          const sign = numFromUnknown(item?.sign);

          let productName = "Produit";
          let reference = "";
          let combinationLabel = "";
          let id_default_image = 0;

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
                id_default_image = numFromUnknown(prod.id_default_image);
              }
            } catch (e) {
              // Erreur silencieuse
            }
          } else {
            // Retourner null pour filtrer ce mouvement
            return null;
          }

          if (id_product_attribute > 0) {
            combinationLabel = await resolveCombinationLabelSafe(id_product_attribute);
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

          const movement: StockMovement = {
            id,
            id_product,
            id_product_attribute: id_product_attribute || undefined,
            id_default_image: id_default_image || undefined,
            productName,
            combinationLabel: combinationLabel || undefined,
            reference,
            quantity,
            movementType,
            date: dateAdd,
            employeeName,
            sign: sign || undefined,
          };

          return movement;
        } catch (e) {
          // Silencieusement ignorer le mouvement en erreur
          return null;
        }
      })
    );

    // Filtrer les mouvements null (qui ont échoué)
    return movements.filter((m): m is StockMovement => m !== null);
  } catch (error) {
    console.error("Error fetching stock movements (safe):", error);
    return [];
  }
}
