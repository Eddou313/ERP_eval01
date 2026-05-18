
export const ALLOWED_STATES = [
  { id: 5, name: "Livrer" },
  { id: 6, name: "Annulé" },
];

export function getStateId(etatLower?: string): number | null {
  if (!etatLower) return null;

  const normalized = etatLower.toLowerCase();

  const found = ALLOWED_STATES.find((state) =>
    normalized.includes(state.name.toLowerCase())
  );

  return found ? found.id : null;
}

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