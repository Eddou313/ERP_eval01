// import { listClientsLight } from "../../client/api/clientApi";
// import { listCategoriesLight } from "../../categorie/api/categoriesApi";
// import { listOrdersLight } from "../../commande/api/commandesApi";
// import { listProductsLight } from "../../produit/api/productsApi";
// import { listCartsLight } from "../../panier/api/panierApi";
// import { listOrderReturns } from "../../SAV/api/returnApi";
// import { listSavThreads } from "../../SAV/api/savApi";
// import { formatCurrencyEur } from "../../../../utils/helper";

// export type DashboardPeriod = "jour" | "mois" | "annee" | "jour-1" | "mois-1" | "annee-1";

// export type DashboardMetric = {
//   label: string;
//   value: string;
//   tone?: "muted" | "active";
// };

// export type DashboardListItem = {
//   label: string;
//   value: string;
// };

// export type DashboardActivityRow = {
//   label: string;
//   value: string;
//   helper: string;
// };

// export type DashboardData = {
//   periodLabel: string;
//   lastUpdated: string;
//   metrics: DashboardMetric[];
//   pendingItems: DashboardListItem[];
//   activityRows: DashboardActivityRow[];
//   chartLabels: string[];
//   chartValues: number[];
// };

// const DAY_MS = 24 * 60 * 60 * 1000;

// const PERIOD_LABELS: Record<DashboardPeriod, string> = {
//   jour: "Jour",
//   mois: "Mois",
//   annee: "Année",
//   "jour-1": "Jour-1",
//   "mois-1": "Mois-1",
//   "annee-1": "Année-1",
// };

// type DateRange = {
//   start: Date;
//   end: Date;
// };

// function startOfDay(date: Date): Date {
//   return new Date(date.getFullYear(), date.getMonth(), date.getDate());
// }

// function addDays(date: Date, days: number): Date {
//   return new Date(date.getTime() + days * DAY_MS);
// }

// function parseDate(value: string | undefined): Date | null {
//   if (!value) return null;
//   const normalized = value.includes("T") ? value : `${value}T00:00:00`;
//   const date = new Date(normalized);
//   return Number.isNaN(date.getTime()) ? null : date;
// }

// function getRange(period: DashboardPeriod): DateRange {
//   const today = startOfDay(new Date());

//   switch (period) {
//     case "jour":
//       return { start: today, end: addDays(today, 1) };
//     case "mois":
//       return { start: addDays(today, -30), end: addDays(today, 1) };
//     case "annee":
//       return { start: addDays(today, -365), end: addDays(today, 1) };
//     case "jour-1":
//       return { start: addDays(today, -1), end: today };
//     case "mois-1":
//       return { start: addDays(today, -60), end: addDays(today, -30) };
//     case "annee-1":
//       return { start: addDays(today, -730), end: addDays(today, -365) };
//   }
// }

// function inRange(date: Date | null, range: DateRange): boolean {
//   if (!date) return false;
//   return date >= range.start && date < range.end;
// }

// function formatShortDate(date: Date): string {
//   return new Intl.DateTimeFormat("fr-FR", {
//     day: "numeric",
//     month: "numeric",
//     year: "numeric",
//   }).format(date);
// }

// function buildBuckets(range: DateRange, bucketCount = 7): Date[] {
//   const span = Math.max(range.end.getTime() - range.start.getTime(), DAY_MS);
//   const step = span / bucketCount;
//   return Array.from({ length: bucketCount }, (_, index) => new Date(range.start.getTime() + index * step));
// }

// function buildChartSeries(orders: Array<{ date_add: string }>, range: DateRange): { labels: string[]; values: number[] } {
//   const bucketCount = 7;
//   const buckets = buildBuckets(range, bucketCount);
//   const values = Array.from({ length: bucketCount }, () => 0);

//   for (const order of orders) {
//     const date = parseDate(order.date_add);
//     if (!inRange(date, range) || !date) continue;

