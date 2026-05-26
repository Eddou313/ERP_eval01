import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import { asArray, numFromUnknown, textFromUnknown } from "../../../../utils/helper";

type CategoryStat = {
  categoryId: number;
  categoryName: string;
  sales: number;
  salesHT: number;
  purchases: number;
  purchasesHT: number;
  profit: number;
  profitHT: number;
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
  totalSalesTTC: number;
  totalPurchasesHT: number;
  totalPurchases: number;
  totalProfit: number;
  profitByCategory: CategoryStat[];
  canceledByCategory: CategoryStat[];
  canceledTotals: { sales: number; purchases: number; profit: number };
}> {
  const salesTotalsByCategory = new Map<number, { sales: number; purchases: number }>();
  const salesTotalsByCategoryHT = new Map<number, { sales: number; purchases: number }>();
  const canceledTotalsByCategory = new Map<number, { sales: number; purchases: number }>();
  const canceledTotalsByCategoryHT = new Map<number, { sales: number; purchases: number }>();
  let totalSalesHT = 0;
  let totalSalesTTC = 0;
  let totalPurchasesHT = 0;
  let totalPurchases = 0;
  let canceledSales = 0;
  let canceledPurchases = 0;

  const response = await requestPrestashopXml<any>("/orders", { query: { display: "full", limit: "0,10000" } });
  const orders = asArray(response?.prestashop?.orders?.order ?? []);

  // Agréger les commandes selon la formule:
  // bénéfice = vente TTC - achat
  for (const order of orders) {
    const currentState = numFromUnknown(order?.current_state);

    const rows = asArray(order?.associations?.order_rows?.order_row ?? []);
    const rowBaseAmounts = [] as Array<{ productId: number; qty: number; salesAmountTTC: number; salesAmountHT: number }>;

    for (const row of rows) {
      const productId = numFromUnknown(row?.product_id ?? row?.id_product ?? row?.id ?? row?.['@_id'] ?? 0) || 0;
      const qty = Number(row?.product_quantity ?? row?.product_qty ?? row?.quantity ?? 0) || 0;

      const salesAmountTTC = Number(row?.total_price_tax_incl);
      const fallbackSalesAmountTTC = (Number(row?.unit_price_tax_incl ?? row?.product_price_wt ?? 0) || 0) * qty;
      const salesAmountHT = Number(row?.total_price_tax_excl);
      const fallbackSalesAmountHT = (Number(row?.unit_price_tax_excl ?? row?.product_price ?? row?.unit_price ?? 0) || 0) * qty;

      rowBaseAmounts.push({
        productId,
        qty,
        salesAmountTTC: Number.isFinite(salesAmountTTC) && salesAmountTTC > 0 ? salesAmountTTC : fallbackSalesAmountTTC,
        salesAmountHT: Number.isFinite(salesAmountHT) && salesAmountHT > 0 ? salesAmountHT : fallbackSalesAmountHT,
      });
    }

    const orderSalesTTC = rowBaseAmounts.reduce((sum, item) => sum + item.salesAmountTTC, 0);
    const orderSalesHT = rowBaseAmounts.reduce((sum, item) => sum + item.salesAmountHT, 0);
    let orderPurchases = 0;
    const rowComputed = [] as Array<{ catId: number; saleAmountTTC: number; saleAmountHT: number; purchaseAmount: number }>;

    for (const item of rowBaseAmounts) {
      const prodInfo = item.productId > 0 ? await fetchProductInfo(item.productId) : { price: 0, wholesale: 0, categories: [] };
      const wholesale = prodInfo.wholesale || 0;
      const purchaseAmount = wholesale * item.qty;
      const saleAmountTTC = item.salesAmountTTC;
      const saleAmountHT = item.salesAmountHT;

      orderPurchases += purchaseAmount;
      const catId = prodInfo.categories?.[0] ?? 0;
      rowComputed.push({ catId, saleAmountTTC, saleAmountHT, purchaseAmount });
    }

    if (currentState === 6) {
      canceledSales += orderSalesTTC;
      canceledPurchases += orderPurchases;

      for (const row of rowComputed) {
        const catId = row.catId;
        const entry = canceledTotalsByCategory.get(catId) ?? { sales: 0, purchases: 0 };
        entry.sales += row.saleAmountTTC;
        entry.purchases += row.purchaseAmount;
        canceledTotalsByCategory.set(catId, entry);

        const entryHT = canceledTotalsByCategoryHT.get(catId) ?? { sales: 0, purchases: 0 };
        entryHT.sales += row.saleAmountHT;
        entryHT.purchases += row.purchaseAmount;
        canceledTotalsByCategoryHT.set(catId, entryHT);
      }
      continue;
    }

    totalSalesTTC += orderSalesTTC;
    totalSalesHT += orderSalesHT;
    totalPurchases += orderPurchases;
    totalPurchasesHT += orderPurchases;

    for (const row of rowComputed) {
      const catId = row.catId;
      const entry = salesTotalsByCategory.get(catId) ?? { sales: 0, purchases: 0 };
      entry.sales += row.saleAmountTTC;
      entry.purchases += row.purchaseAmount;
      salesTotalsByCategory.set(catId, entry);

      const entryHT = salesTotalsByCategoryHT.get(catId) ?? { sales: 0, purchases: 0 };
      entryHT.sales += row.saleAmountHT;
      entryHT.purchases += row.purchaseAmount;
      salesTotalsByCategoryHT.set(catId, entryHT);
    }
  }

  const profitByCategory: CategoryStat[] = [];
  for (const [catId, vals] of salesTotalsByCategory.entries()) {
    const valsHT = salesTotalsByCategoryHT.get(catId) ?? { sales: 0, purchases: 0 };
    const name = catId === 0 ? "Sans catégorie" : await fetchCategoryName(catId);
    const profit = vals.sales - vals.purchases;
    const profitHT = valsHT.sales - valsHT.purchases;
    profitByCategory.push({
      categoryId: catId,
      categoryName: name,
      sales: vals.sales,
      salesHT: valsHT.sales,
      purchases: vals.purchases,
      purchasesHT: valsHT.purchases,
      profit,
      profitHT,
    });
  }

  const canceledByCategory: CategoryStat[] = [];
  for (const [catId, vals] of canceledTotalsByCategory.entries()) {
    const valsHT = canceledTotalsByCategoryHT.get(catId) ?? { sales: 0, purchases: 0 };
    const name = catId === 0 ? "Sans catégorie" : await fetchCategoryName(catId);
    const profit = vals.sales - vals.purchases;
    const profitHT = valsHT.sales - valsHT.purchases;
    canceledByCategory.push({
      categoryId: catId,
      categoryName: name,
      sales: vals.sales,
      salesHT: valsHT.sales,
      purchases: vals.purchases,
      purchasesHT: valsHT.purchases,
      profit,
      profitHT,
    });
  }

  // Sort by profit desc
  profitByCategory.sort((a, b) => b.profit - a.profit);
  canceledByCategory.sort((a, b) => b.profit - a.profit);

  return {
    totalSalesTTC,
    totalSalesHT,
    totalPurchasesHT,
    totalPurchases,
    totalProfit: totalSalesTTC - totalPurchases,
    profitByCategory,
    canceledByCategory,
    canceledTotals: {
      sales: canceledSales,
      purchases: canceledPurchases,
      profit: canceledSales - canceledPurchases,
    },
  };
}

export type { CategoryStat };
