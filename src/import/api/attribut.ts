import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import {
  attributeGroupKey,
  attributeValueKey,
  type ImportSessionContext,
} from "./importContext";
import { updateStockWithMovement } from "./stock";

export async function createCombination(
  productId: number,
  attributeValueId: number,
  stockInitial: number,
  priceImpactHt: number,
  isFirstCombination: boolean,
): Promise<number> {
  const payload = {
    prestashop: {
      combination: {
        id_product: productId,
        location: "",
        ean13: "",
        isbn: "",
        upc: "",
        mpn: "",
        quantity: stockInitial,
        reference: "",
        supplier_reference: "",
        wholesale_price: 0,
        price: priceImpactHt, // ← impact HT (positif ou négatif)
        ecotax: 0,
        weight: 0,
        unit_price_impact: 0,
        minimal_quantity: 1,
        low_stock_threshold: 0,
        low_stock_alert: 0,
        default_on: isFirstCombination ? 1 : 0,
        available_date: "",
        associations: {
          product_option_values: {
            product_option_value: { id: attributeValueId },
          },
          images: [],
        },
      },
    },
  };

  const created = await requestPrestashopXml<any>("/combinations", {
    method: "POST",
    bodyXml: buildPrestashopXml(payload),
  });

  const combinationId = Number(created?.prestashop?.combination?.id);
  if (!combinationId) {
    throw new Error(`Échec création combination pour le produit ${productId}`);
  }

  // Mettre à jour le stock via stock_availables + mouvement
  await updateStockWithMovement(productId, stockInitial, combinationId);

  return combinationId;
}

export async function getOrCreateAttributeGroup(name: string, context?: ImportSessionContext): Promise<number> {
  const importContext = context as ImportSessionContext | undefined;
  const key = attributeGroupKey(name);

  if (importContext?.attributeGroupIdByName.has(key)) {
    return importContext.attributeGroupIdByName.get(key) ?? 0;
  }

  if (importContext) {
    const response = await requestPrestashopXml<{
      prestashop: { product_option: { id: unknown } };
    }>("/product_options", {
      method: "POST",
      bodyXml: buildPrestashopXml({
        prestashop: {
          product_option: {
            name: {
              language: {
                "@_id": 1,
                "#text": name,
              },
            },
            public_name: {
              language: {
                "@_id": 1,
                "#text": name,
              },
            },
            group_type: "select",
            is_color_group: 0,
            position: 0,
          },
        },
      }),
    });

    const id = Number(response?.prestashop?.product_option?.id);
    if (!id) throw new Error(`Échec création attribute group "${name}"`);

    importContext.attributeGroupIdByName.set(key, id);
    return id;
  }

  // ── 1. Chercher si le groupe existe déjà ──
  const groupsRes = await requestPrestashopXml<any>("/product_options", {
    query: { display: "[id,name]", limit: "999" },
  });

  const groups = groupsRes?.prestashop?.product_options?.product_option;
  if (groups) {
    const list = Array.isArray(groups) ? groups : [groups];
    const found = list.find(
      (g: any) =>
        (g.name?.language?.["#text"] ?? g.name?.language ?? g.name)
          ?.toString()
          .toLowerCase() === name.toLowerCase()
    );
    if (found) return Number(found.id);
  }

  // ── 2. Créer le groupe ──
  const response = await requestPrestashopXml<{
    prestashop: { product_option: { id: unknown } };
  }>("/product_options", {
    method: "POST",
    bodyXml: buildPrestashopXml({
      prestashop: {
        product_option: {
          name: {
            language: {
              "@_id": 1,
              "#text": name,
            },
          },
          public_name: {
            language: {
              "@_id": 1,
              "#text": name,
            },
          },
          group_type: "select",
          is_color_group: 0,
          position: 0,
        },
      },
    }),
  });

  const id = Number(response?.prestashop?.product_option?.id);
  if (!id) throw new Error(`Échec création attribute group "${name}"`);

  if (context) {
    context.attributeGroupIdByName.set(key, id);
  }

  return id;
}
export async function getOrCreateAttributeValue(
  groupId: number,
  value: string,
  context?: ImportSessionContext,
): Promise<number> {
  const importContext = context as ImportSessionContext | undefined;
  const key = attributeValueKey(groupId, value);

  if (importContext?.attributeValueIdByGroupAndName.has(key)) {
    return importContext.attributeValueIdByGroupAndName.get(key) ?? 0;
  }

  if (importContext) {
    const response = await requestPrestashopXml<{
      prestashop: { product_option_value: { id: unknown } };
    }>("/product_option_values", {
      method: "POST",
      bodyXml: buildPrestashopXml({
        prestashop: {
          product_option_value: {
            id_attribute_group: groupId,
            name: {
              language: {
                "@_id": 1,
                "#text": value,
              },
            },
            color: "",
            position: 0,
          },
        },
      }),
    });

    const id = Number(response?.prestashop?.product_option_value?.id);
    if (!id) throw new Error(`Échec création attribute value "${value}"`);

    importContext.attributeValueIdByGroupAndName.set(key, id);
    return id;
  }

  // ── 1. Chercher si la valeur existe déjà ──
  const res = await requestPrestashopXml<any>("/product_option_values", {
    query: { display: "[id,id_attribute_group,name]", limit: "999" },
  });

  const values = res?.prestashop?.product_option_values?.product_option_value;
  if (values) {
    const list = Array.isArray(values) ? values : [values];
    const found = list.find(
      (v: any) =>
        Number(v.id_attribute_group) === groupId &&
        (v.name?.language?.["#text"] ?? v.name?.language ?? v.name)
          ?.toString()
          .toLowerCase() === value.toLowerCase()
    );
    if (found) return Number(found.id);
  }

  // ── 2. Créer la valeur ──
  const response = await requestPrestashopXml<{
    prestashop: { product_option_value: { id: unknown } };
  }>("/product_option_values", {
    method: "POST",
    bodyXml: buildPrestashopXml({
      prestashop: {
        product_option_value: {
          id_attribute_group: groupId,
          name: {
            language: {
              "@_id": 1,
              "#text": value,
            },
          },
          color: "",
          position: 0,
        },
      },
    }),
  });

  const id = Number(response?.prestashop?.product_option_value?.id);
  if (!id) throw new Error(`Échec création attribute value "${value}"`);

  if (context) {
    context.attributeValueIdByGroupAndName.set(key, id);
  }

  return id;
}