//     const span = Math.max(range.end.getTime() - range.start.getTime(), DAY_MS);
//     const index = Math.min(
//       bucketCount - 1,
//       Math.floor(((date.getTime() - range.start.getTime()) / span) * bucketCount),
//     );
//     values[index] += 1;
//   }

//   return {
//     labels: buckets.map((bucket) => formatShortDate(bucket)),
//     values,
//   };
// }

// function sum(values: number[]): number {
//   return values.reduce((total, value) => total + value, 0);
// }

// function countInRange<T>(items: T[], getDate: (item: T) => string | undefined, range: DateRange): number {
//   return items.filter((item) => inRange(parseDate(getDate(item)), range)).length;
// }

// export async function getDashboardData(period: DashboardPeriod): Promise<DashboardData> {
//   const range = getRange(period);

//   const [orders, carts, clients, products, categories, returnsList, savThreads] = await Promise.all([
//     listOrdersLight().catch(() => []),
//     listCartsLight().catch(() => []),
//     listClientsLight().catch(() => []),
//     listProductsLight().catch(() => []),
//     listCategoriesLight().catch(() => []),
//     listOrderReturns().catch(() => []),
//     listSavThreads().catch(() => []),
//   ]);

//   const ordersInPeriod = orders.filter((order) => inRange(parseDate(order.date_add), range));
//   const cartsInPeriod = carts.filter((cart) => inRange(parseDate(cart.date_add), range));
//   const clientsInPeriod = clients.filter((client) => inRange(parseDate(client.registrationDate), range));
//   const activeCarts = cartsInPeriod.filter((cart) => cart.online).length;
//   const abandonedCarts = cartsInPeriod.filter((cart) => cart.id_order === null).length;
//   const ordersInProgress = ordersInPeriod.filter((order) => [1, 2, 3, 9].includes(order.current_state)).length;
//   const lowStockProducts = products.filter((product) => product.quantity <= 0).length;
//   const salesTotal = sum(ordersInPeriod.map((order) => order.total_paid));
//   const averageCart = ordersInPeriod.length > 0 ? salesTotal / ordersInPeriod.length : 0;
//   const conversionRate = cartsInPeriod.length > 0 ? (ordersInPeriod.length / cartsInPeriod.length) * 100 : 0;
//   const chart = buildChartSeries(ordersInPeriod, range);

//   return {
//     periodLabel: PERIOD_LABELS[period],
//     lastUpdated: new Intl.DateTimeFormat("fr-FR", {
//       dateStyle: "short",
//       timeStyle: "short",
//     }).format(new Date()),
//     metrics: [
//       { label: "Ventes", value: formatCurrencyEur(salesTotal), tone: "muted" },
//       { label: "Commandes", value: String(ordersInPeriod.length), tone: "active" },
//       { label: "Panier Moyen", value: formatCurrencyEur(averageCart), tone: "muted" },
//       { label: "Clients", value: String(clients.length), tone: "muted" },
//       { label: "Produits", value: String(products.length), tone: "muted" },
//       { label: "Catégories", value: String(categories.length), tone: "muted" },
//     ],
//     pendingItems: [
//       { label: "Commandes", value: String(ordersInPeriod.length) },
//       { label: "Retours/Échanges", value: String(returnsList.length) },
//       { label: "Paniers abandonnés", value: String(abandonedCarts) },
//       { label: "Produits en rupture de stock", value: String(lowStockProducts) },
//     ],
//     activityRows: [
//       { label: "Paniers actifs", value: String(activeCarts), helper: `${cartsInPeriod.length} panier(s) dans la période` },
//       { label: "Commandes en cours", value: String(ordersInProgress), helper: `${Math.round(conversionRate)}% de transformation` },
//       { label: "Nouveaux clients", value: String(clientsInPeriod.length), helper: `${clients.length} client(s) au total` },
//       { label: "Tickets SAV", value: String(savThreads.length), helper: `Dernière activité: ${countInRange(savThreads, (item) => item.last_message_date, range)}` },
//     ],
//     chartLabels: chart.labels,
//     chartValues: chart.values,
//   };
// }
