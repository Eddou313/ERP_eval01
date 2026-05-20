export async function importProduitAttributStockCsv(
    rows: ProductAttributeStockImportRow[]
): Promise<{ imported: number; failed: number }> {

    const productsCache = new Map<string, ProductLight | null>();
    const attributeGroups = await listAttributeGroupsLight();
    const attributeValues = await listAttributeValuesLight();

    const attributeGroupCache = new Map<string, number>();
    const attributeValueCache = new Map<string, number>();

    for (const group of attributeGroups) {
        attributeGroupCache.set(normalizeText(group.name ?? ""), group.id);
        attributeGroupCache.set(normalizeText(group.publicName ?? ""), group.id);
    }

    for (const value of attributeValues) {
        attributeValueCache.set(
            `${value.attributeGroupId}:${normalizeText(value.name ?? "")}`,
            value.id
        );
    }

    let imported = 0;
    let failed = 0;

    // NEW: stock aggregation for parent products
    const productStockSum = new Map<number, number>();
    const productHasAttributes = new Set<number>();

    for (const row of rows) {
        try {
            const product = await findProductByReference(row.reference, productsCache);

            if (!product) {
                failed++;
                console.warn(`Produit introuvable: ${row.reference}`);
                continue;
            }

            const specName = String(row.specificité ?? "").trim();
            const valueName = String(row.karazany ?? "").trim();
            const quantity = Number(row.stock_initial) || 0;

            // =========================
            // PRODUIT SIMPLE (sans attribut)
            // =========================
            if (!specName) {
                const taxRate = Number(product.tax_rate ?? 20) || 0;
                const targetPriceHt = parseTtcToHt(Number(row.prix_vente_ttc) || 0, taxRate);

                await upsertStockAvailable({
                    id_product: product.id,
                    id_product_attribute: 0,
                    id_shop: 1,
                    id_shop_group: 1,
                    quantity,
                    depends_on_stock: false,
                    out_of_stock: 2,
                });

                if (Number(row.prix_vente_ttc)) {
                    try {
                        await updateProduct(product.id, { price: targetPriceHt } as any);
                    } catch (err) {
                        console.warn(`Erreur update prix produit ${product.id}`, err);
                    }
                }

                imported++;
                continue;
            }

            // =========================
            // PRODUIT AVEC ATTRIBUT
            // =========================
            if (!valueName) {
                failed++;
                console.warn(`Valeur attribut vide: ${row.reference}`);
                continue;
            }

            productHasAttributes.add(product.id);

            const groupId = await ensureAttributeGroupExists(
                specName,
                attributeGroupCache,
                attributeGroups
            );

            const valueId = await ensureAttributeValueExists(
                groupId,
                valueName,
                attributeValueCache,
                attributeValues
            );

            const taxRate = Number(product.tax_rate ?? 20) || 0;
            const basePriceHt = getProductPriceHt(product);
            const targetPriceHt = parseTtcToHt(Number(row.prix_vente_ttc) || 0, taxRate);
            const priceImpactHt = roundMoney(targetPriceHt - basePriceHt);

            const attributeValueIds = [valueId];

            let combinationId = await findCombinationIdByValues(product.id, attributeValueIds);

            if (!combinationId) {
                combinationId = await createCombination(
                    product.id,
                    attributeValueIds,
                    priceImpactHt,
                    quantity,
                    `${product.reference ?? row.reference}-${slugify(row.karazany)}`
                );
            } else {
                await updateCombination(
                    combinationId,
                    product.id,
                    attributeValueIds,
                    priceImpactHt,
                    quantity,
                    `${product.reference ?? row.reference}-${slugify(row.karazany)}`
                );
            }

            // stock combinaison
            await upsertStockAvailable({
                id_product: product.id,
                id_product_attribute: combinationId,
                id_shop: 1,
                id_shop_group: 1,
                quantity,
                depends_on_stock: false,
                out_of_stock: 2,
            });

            // accumulate stock for parent product
            productStockSum.set(
                product.id,
                (productStockSum.get(product.id) || 0) + quantity
            );

            imported++;

        } catch (error) {
            failed++;
            console.error("Erreur import CSV:", row, error);
        }
    }

    // =========================
    // FINAL STEP: update parent stock for attribute products
    // =========================
    for (const [productId, totalQty] of productStockSum.entries()) {
        if (productHasAttributes.has(productId)) {
            await upsertStockAvailable({
                id_product: productId,
                id_product_attribute: 0,
                id_shop: 1,
                id_shop_group: 1,
                quantity: totalQty,
                depends_on_stock: false,
                out_of_stock: 2,
            });
        }
    }

    return { imported, failed };
}