import { listProductsLight } from "../../module/Backoffice/produit/api/productsApi";
import { normalizeText, slugify } from "../../utils/helper";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { xmlToJson } from "../../utils/xml";

export async function createProductSimple(data: {
    id_category_default: number;
    id_tax_rules_group: number;
    name: string;
    reference: string;
    price: number;
    wholesale_price: number;
    available_date?: string;
    description?: string;
    description_short?: string;
    link_rewrite?: string;
}): Promise<{ id: number }> {
    const response = await requestPrestashopXml<any>("/products", {
        method: "POST",
        bodyXml: buildPrestashopXml({
            prestashop: {
                product: {
                    id_category_default: data.id_category_default,
                    id_tax_rules_group: data.id_tax_rules_group,
                    type: "standard",
                    reference: data.reference,
                    price: data.price,
                    wholesale_price: data.wholesale_price,
                    active: 1,
                    visibility: "both",
                    state: 1,
                    available_for_order: 1,
                    show_price: 1,
                    available_date: data.available_date || "",
                    name: {
                        language: {
                            "@_id": 1,
                            "#text": data.name,
                        },
                    },
                    description: {
                        language: {
                            "@_id": 1,
                            "#text": data.description || "",
                        },
                    },
                    description_short: {
                        language: {
                            "@_id": 1,
                            "#text": data.description_short || "",
                        },
                    },
                    link_rewrite: {
                        language: {
                            "@_id": 1,
                            "#text": data.link_rewrite || slugify(data.name),
                        },
                    },
                    meta_title: {
                        language: {
                            "@_id": 1,
                            "#text": data.name,
                        },
                    },
                    associations: {
                        categories: {
                            category: [{ id: data.id_category_default }],
                        },
                    },
                },
            },
        }),
    });

    const productId = Number(response?.prestashop?.product?.id);
    if (!Number.isFinite(productId) || productId <= 0) {
        throw new Error("Impossible de créer le produit");
    }

    return { id: productId };
}

export async function uploadProductImage(productId: number, file: Blob, fileName: string): Promise<number> {
    const formData = new FormData();
    formData.append("image", file, fileName);

    const response = await fetch(`/api/images/products/${productId}`, {
        method: "POST",
        body: formData,
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Erreur upload image produit (${response.status})`);
    }

    const parsed = xmlToJson<any>(text);
    const imageId = Number(
        parsed?.prestashop?.image?.id ??
        parsed?.prestashop?.image?.id_image ??
        parsed?.image?.id ??
        parsed?.image?.id_image,
    );

    if (Number.isFinite(imageId) && imageId > 0) {
        return imageId;
    }

    throw new Error("Impossible de récupérer l'ID de l'image uploadée");
}

export async function getProductIdByReference(reference: string): Promise<number | null> {
    try {
        const res = await requestPrestashopXml<any>("/products", {
            query: { display: "[id,reference]", limit: "999" },
        });

        const products = res?.prestashop?.products?.product;
        if (!products) return null;

        const list = Array.isArray(products) ? products : [products];
        const found = list.find((p: any) => p.reference === reference);

        return found ? Number(found.id) : null;
    } catch {
        return null;
    }
}
type ProductLight = Awaited<ReturnType<typeof listProductsLight>>[number];
function normalizeProductReference(value: string): string {
    return normalizeText(String(value ?? "").trim());
}
export async function findProductByReference(reference: string, cache: Map<string, ProductLight | null>): Promise<ProductLight | null> {
    const normalizedReference = normalizeProductReference(reference);
    if (!normalizedReference) {
        return null;
    }

    if (cache.has(normalizedReference)) {
        return cache.get(normalizedReference) ?? null;
    }

    const products = await listProductsLight();
    const compactTarget = compactReference(reference);
    const match =
        products.find((product) => {
            const productReference = normalizeProductReference(product.reference ?? "");
            if (productReference === normalizedReference) return true;
            return compactReference(productReference) === compactTarget;
        }) ?? null;

    cache.set(normalizedReference, match);
    return match;
}

function compactReference(value: string): string {
    return normalizeProductReference(value).replace(/[^a-z0-9]/g, "");
}
