import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { updateStockWithMovement } from "./stock";

export async function createCombination(
  productId: number,
  attributeValueId: number,
  stockInitial: number,
  priceImpactHt: number,
  isFirstCombination:boolean,
): Promise<void> {
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

  // Mettre à jour le stock via stock_availables + mouvement
  await updateStockWithMovement(productId, stockInitial, combinationId);
}

export async function getOrCreateAttributeGroup(name: string): Promise<number> {
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

  return id;
}
export async function getOrCreateAttributeValue(
  groupId: number,
  value: string
): Promise<number> {
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
 
  return id;
}