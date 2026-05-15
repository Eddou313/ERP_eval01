
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