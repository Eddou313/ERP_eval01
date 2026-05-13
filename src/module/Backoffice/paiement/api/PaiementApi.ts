export type PaymentMethod = {
  id: number;
  code: string;
  label: string;
  type: string;
  active?: boolean;
  provider?: string;
};

export const PAYMENT_METHODS = [
  {
    id: 1,
    code: "cash",
    label: "Paiement à la livraison",
    type: "cash",
    active: true,
  },
//   {
//     code: "mvola",
//     label: "MVola",
//     type: "mobile_money",
//     provider: "custom",
//   },
//   {
//     code: "orange_money",
//     label: "Orange Money",
//     type: "mobile_money",
//   },
//   {
//     code: "visa",
//     label: "Carte bancaire",
//     type: "online",
//     provider: "stripe",
//   }
];