import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import { textFromUnknown, numFromUnknown, asArray } from "../../../../utils/helper";

export type OrderStateListItem = {
  id: number;
  name: string;
  template: string;
  color: string;
  unremovable: boolean;
};

export type OrderStateDetail = OrderStateListItem & {
  invoice: boolean;
  send_email: boolean;
  paid: number;
  shipped: number;
  delivery: number;
  logable: boolean;
};

export type OrderStateCreateForm = {
  name: string;
  template: string;
  color: string;
  unremovable?: boolean;
  invoice?: boolean;
  send_email?: boolean;
  paid?: boolean;
  shipped?: boolean;
  delivery?: boolean;
  logable?: boolean;
};

export type OrderStateImportForm = OrderStateCreateForm & {
  id?: number;
};

export async function listOrderStates(): Promise<OrderStateListItem[]> {
  try {
    const response = await requestPrestashopXml<any>(`/order_states`, {
      query: { display: "full", limit: 200 },
    });

    const states = response?.prestashop?.order_states?.order_state;
    if (!states) return [];

    const statesList = asArray<any>(states);

    return statesList.map((state: any) => ({
      id: numFromUnknown(state.id),
      name: textFromUnknown(state.name),
      template: textFromUnknown(state.template),
      color: textFromUnknown(state.color),
      unremovable: textFromUnknown(state.unremovable) === "1",
    }));
  } catch {
    return [];
  }
}
export async function getOrderStateById(idEtat: number,liste:OrderStateListItem[]): Promise<OrderStateListItem | null> {
  for (const state of liste) {
    if (state.id === idEtat) {
      return state;
    }
  }
  return null; 
}
export async function getOrderStateDetail(stateId: number): Promise<OrderStateDetail | null> {
  try {
    const response = await requestPrestashopXml<any>(`/order_states/${stateId}`);
    const state = response?.prestashop?.order_state;
    if (!state) return null;

    return {
      id: numFromUnknown(state.id),
      name: textFromUnknown(state.name),
      template: textFromUnknown(state.template),
      color: textFromUnknown(state.color),
      unremovable: textFromUnknown(state.unremovable) === "1",
      invoice: textFromUnknown(state.invoice) === "1",
      send_email: textFromUnknown(state.send_email) === "1",
      paid: numFromUnknown(state.paid),
      shipped: numFromUnknown(state.shipped),
      delivery: numFromUnknown(state.delivery),
      logable: textFromUnknown(state.logable) === "1",
    };
  } catch {
    return null;
  }
}

export async function deleteOrderState(stateId: number): Promise<void> {
  await requestPrestashopXml(`/order_states/${stateId}`, { method: "DELETE" });
}

export async function initEtatCommande(items: OrderStateListItem[]): Promise<void> {
  try {
    await Promise.all(items.map((entry) => deleteOrderState(entry.id)));
  } catch {
    alert("Erreur lors de l'initialisation des états de commande");
  }
}
