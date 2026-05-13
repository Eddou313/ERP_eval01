import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import { asArray, boolFromUnknown, getFirstLanguageText, numFromUnknown, textFromUnknown } from "../../../../utils/helper";

export type AttributeGroupListItem = {
  id: number;
  name: string;
  publicName: string;
  groupType: string;
  isColorGroup: boolean;
  position: number;
  valuesCount: number;
};

export type AttributeValueListItem = {
  id: number;
  attributeGroupId: number;
  name: string;
  color: string;
  position: number;
};

export type FeatureListItem = {
  id: number;
  name: string;
  position: number;
  valuesCount: number;
};

export type FeatureValueListItem = {
  id: number;
  featureId: number;
  value: string;
  custom: boolean;
  position: number;
};

export type ProductAttributeGroupSelection = {
  group: AttributeGroupListItem;
  values: AttributeValueListItem[];
  selectedValueId: number;
  // combinaison
  combinations?: {
    id: number;
    quantity?: number;
    price?: number;
    attributes: {
      groupId: number;
      valueId: number;
    }[];
  }[];
};

export type ProductFeatureGroupSelection = {
  feature: FeatureListItem;
  values: FeatureValueListItem[];
  selectedValueId: number;
};

function extractNumericId(value: unknown, fallbackKeys: string[] = []): number {
  const candidates: unknown[] = [value];

  if (value && typeof value === "object") {
    for (const key of fallbackKeys) {
      candidates.push((value as any)[key]);
    }
  }

  for (const candidate of candidates) {
    const id = numFromUnknown(candidate);
    if (id > 0) return id;
  }

  return 0;
}

export type AttributesAndCharacteristicsState = {
  attributes: AttributeGroupListItem[];
  attributeValues: AttributeValueListItem[];
  features: FeatureListItem[];
  featureValues: FeatureValueListItem[];
};
// create et import

export type AttributeGroupCreateForm = {
  name: string;
  publicName: string;
  groupType: string;
  isColorGroup: boolean;
  position?: number;
};

export type AttributeValueCreateForm = {
  attributeGroupId: number;
  name: string;
  color?: string;
  position?: number;
};

export type FeatureCreateForm = {
  name: string;
  position?: number;
};

export type FeatureValueCreateForm = {
  featureId: number;
  value: string;
  custom?: boolean;
  position?: number;
};

export type AttributesCharacteristicsImportRow = {
  kind: "attribute" | "feature";
  name: string;
  publicName?: string;
  groupType?: string;
  isColorGroup?: boolean;
  attributeGroupName?: string;
  featureName?: string;
  value: string;
  color?: string;
  position?: number;
  custom?: boolean;
};
// 
type PrestashopListResponse = {
  prestashop?: {
    product_options?: { product_option?: unknown | unknown[] };
    product_option?: {
      id?: unknown;
      name?: unknown;
      public_name?: unknown;
      group_type?: unknown;
      is_color_group?: unknown;
      position?: unknown;
    };
    product_option_values?: { product_option_value?: unknown | unknown[] };
    product_option_value?: {
      id?: unknown;
      id_attribute_group?: unknown;
      name?: unknown;
      color?: unknown;
      position?: unknown;
    };
    product_features?: { product_feature?: unknown | unknown[] };
    product_feature?: {
      id?: unknown;
      name?: unknown;
      position?: unknown;
    };
    product_feature_values?: { product_feature_value?: unknown | unknown[] };
    product_feature_value?: {
      id?: unknown;
      id_feature?: unknown;
      value?: unknown;
      custom?: unknown;
      position?: unknown;
    };
  };
};

async function listAttributeGroupIds(): Promise<number[]> {
  const response = await requestPrestashopXml<PrestashopListResponse>("/product_options", {
    query: { display: "[id]" },
  });

  const items = response?.prestashop?.product_options?.product_option;
  if (!items) return [];

  return asArray(items)
    .map((item: any) => numFromUnknown(item?.id ?? item?.["@_id"]))
    .filter((id) => Number.isFinite(id) && id > 0);
}

