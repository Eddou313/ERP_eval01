import { numFromUnknown } from "../../../../utils/helper";

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
// 

// create et import
export function extractNumericId(value: unknown, fallbackKeys: string[] = []): number {
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
export type PrestashopListResponse = {
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