// export async function getCombinationId(productId: number, karazany: string): Promise<number> {
//   // Chercher la valeur d'attribut par nom
//   const res = await requestPrestashopXml<any>("/product_option_values", {
//     query: { display: "[id,name]", limit: "999" },
//   });

//   const values = res?.prestashop?.product_option_values?.product_option_value;
//   if (!values) return 0;

//   const list = Array.isArray(values) ? values : [values];
//   const found = list.find(
//     (v: any) =>
//       (v.name?.language?.["#text"] ?? v.name?.language ?? v.name)
//         ?.toString()
//         .toLowerCase() === karazany.toLowerCase()
//   );
//   if (!found) return 0;

//   const valueId = Number(found.id);

//   // Chercher la combination du produit avec cette valeur
//   const combRes = await requestPrestashopXml<any>("/combinations", {
//     query: {
//       display: "[id,id_product]",
//       "filter[id_product]": `[${productId}]`,
//       limit: "999",
//     },
//   });

//   const combs = combRes?.prestashop?.combinations?.combination;
//   if (!combs) return 0;

//   const combList = Array.isArray(combs) ? combs : [combs];

//   for (const comb of combList) {
//     // Vérifier les associations
//     const detail = await requestPrestashopXml<any>(`/combinations/${comb.id}`, {
//       query: { display: "full" },
//     });

//     const optValues =
//       detail?.prestashop?.combination?.associations?.product_option_values?.product_option_value;
//     if (!optValues) continue;

//     const optList = Array.isArray(optValues) ? optValues : [optValues];
//     if (optList.some((o: any) => Number(o.id) === valueId)) {
//       return Number(comb.id);
//     }
//   }

//   return 0;
// }
export async function getCombinationId(
  productId: number,
  karazany: string
): Promise<number> {
  try {
    // Nettoyage du texte recherché
    const searchValue = (karazany || "").trim().toLowerCase();

    if (!searchValue) return 0;

    // ─────────────────────────────────────────────
    // 1. Récupérer toutes les combinaisons du produit
    // ─────────────────────────────────────────────
    const combRes = await requestPrestashopXml<any>("/combinations", {
      query: {
        display: "[id,id_product]",
        "filter[id_product]": `[${productId}]`,
        limit: "999",
      },
    });

    const combinations =
      combRes?.prestashop?.combinations?.combination;

    if (!combinations) return 0;

    const combList = Array.isArray(combinations)
      ? combinations
      : [combinations];

    // ─────────────────────────────────────────────
    // 2. Vérifier chaque combinaison
    // ─────────────────────────────────────────────
    for (const comb of combList) {
      const combId = Number(comb.id);

      if (!combId) continue;

      // Charger le détail complet de la combinaison
      const detail = await requestPrestashopXml<any>(
        `/combinations/${combId}`,
        {
          query: { display: "full" },
        }
      );

      const optionValues =
        detail?.prestashop?.combination?.associations
          ?.product_option_values?.product_option_value;

      if (!optionValues) continue;

      const optList = Array.isArray(optionValues)
        ? optionValues
        : [optionValues];

      // ─────────────────────────────────────────────
      // 3. Vérifier chaque valeur d'attribut
      // ─────────────────────────────────────────────
      for (const opt of optList) {
        const valueId = Number(opt.id);

        if (!valueId) continue;

        // Charger la vraie valeur attribut
        const valueRes = await requestPrestashopXml<any>(
          `/product_option_values/${valueId}`,
          {
            query: { display: "[id,name]" },
          }
        );

        const value =
          valueRes?.prestashop?.product_option_value;

        if (!value) continue;

        const rawName =
          value.name?.language?.["#text"] ??
          value.name?.language ??
          value.name ??
          "";

        const attrName = rawName
          .toString()
          .trim()
          .toLowerCase();

        // Comparaison
        if (attrName === searchValue) {
          return combId;
        }
      }
    }

    return 0;
  } catch (error) {
    console.error("Erreur getCombinationId :", error);
    return 0;
  }
}