async function getAttributeGroup(id: number): Promise<Omit<AttributeGroupListItem, "valuesCount">> {
  const response = await requestPrestashopXml<PrestashopListResponse>(`/product_options/${id}`, {
    query: { display: "full" },
  });

  const item = response?.prestashop?.product_option;
  if (!item) {
    return {
      id,
      name: `Attribut #${id}`,
      publicName: `Attribut #${id}`,
      groupType: "select",
      isColorGroup: false,
      position: 0,
    };
  }

  return {
    id: numFromUnknown(item.id),
    name: getFirstLanguageText(item.name as any) || textFromUnknown(item.name),
    publicName: getFirstLanguageText(item.public_name as any) || textFromUnknown(item.public_name),
    groupType: textFromUnknown(item.group_type),
    isColorGroup: boolFromUnknown(item.is_color_group),
    position: numFromUnknown(item.position),
  };
}

async function listAttributeValueIds(): Promise<number[]> {
  const response = await requestPrestashopXml<PrestashopListResponse>("/product_option_values", {
    query: { display: "[id]" },
  });

  const items = response?.prestashop?.product_option_values?.product_option_value;
  if (!items) return [];

  return asArray(items)
    .map((item: any) => numFromUnknown(item?.id ?? item?.["@_id"]))
    .filter((id) => Number.isFinite(id) && id > 0);
}

async function getAttributeValue(id: number): Promise<AttributeValueListItem> {
  const response = await requestPrestashopXml<PrestashopListResponse>(`/product_option_values/${id}`, {
    query: { display: "full" },
  });

  const item = response?.prestashop?.product_option_value;
  return {
    id,
    attributeGroupId: numFromUnknown(item?.id_attribute_group),
    name: getFirstLanguageText(item?.name as any) || textFromUnknown(item?.name),
    color: textFromUnknown(item?.color),
    position: numFromUnknown(item?.position),
  };
}

async function listFeatureIds(): Promise<number[]> {
  const response = await requestPrestashopXml<PrestashopListResponse>("/product_features", {
    query: { display: "[id]" },
  });

  const items = response?.prestashop?.product_features?.product_feature;
  if (!items) return [];

  return asArray(items)
    .map((item: any) => numFromUnknown(item?.id ?? item?.["@_id"]))
    .filter((id) => Number.isFinite(id) && id > 0);
}

async function getFeature(id: number): Promise<FeatureListItem> {
  const response = await requestPrestashopXml<PrestashopListResponse>(`/product_features/${id}`, {
    query: { display: "full" },
  });

  const item = response?.prestashop?.product_feature;
  return {
    id,
    name: getFirstLanguageText(item?.name as any) || textFromUnknown(item?.name) || `Caractéristique #${id}`,
    position: numFromUnknown(item?.position),
    valuesCount: 0,
  };
}

async function listFeatureValueIds(): Promise<number[]> {
  const response = await requestPrestashopXml<PrestashopListResponse>("/product_feature_values", {
    query: { display: "[id]" },
  });

  const items = response?.prestashop?.product_feature_values?.product_feature_value;
  if (!items) return [];

  return asArray(items)
    .map((item: any) => numFromUnknown(item?.id ?? item?.["@_id"]))
    .filter((id) => Number.isFinite(id) && id > 0);
}

async function getFeatureValue(id: number): Promise<FeatureValueListItem> {
  const response = await requestPrestashopXml<PrestashopListResponse>(`/product_feature_values/${id}`, {
    query: { display: "full" },
  });

  const item = response?.prestashop?.product_feature_value;
  return {
    id,
    featureId: numFromUnknown(item?.id_feature),
    value: textFromUnknown(item?.value),
    custom: boolFromUnknown(item?.custom),
    position: numFromUnknown(item?.position),
  };
}

