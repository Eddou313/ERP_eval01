import { asArray, numFromUnknown, textFromUnknown } from "../../../utils/helper";
import { requestPrestashopXml } from "../../../utils/prestashopClient";
import { getOrderStateLabel } from "../commande/api/commandesApi";

export type OrderStatusHistoryItem = {
  orderId: number;
  stateId: number;
  stateLabel: string;
  employeeId: number;
  dateAdd: string;
  raw: Record<string, unknown>;
};

// Récupère l'historique des changements d'état d'une commande.
export async function listOrderStatusHistory(orderId: number): Promise<OrderStatusHistoryItem[]> {
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return [];
  }

  const candidates = [
    { path: "/order_histories", query: { display: "full", "filter[id_order]": `[${orderId}]` } },
    { path: "/order_history", query: { display: "full", "filter[id_order]": `[${orderId}]` } },
    { path: "/order_histories", query: { display: "full" } },
  ];

  for (const candidate of candidates) {
    try {
      const response = await requestPrestashopXml<any>(candidate.path, { query: candidate.query });
      const historyRaw = response?.prestashop?.order_histories?.order_history ?? response?.prestashop?.order_history;
      const historyItems = asArray<any>(historyRaw);

      const mapped: OrderStatusHistoryItem[] = [];

      for (const item of historyItems) {
        const itemOrderId = numFromUnknown((item as any)?.id_order);
        if (itemOrderId > 0 && itemOrderId !== orderId) {
          continue;
        }

        const stateId = numFromUnknown((item as any)?.id_order_state ?? (item as any)?.current_state ?? (item as any)?.state);
        if (stateId <= 0) {
          continue;
        }

        const employeeId = numFromUnknown((item as any)?.id_employee);
        const dateAdd = textFromUnknown((item as any)?.date_add || (item as any)?.date_upd || (item as any)?.date);

        mapped.push({
          orderId,
          stateId,
          stateLabel: getOrderStateLabel(stateId),
          employeeId,
          dateAdd,
          raw: item as Record<string, unknown>,
        });
      }

      if (mapped.length > 0) {
        return mapped;
      }
    } catch {
      // try next endpoint
    }
  }

  return [];
}

// Transforme l'historique en lignes courtes pour un affichage rapide.
export function summarizeOrderStatusHistory(history: OrderStatusHistoryItem[]): string[] {
  return history.map((entry) => {
    const date = entry.dateAdd || "-";
    const employee = entry.employeeId > 0 ? ` (employé #${entry.employeeId})` : "";
    return `${date}: ${entry.stateLabel}${employee}`;
  });
}

// Retourne le dernier statut connu d'une commande.
export function getLatestOrderStatus(history: OrderStatusHistoryItem[]): OrderStatusHistoryItem | null {
  return history.length > 0 ? history[0] : null;
}

// Indique si une commande possède déjà des changements d'état exploitables.
export function hasOrderStatusHistory(history: OrderStatusHistoryItem[]): boolean {
  return history.length > 0;
}

// Construit un texte d'état lisible pour une commande en contexte ERP.
export function formatOrderStatusLabel(stateId: number, fallback = "Statut inconnu"): string {
  if (!Number.isFinite(stateId) || stateId <= 0) {
    return fallback;
  }

  const label = getOrderStateLabel(stateId);
  return label || fallback;
}
