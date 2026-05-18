import { ensureCategoryExists, listCategoriesSimple } from "../../module/Backoffice/categorie/api/categoriesApi";
import { uploadProductImage } from "../../module/Backoffice/produit/api/productsApi";
import { ensureTaxExists, ensureTaxRuleExists, ensureTaxRuleGroupExists, listTaxesLight, listTaxRuleGroupsLight } from "../../module/Backoffice/taxes/taxes";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { normalizeText, slugify } from "../../utils/helper";
import type { colonneCSV } from "./object";
import { isValidDate, toPrestashopDate } from "./utils";

export type ProductImportRow = colonneCSV["produitImport"];

type ZipImageAsset = { blob: Blob; fileName: string };
type ImportProgress = {
	processed: number;
	total: number;
	imported: number;
	failed: number;
	current?: string;
};

type ProductImportContext = {
	categoryIdByKey: Map<string, number>;
	taxRuleGroupIdByRateKey: Map<string, number>;
};

function normalizeLookupKey(value: string): string {
	return normalizeText(String(value ?? "").trim());
}

function taxRateKey(rate: number): string {
	return Number(rate || 0).toFixed(4);
}

function parseTaxRate(value: string): number {
	const raw = String(value ?? "").trim().replace(",", ".");
	const numericMatch = raw.match(/\d+(?:\.\d+)?/);
	if (!numericMatch) {
		return 20;
	}

	const parsed = Number(numericMatch[0]);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return 20;
	}

	return parsed;
}

function roundMoney(value: number): number {
	return Number((Number(value) || 0).toFixed(2));
}

function parseTtcToHt(priceTtc: number, taxRate: number): number {
	const rate = Number(taxRate) || 0;
	if (rate <= 0) {
		return roundMoney(priceTtc);
	}

	return Number((priceTtc / (1 + rate / 100)).toFixed(6));
}

function formatTaxLabel(rate: number): string {
	const formattedRate = Number.isInteger(rate)
		? rate.toFixed(0)
		: rate.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
	return `TVA ${formattedRate}%`;
}

async function prepareProductImportContext(rows: ProductImportRow[]): Promise<ProductImportContext> {
	const categories = await listCategoriesSimple();
	const taxes = await listTaxesLight();
	const taxRuleGroups = await listTaxRuleGroupsLight();

	const categoryCache = new Map<string, number>();
	const taxCache = new Map<string, number>();
	const taxRuleGroupCache = new Map<string, number>();
	const taxRuleCache = new Map<string, number>();
	const taxRuleGroupIdByRateKey = new Map<string, number>();

	for (const category of categories) {
		categoryCache.set(normalizeLookupKey(category.name ?? ""), category.id);
	}

	for (const tax of taxes) {
		taxCache.set(taxRateKey(tax.rate), tax.id);
	}

	for (const group of taxRuleGroups) {
		taxRuleGroupCache.set(normalizeLookupKey(group.name ?? ""), group.id);
	}

	const uniqueCategories = new Map<string, string>();
	const uniqueTaxRates = new Set<number>();

	for (const row of rows) {
		const categoryName = String(row.categorie ?? "").trim();
		if (categoryName) {
			uniqueCategories.set(normalizeLookupKey(categoryName), categoryName);
		}

		uniqueTaxRates.add(parseTaxRate(row.Taxe));
	}

	for (const categoryName of uniqueCategories.values()) {
		await ensureCategoryExists(categoryName, categoryCache, categories);
	}

	for (const taxRate of uniqueTaxRates) {
		const taxLabel = formatTaxLabel(taxRate);
		const taxId = await ensureTaxExists(taxRate, taxCache, taxes);
		const taxRuleGroupId = await ensureTaxRuleGroupExists(taxLabel, taxRuleGroupCache, taxRuleGroups);
		await ensureTaxRuleExists(taxRuleGroupId, taxId, taxRate, taxRuleCache, taxLabel, 8);

		taxRuleGroupIdByRateKey.set(taxRateKey(taxRate), taxRuleGroupId);
	}

	return {
		categoryIdByKey: categoryCache,
		taxRuleGroupIdByRateKey,
	};
}

