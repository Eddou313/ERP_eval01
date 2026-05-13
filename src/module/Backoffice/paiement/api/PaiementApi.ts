export type PaymentMethod = {
  id: number;
  code: string;        // interne app
  module: string;      // PrestaShop module
  label: string;
  type: "cash" | "bankwire" | "check" | "paypal" | "custom";
  active?: boolean;
  provider?: string;
};
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 1,
    code: "cash",
    module: "ps_cashondelivery",
    label: "Paiement à la livraison",
    type: "cash",
    active: true,
  },
  {
    id: 2,
    code: "bankwire",
    module: "ps_wirepayment",
    label: "Virement bancaire",
    type: "bankwire",
    active: true,
  },
  {
    id: 3,
    code: "check",
    module: "ps_checkpayment",
    label: "Paiement par chèque",
    type: "check",
    active: true,
  },
  {
    id: 4,
    code: "paypal",
    module: "ps_checkout",
    label: "PayPal / Carte bancaire",
    type: "paypal",
    active: true,
  },


  {
    id: 10,
    code: "mvola",
    module: "custom_mvola",
    label: "MVola",
    type: "custom",
    provider: "custom",
    active: true,
  },
];



// | Méthode  | module PrestaShop |
// | -------- | ----------------- |
// | Cash     | ps_cashondelivery |
// | Virement | ps_wirepayment    |
// | Chèque   | ps_checkpayment   |
// | PayPal   | ps_checkout       |
