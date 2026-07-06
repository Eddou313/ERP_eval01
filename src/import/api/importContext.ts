import { normalizeText } from "../../utils/helper";

export type ImportProductSnapshot = {
    id: number;
    reference: string;
    name: string;
    priceHt: number;
    taxRate: number;
    categoryId: number;
    taxRuleGroupId: number;
};

export type ImportCombinationSnapshot = {
    id: number;
    productId: number;
    productReference: string;
    attributeName: string;
    attributeValue: string;
    priceImpactHt: number;
    stockInitial: number;
};

export type ImportCustomerSnapshot = {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    secure_key: string;
};

export type ImportSessionContext = {
    productsByReference: Map<string, ImportProductSnapshot>;
    productsById: Map<number, ImportProductSnapshot>;
    attributeGroupIdByName: Map<string, number>;
    attributeValueIdByGroupAndName: Map<string, number>;
    combinationIdByKey: Map<string, number>;
    combinationById: Map<number, ImportCombinationSnapshot>;
    customerByEmail: Map<string, ImportCustomerSnapshot>;
    addressIdByKey: Map<string, number>;
};

export function createImportSessionContext(): ImportSessionContext {
    return {
        productsByReference: new Map(),
        productsById: new Map(),
        attributeGroupIdByName: new Map(),
        attributeValueIdByGroupAndName: new Map(),
        combinationIdByKey: new Map(),
        combinationById: new Map(),
        customerByEmail: new Map(),
        addressIdByKey: new Map(),
    };
}

export function normalizeImportKey(value: string): string {
    return normalizeText(String(value ?? "").trim());
}

export function productReferenceKey(reference: string): string {
    return normalizeImportKey(reference);
}

export function attributeGroupKey(name: string): string {
    return normalizeImportKey(name);
}

export function attributeValueKey(groupId: number, value: string): string {
    return `${Number(groupId) || 0}::${normalizeImportKey(value)}`;
}

export function combinationKey(productId: number, value: string): string {
    return `${Number(productId) || 0}::${normalizeImportKey(value)}`;
}

export function customerEmailKey(email: string): string {
    return normalizeImportKey(email);
}

export function addressKey(customerId: number, address1: string, postcode: string, city: string, countryId: number): string {
    return [Number(customerId) || 0, normalizeImportKey(address1), normalizeImportKey(postcode), normalizeImportKey(city), Number(countryId) || 0].join("::");
}

export function registerImportedProduct(
    context: ImportSessionContext,
    product: ImportProductSnapshot,
): void {
    const key = productReferenceKey(product.reference);
    context.productsByReference.set(key, product);
    context.productsById.set(product.id, product);
}

export function findImportedProductByReference(
    context: ImportSessionContext,
    reference: string,
): ImportProductSnapshot | null {
    const key = productReferenceKey(reference);
    return context.productsByReference.get(key) ?? null;
}

export function registerImportedCombination(
    context: ImportSessionContext,
    combination: ImportCombinationSnapshot,
): void {
    const key = combinationKey(combination.productId, combination.attributeValue);
    context.combinationIdByKey.set(key, combination.id);
    context.combinationById.set(combination.id, combination);
}

export function findCombinationIdInContext(
    context: ImportSessionContext,
    productId: number,
    attributeValue: string,
): number {
    return context.combinationIdByKey.get(combinationKey(productId, attributeValue)) ?? 0;
}