export async function listAttributeGroupsLight(): Promise<AttributeGroupListItem[]> {
  const ids = await listAttributeGroupIds();
  const values = await listAttributeValuesLight();
  const valueCountByGroup = new Map<number, number>();

  for (const value of values) {
    valueCountByGroup.set(value.attributeGroupId, (valueCountByGroup.get(value.attributeGroupId) ?? 0) + 1);
  }

  const groups = await Promise.all(ids.map(async (id) => {
    const group = await getAttributeGroup(id);
    return {
      ...group,
      valuesCount: valueCountByGroup.get(group.id) ?? 0,
    } satisfies AttributeGroupListItem;
  }));

  return groups.sort((left, right) => left.position - right.position || left.name.localeCompare(right.name));
}

export async function listAttributeValuesLight(): Promise<AttributeValueListItem[]> {
  const ids = await listAttributeValueIds();
  const values = await Promise.all(ids.map((id) => getAttributeValue(id)));
  return values.sort((left, right) => left.position - right.position || left.name.localeCompare(right.name));
}

export async function listFeatureGroupsLight(): Promise<FeatureListItem[]> {
  const ids = await listFeatureIds();
  const values = await listFeatureValuesLight();
  const valueCountByFeature = new Map<number, number>();

  for (const value of values) {
    valueCountByFeature.set(value.featureId, (valueCountByFeature.get(value.featureId) ?? 0) + 1);
  }

  const features = await Promise.all(ids.map(async (id) => {
    const feature = await getFeature(id);
    return {
      ...feature,
      valuesCount: valueCountByFeature.get(feature.id) ?? 0,
    } satisfies FeatureListItem;
  }));

  return features.sort((left, right) => left.position - right.position || left.name.localeCompare(right.name));
}

export async function listFeatureValuesLight(): Promise<FeatureValueListItem[]> {
  const ids = await listFeatureValueIds();
  const values = await Promise.all(ids.map((id) => getFeatureValue(id)));
  return values.sort((left, right) => left.position - right.position || left.value.localeCompare(right.value));
}

export async function initializeAttributesAndCharacteristics(): Promise<AttributesAndCharacteristicsState> {
  const [attributes, attributeValues, features, featureValues] = await Promise.all([
    listAttributeGroupsLight(),
    listAttributeValuesLight(),
    listFeatureGroupsLight(),
    listFeatureValuesLight(),
  ]);

  return { attributes, attributeValues, features, featureValues };
}

async function getProductCombinationAttributeValueIds(productId: number): Promise<number[]> {
  try {
    const response = await requestPrestashopXml<any>("/combinations", {
      query: {
        display: "full",
        "filter[id_product]": `[${productId}]`,
      },
    });

    const combinationsRaw = response?.prestashop?.combinations?.combination;
    if (!combinationsRaw) {
      return [];
    }

    const valueIds = new Set<number>();
    for (const combination of asArray(combinationsRaw)) {
      const associationValues = combination?.associations?.product_option_values?.product_option_value;
      if (!associationValues) continue;

      for (const optionValue of asArray(associationValues)) {
        const valueId = extractNumericId(optionValue, ["id", "id_attribute", "id_product_attribute"]);
        if (valueId > 0) {
          valueIds.add(valueId);
        }
      }
    }

    return Array.from(valueIds);
  } catch (error) {
    console.error("Erreur getProductCombinationAttributeValueIds:", error);
    return [];
  }
}

/**
 * Récupère les attributs (groupes + valeurs) d'un produit spécifique
 */
