import { asArray, numFromUnknown, textFromUnknown } from "../../../../utils/helper";
import { buildPrestashopXml, requestPrestashopXml } from "../../../../utils/prestashopClient";
import { extractStockAvailableEntries, extractStockMovementItems, fetchStockMovementsResponse, type PrestashopStockAvailableListResponse, type PrestashopStockAvailableResponse, type StockItem, type StockMovement, type StockCreateForm, type PrestashopStockMovementListResponse } from "./object";

async function resolveCombinationLabel(productAttributeId: number): Promise<string> {
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

async function resolveMovementProductIds(item: any): Promise<{
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
      { query: { display: "full" } }
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
  } catch (err) {
    // Ignorer et fallback final
  }

  return { id_product: 0, id_product_attribute: 0 };
}

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
        let id_default_image = 0;
        let combinationLabel = "";

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
          productName = "Produit introuvable";
        }

        if (id_product_attribute > 0) {
          combinationLabel = await resolveCombinationLabel(id_product_attribute);
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
          combinationLabel,
          reference,
          supplier,
          physicalQuantity,
          reservedQuantity,
          availableQuantity,
          status,
          id_default_image,

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

// Version paginée pour éviter de récupérer trop d'éléments d'un coup.
export async function listStockItemsPaged(page = 1, limit = 10): Promise<StockItem[]> {
  try {
    const offset = Math.max(0, (page - 1) * limit);
    const response = await requestPrestashopXml<PrestashopStockAvailableListResponse>(
      "/stock_availables",
      { query: { display: "full", limit: `${offset},${limit}` } }
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
        let id_default_image = 0;
        let combinationLabel = "";

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
          productName = "Produit introuvable";
        }

        if (id_product_attribute > 0) {
          combinationLabel = await resolveCombinationLabel(id_product_attribute);
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
          combinationLabel,
          reference,
          supplier,
          physicalQuantity,
          reservedQuantity,
          availableQuantity,
          status,
          id_default_image,

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
    console.error("Error fetching paged stock items:", error);
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
        const resolvedIds = await resolveMovementProductIds(item);
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
          productName = "Produit introuvable";
        }

        if (id_product_attribute > 0) {
          combinationLabel = await resolveCombinationLabel(id_product_attribute);
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
          id_product_attribute,
          id_default_image,
          productName,
          combinationLabel,
          reference,
          movementType,
          quantity: Math.abs(quantity),
          sign,
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

/**
 * Renvoie les mouvements de stock en pages pour limiter la quantité retournée.
 * Essaie d'appeler l'endpoint avec le paramètre `limit=offset,limit` si possible,
 * sinon retombe sur la récupération complète et retourne une tranche.
 */
export async function listStockMovementsPaged(page = 1, limit = 10): Promise<StockMovement[]> {
  try {
    const offset = Math.max(0, (page - 1) * limit);

    // Essayer endpoints connus avec query limit
    const candidates: Array<{
      path: string;
      query?: Record<string, string>;
    }> = [
      { path: "/stock_movements", query: { display: "full", limit: `${offset},${limit}` } },
      { path: "/stock_mvts", query: { display: "full", limit: `${offset},${limit}` } },
      { path: "/stock_movements", query: { limit: `${offset},${limit}` } },
      { path: "/stock_mvts", query: { limit: `${offset},${limit}` } },
    ];

    for (const candidate of candidates) {
      try {
        const response = await requestPrestashopXml<PrestashopStockMovementListResponse>(
          candidate.path,
          { query: candidate.query }
        );

        const items = extractStockMovementItems(response);
        if (!items || items.length === 0) {
          return [];
        }

        // Process items similarly à listStockMovements
        const movements = await Promise.all(
          items.map(async (item: any) => {
            const id = numFromUnknown(item?.id);
            const resolvedIds = await resolveMovementProductIds(item);
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
              productName = "Produit introuvable";
            }

            if (id_product_attribute > 0) {
              combinationLabel = await resolveCombinationLabel(id_product_attribute);
            }

            let movementType: "import" | "sale" | "adjustment" | "other" = "other";
            if (sign > 0) movementType = "import";
            else if (sign < 0) movementType = "sale";

            const employeeName =
              employeeFirstname || employeeLastname
                ? `${employeeFirstname} ${employeeLastname}`
                : "Système";

            return {
              id,
              id_product,
              id_product_attribute,
              id_default_image,
              productName,
              combinationLabel,
              reference,
              movementType,
              quantity: Math.abs(quantity),
              sign,
              date: dateAdd,
              employeeName,
            };
          })
        );

        return movements;
      } catch (e) {
        // essayer le prochain candidat
        continue;
      }
    }

    // Si aucun endpoint paginé n'a fonctionné, récupérer tout et slice
    const all = await listStockMovements();
    const start = offset;
    return all.slice(start, start + limit);
  } catch (error) {
    console.error("Error fetching paged stock movements:", error);
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
      "filter[id_shop]": `[1]`,
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

async function getStockAvailableEntryId(productId: number, productAttributeId = 0): Promise<number | null> {
  try {
    const response = await requestPrestashopXml<PrestashopStockAvailableResponse>(
      "/stock_availables",
      {
        query: {
          display: "full",
          "filter[id_product]": `[${productId}]`,
          "filter[id_product_attribute]": `[${productAttributeId}]`,
        },
      }
    );

    const entries = extractStockAvailableEntries(response);
    const first = entries[0];
    const id = numFromUnknown(first?.id);
    return id > 0 ? id : null;
  } catch {
    return null;
  }
}

export async function upsertStockAvailable(form: StockCreateForm): Promise<number> {
  const productAttributeId = form.id_product_attribute ?? 0;
  const existingId = await getStockAvailableEntryId(form.id_product, productAttributeId);
  const payload = buildPrestashopXml({
    prestashop: {
      stock_available: {
        id: existingId || undefined,
        id_product: form.id_product,
        id_product_attribute: productAttributeId,
        id_shop: form.id_shop ?? 1,
        id_shop_group: form.id_shop_group ?? 1,
        quantity: form.quantity,
        depends_on_stock: form.depends_on_stock ? 1 : 0,
        out_of_stock: form.out_of_stock ?? 2,
        location: form.location ?? "",
      },
    },
  });

  const path = existingId ? `/stock_availables/${existingId}` : "/stock_availables";
  const method = existingId ? "PUT" : "POST";

  const response = await requestPrestashopXml<any>(path, {
    method,
    bodyXml: payload,
  });

  const responseId = numFromUnknown(response?.prestashop?.stock_available?.id ?? response?.prestashop?.stock_available?.["@_id"]);
  if (responseId > 0) {
    return responseId;
  }

  return existingId ?? (await getStockAvailableEntryId(form.id_product, productAttributeId)) ?? 0;
}
