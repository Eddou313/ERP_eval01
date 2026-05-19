import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import { asArray, numFromUnknown, textFromUnknown } from "../../../../utils/helper";

type CategoryStat = {
  categoryId: number;
  categoryName: string;
  sales: number;
  purchases: number;
  profit: number;
};

const productCache = new Map<number, { price: number; wholesale: number; categories: number[] }>();
const categoryNameCache = new Map<number, string>();

async function fetchProductInfo(productId: number) {
  if (productCache.has(productId)) return productCache.get(productId)!;

  try {
    const resp = await requestPrestashopXml<any>(`/products/${productId}`, { query: { display: "full" } });
    const prod = resp?.prestashop?.product;
    const price = Number(prod?.price) || 0;
    const wholesale = Number(prod?.wholesale_price) || 0;
    const catsRaw = prod?.associations?.categories?.category;
    let cats = Array.isArray(catsRaw) ? catsRaw.map((c: any) => Number(c.id ?? c["@_id"])) : catsRaw ? [Number(catsRaw.id ?? catsRaw["@_id"])].filter(Boolean) : [];
    
    // Fallback to id_category_default if no categories in associations
    if ((!cats || cats.length === 0) && prod?.id_category_default) {
      const defaultCatId = numFromUnknown(prod.id_category_default);
      if (defaultCatId > 0) {
        cats = [defaultCatId];
        console.debug(`fetchProductInfo: product ${productId} using fallback id_category_default=${defaultCatId}`);
      }
    }
    const info = { price, wholesale, categories: cats };
    productCache.set(productId, info);
    return info;
  } catch {
    const info = { price: 0, wholesale: 0, categories: [] };
    productCache.set(productId, info);
    return info;
  }
}

async function fetchCategoryName(categoryId: number) {
  if (categoryNameCache.has(categoryId)) return categoryNameCache.get(categoryId)!;
  try {
    const resp = await requestPrestashopXml<any>(`/categories/${categoryId}`, { query: { display: "full" } });
    const cat = resp?.prestashop?.category;
    const name = textFromUnknown(cat?.name) || `Catégorie ${categoryId}`;
    categoryNameCache.set(categoryId, name);
    return name;
  } catch {
    const name = `Catégorie ${categoryId}`;
    categoryNameCache.set(categoryId, name);
    return name;
  }
}

export async function getDashboardStats(): Promise<{
  totalSalesHT: number;
  totalPurchasesHT: number;
  profitByCategory: CategoryStat[];
}> {
  const salesTotalsByCategory = new Map<number, { sales: number; purchases: number }>();
  let totalSalesHT = 0;
  let totalPurchasesHT = 0;

  const response = await requestPrestashopXml<any>("/orders", { query: { display: "full", limit: "0,10000" } });
  const orders = asArray(response?.prestashop?.orders?.order ?? []);

  // Iterate orders and aggregate using row-level prices (prefer `unit_price_tax_excl` when present)
  for (const order of orders) {
    const rows = asArray(order?.associations?.order_rows?.order_row ?? []);
    for (const row of rows) {
      const productId = numFromUnknown(row?.product_id ?? row?.id_product ?? row?.id_product ?? 0) || 0;
      const qty = Number(row?.product_quantity ?? row?.product_qty ?? 0) || 0;

      // Prefer explicit tax-excluded unit price from the order row when available
      let unitPrice = Number(row?.unit_price_tax_excl ?? row?.product_price ?? row?.unit_price ?? 0) || 0;

      const prodInfo = await fetchProductInfo(productId);
      // If row doesn't contain a usable price, fallback to product base price (HT if available via pricing workflow)
      if (!unitPrice || unitPrice === 0) unitPrice = prodInfo.price || 0;

      const wholesale = prodInfo.wholesale || 0;

      const saleAmount = unitPrice * qty;
      const purchaseAmount = wholesale * qty;

      // Sum totals from row-level amounts to keep consistency
      totalSalesHT += saleAmount;
      totalPurchasesHT += purchaseAmount;

      const catId = prodInfo.categories?.[0] ?? 0;
      const entry = salesTotalsByCategory.get(catId) ?? { sales: 0, purchases: 0 };
      entry.sales += saleAmount;
      entry.purchases += purchaseAmount;
      salesTotalsByCategory.set(catId, entry);
    }
  }

  const profitByCategory: CategoryStat[] = [];
  for (const [catId, vals] of salesTotalsByCategory.entries()) {
    const name = catId === 0 ? "Sans catégorie" : await fetchCategoryName(catId);
    const profit = vals.sales - vals.purchases;
    profitByCategory.push({ categoryId: catId, categoryName: name, sales: vals.sales, purchases: vals.purchases, profit });
  }

  // Sort by profit desc
  profitByCategory.sort((a, b) => b.profit - a.profit);

  return { totalSalesHT, totalPurchasesHT, profitByCategory };
}

export type { CategoryStat };