export async function getProductAttributeGroups(productId: number): Promise<ProductAttributeGroupSelection[]> {
  try {
    const valueIds = await getProductCombinationAttributeValueIds(productId);
    if (valueIds.length === 0) return [];

    const values = await Promise.all(valueIds.map((id) => getAttributeValue(id)));
    const valuesByGroup = new Map<number, AttributeValueListItem[]>();

    for (const value of values) {
      const groupValues = valuesByGroup.get(value.attributeGroupId) ?? [];
      groupValues.push(value);
      valuesByGroup.set(value.attributeGroupId, groupValues);
    }

    const groupIds = Array.from(valuesByGroup.keys());
    const groups = await Promise.all(groupIds.map((id) => getAttributeGroup(id)));

    // valueId -> groupId, utile pour normaliser les combinaisons
    const valueIdToGroupId = new Map<number, number>();
    for (const value of values) {
      valueIdToGroupId.set(value.id, value.attributeGroupId);
    }

    // Charger les combinaisons exactes du produit
    let normalizedCombinations: NonNullable<ProductAttributeGroupSelection["combinations"]> = [];
    try {
      const combinationsResponse = await requestPrestashopXml<any>("/combinations", {
        query: {
          display: "full",
          "filter[id_product]": `[${productId}]`,
        },
      });

      const combinationsRaw = combinationsResponse?.prestashop?.combinations?.combination;
      if (combinationsRaw) {
        normalizedCombinations = asArray(combinationsRaw)
          .map((combination: any) => {
            const combinationId = numFromUnknown(combination?.id);
            if (combinationId <= 0) return null;

            const associationValues = combination?.associations?.product_option_values?.product_option_value;
            const attributes = asArray(associationValues || [])
              .map((optionValue: any) => {
                const valueId = extractNumericId(optionValue, ["id", "id_attribute", "id_product_attribute"]);
                const groupId = valueIdToGroupId.get(valueId) ?? 0;
                if (valueId <= 0 || groupId <= 0) return null;
                return {
                  groupId,
                  valueId,
                };
              })
              .filter(Boolean) as { groupId: number; valueId: number }[];

            return {
              id: combinationId,
              quantity: numFromUnknown(combination?.quantity),
              price: numFromUnknown(combination?.price),
              attributes,
            };
          })
          .filter(Boolean) as NonNullable<ProductAttributeGroupSelection["combinations"]>;
      }
    } catch (error) {
      console.warn("Impossible de charger les combinaisons du produit:", error);
    }

    return groups
      .map((group) => {
        const groupValues = (valuesByGroup.get(group.id) ?? []).sort((left, right) => left.position - right.position || left.name.localeCompare(right.name));
        return {
          group: {
            ...group,
            valuesCount: groupValues.length,
          },
          values: groupValues,
          selectedValueId: groupValues[0]?.id ?? 0,
          combinations: normalizedCombinations,
        } satisfies ProductAttributeGroupSelection;
      })
      .sort((left, right) => left.group.position - right.group.position || left.group.name.localeCompare(right.group.name));
  } catch (error) {
    console.error("Erreur getProductAttributeGroups:", error);
    return [];
  }
}

/**
 * Récupère les caractéristiques (features) d'un produit spécifique
 */
export async function getProductFeatures(productId: number): Promise<ProductFeatureGroupSelection[]> {
  try {
    const response = await requestPrestashopXml<any>(`/products/${productId}`, {
      query: { display: "full" },
    });

    const product = response?.prestashop?.product;
    if (!product || !product.associations?.product_features?.product_feature) {
      return [];
    }

    const featureAssociations = asArray(product.associations.product_features.product_feature);
    const valuesByFeature = new Map<number, FeatureValueListItem[]>();

    for (const featureAssoc of featureAssociations) {
      const featureId = extractNumericId(featureAssoc, ["id", "id_feature"]);
      const featureValueId = numFromUnknown(featureAssoc?.id_feature_value);

      if (featureId > 0 && featureValueId > 0) {
        try {
          const value = await getFeatureValue(featureValueId);
          const values = valuesByFeature.get(featureId) ?? [];
          values.push(value);
          valuesByFeature.set(featureId, values);
        } catch (err) {
          console.warn(`Erreur lors du chargement de la feature ${featureId}:`, err);
        }
      }
    }

    const features = await Promise.all(Array.from(valuesByFeature.keys()).map((id) => getFeature(id)));

    return features
      .map((feature) => {
        const values = (valuesByFeature.get(feature.id) ?? []).sort((left, right) => left.position - right.position || left.value.localeCompare(right.value));
        return {
          feature: {
            ...feature,
            valuesCount: values.length,
          },
          values,
          selectedValueId: values[0]?.id ?? 0,
        } satisfies ProductFeatureGroupSelection;
      })
      .sort((left, right) => left.feature.position - right.feature.position || left.feature.name.localeCompare(right.feature.name));
  } catch (error) {
    console.error("Erreur getProductFeatures:", error);
    return [];
  }
}
