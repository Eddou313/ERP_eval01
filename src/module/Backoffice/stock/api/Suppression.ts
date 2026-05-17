import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import { listStockItems, listStockMovements } from "./stockApi";

/**
 * Supprime toutes les entrées de stock (`ps_stock_available`) et tous les mouvements de stock
 * via l'API PrestaShop. Utiliser avec précaution.
 * @param opts.deleteStocks Par défaut `true`.
 * @param opts.deleteMovements Par défaut `true`.
 */
export async function SupprimerStocksEtMouvements(opts?: { deleteStocks?: boolean; deleteMovements?: boolean; }): Promise<{ deletedStocks: number; deletedMovements: number; }> {
  const deleteStocks = opts?.deleteStocks ?? true;
  const deleteMovements = opts?.deleteMovements ?? true;
  let deletedStocks = 0;
  let deletedMovements = 0;

  if (deleteStocks) {
    try {
      console.log("Récupération des entrées de stock...");
      const stocks = await listStockItems();
      for (const s of stocks) {
        const sid = (s as any)?.id;
        if (!sid) continue;
        try {
          await requestPrestashopXml(`/stock_availables/${sid}`, { method: "DELETE" });
          deletedStocks++;
          console.log(`✓ Suppressé stock id=${sid}`);
        } catch (e) {
          console.error(`Erreur suppression stock id=${sid}:`, e);
        }
      }
    } catch (e) {
      console.error("Erreur récupération des stocks:", e);
    }
  }

  if (deleteMovements) {
    try {
      console.log("Récupération des mouvements de stock...");
      const movements = await listStockMovements();
      for (const m of movements) {
        const mid = (m as any)?.id;
        if (!mid) continue;
        try {
          await requestPrestashopXml(`/stock_movements/${mid}`, { method: "DELETE" });
          deletedMovements++;
          console.log(`✓ Suppressé mouvement id=${mid}`);
        } catch (e) {
          console.error(`Erreur suppression mouvement id=${mid}:`, e);
        }
      }
    } catch (e) {
      console.error("Erreur récupération des mouvements:", e);
    }
  }

  return { deletedStocks, deletedMovements };
}
