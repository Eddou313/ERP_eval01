import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";

export async function getOrCreateAddress(customerId: number, adresseText: string): Promise<number> {
  // Chercher adresse existante du client
  const res = await requestPrestashopXml<any>("/addresses", {
    query: {
      display: "[id,id_customer]",
      "filter[id_customer]": `[${customerId}]`,
      limit: "1",
    },
  });

  const existing = res?.prestashop?.addresses?.address;
  if (existing) {
    const list = Array.isArray(existing) ? existing : [existing];
    if (list[0]?.id) return Number(list[0].id);
  }

  // Créer l'adresse
  const created = await requestPrestashopXml<any>("/addresses", {
    method: "POST",
    bodyXml: buildPrestashopXml({
      prestashop: {
        address: {
          id_customer:  customerId,
          id_country:   64,    // Madagascar (à adapter selon votre PS)
          id_state:     0,
          alias:        "Principale",
          lastname:     "Client",
          firstname:    "Client",
          address1:     adresseText,
          address2:     "",
          postcode:     "000",
          city:         adresseText,
          phone:        "",
          active:       1,
          deleted:      0,
        },
      },
    }),
  });

  const newId = Number(created?.prestashop?.address?.id);
  if (!newId) throw new Error(`Création adresse échouée`);
  return newId;
}