async function createProductSimple(data: {
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
					id_manufacturer: 0,
					id_supplier: 0,
					id_category_default: data.id_category_default,
					id_tax_rules_group: data.id_tax_rules_group,
					id_default_image: 0,
					type: "standard",
					reference: data.reference,
					supplier_reference: "",
					price: data.price,
					wholesale_price: data.wholesale_price,
					on_sale: 0,
					active: 1,
					visibility: "both",
					weight: 0,
					width: 0,
					state: 1,
					height: 0,
					depth: 0,
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
					meta_description: {
						language: {
							"@_id": 1,
							"#text": "",
						},
					},
					meta_keywords: {
						language: {
							"@_id": 1,
							"#text": "",
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

function normalizeImageReference(value: string): string {
	return normalizeText(String(value ?? "").replace(/\.[^.]+$/, ""));
}

export async function importProduitCsv(rows: ProductImportRow[], options?: { imageMap?: Map<string, ZipImageAsset>; onProgress?: (progress: ImportProgress) => void }): Promise<{ imported: number; failed: number }> {
	const importContext = await prepareProductImportContext(rows);

	let imported = 0;
	let failed = 0;
	let processed = 0;
	const reportProgress = (current?: string) => {
		options?.onProgress?.({ processed, total: rows.length, imported, failed, current });
	};

	reportProgress("Préparation");

	for (const row of rows) {
		try {
			const taxRate = parseTaxRate(row.Taxe);
			const categoryName = String(row.categorie ?? "").trim();
			if (!categoryName) {
				throw new Error("Catégorie vide dans le CSV produit");
			}

			const categoryId = importContext.categoryIdByKey.get(normalizeLookupKey(categoryName));
			if (!categoryId) {
				throw new Error(`Catégorie introuvable: ${categoryName}`);
			}

			const taxRuleGroupId = importContext.taxRuleGroupIdByRateKey.get(taxRateKey(taxRate));
			if (!taxRuleGroupId) {
				throw new Error(`Contexte TVA introuvable pour le taux ${taxRate}`);
			}

			const rawAvailableDate = String(row.date_availability_produit ?? "").trim();
			let availableDate = "";
			if (rawAvailableDate) {
				if (!isValidDate(rawAvailableDate) && !/^\d{4}-\d{2}-\d{2}$/.test(rawAvailableDate)) {
					const confirmed = window.confirm(
						`La date "${rawAvailableDate}" n'est pas au format DD/MM/YYYY. Voulez-vous la convertir avant l'import ?`,
					);
					if (!confirmed) {
						throw new Error(`Import arrêté par l'utilisateur pour la date ${rawAvailableDate}`);
					}
				}

				const normalizedDate = toPrestashopDate(rawAvailableDate);
				if (!normalizedDate) {
					throw new Error(`Date invalide: ${rawAvailableDate}`);
				}
				availableDate = normalizedDate;
			}

			const priceTtc = Number(row.prix_ttc) || 0;
			const priceHt = parseTtcToHt(priceTtc, taxRate);
			const product = await createProductSimple({
				id_category_default: categoryId,
				id_tax_rules_group: taxRuleGroupId,
				name: row.nom,
				reference: row.reference,
				price: priceHt,
				wholesale_price: Number(row.prix_achat) || 0,
				...(availableDate ? { available_date: availableDate } : {}),
				description: `Produit importé depuis CSV: ${row.nom}`,
				description_short: `Import CSV - ${row.reference}`,
				link_rewrite: slugify(row.nom),
			});

			const imageAsset = options?.imageMap?.get(normalizeImageReference(row.reference));
			if (imageAsset) {
				try {
					await uploadProductImage(product.id, imageAsset.blob, imageAsset.fileName);
				} catch (imageError) {
					console.warn(`Impossible d'upload l'image du produit ${row.reference}:`, imageError);
				}
			}

			imported += 1;
		} catch (error) {
			failed += 1;
			console.error("Erreur lors de l'import du produit CSV:", row, error);
		} finally {
			processed += 1;
			reportProgress(row.reference || row.nom || "Ligne produit");
		}
	}

	reportProgress("Terminé");

	return { imported, failed };
}
