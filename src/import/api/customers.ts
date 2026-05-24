import { asArray, boolFromUnknown, numFromUnknown, textFromUnknown } from "../../utils/helper";
import { buildPrestashopXml, requestPrestashopXml } from "../../utils/prestashopClient";
import { generateSecureKey, type Commande } from "./importCSV3";

export async function getOrCreateCustomer(
  cmd: Commande
): Promise<ClientForm> {
  const res = await requestPrestashopXml<any>("/customers", {
    query: {
      display: "full",
      "filter[email]": `[${cmd.email}]`,
      limit: "1",
    },
  });

  const existing = res?.prestashop?.customers?.customer;
  if (existing) {
    const list = Array.isArray(existing) ? existing : [existing];
    if (list[0]?.id) {
      return {
        id: list[0].id,
        id_gender: list[0].id_gender,
        id_default_group: list[0].id_default_group,
        id_lang: list[0].id_lang,
        firstname: list[0].firstname,
        lastname: list[0].lastname,
        email: list[0].email,
        passwd: list[0].passwd,
        birthday: list[0].birthday,
        active: list[0].active,
        newsletter: list[0].newsletter,
        optin: list[0].optin,
        company: list[0].company,
        siret: list[0].siret,
        ape: list[0].ape,
        website: list[0].website,
        note: list[0].note,
        is_guest: list[0].is_guest,
        deleted: list[0].deleted,
        secure_key: list[0].secure_key,
      };
    }
  }

  const [prenom, ...restNom] = cmd.nom.trim().split(" ");
  const nom = restNom.join(" ") || prenom;

  const created = await requestPrestashopXml<any>("/customers", {
    method: "POST",
    bodyXml: buildPrestashopXml({
      prestashop: {
        customer: {
          firstname: prenom,
          lastname: nom,
          email: cmd.email,
          passwd: cmd.pwd,
          id_default_group: 3,
          active: 1,
          deleted: 0,
        },
      },
    }),
  });

  const newId = Number(created?.prestashop?.customer?.id);
  if (!newId) throw new Error(`Création client échouée pour ${cmd.email}`);

  return {
    id: created?.prestashop?.customer?.id,
    id_gender: created?.prestashop?.customer?.id_gender,
    id_default_group: created?.prestashop?.customer?.id_default_group,
    id_lang: created?.prestashop?.customer?.id_lang,
    firstname: created?.prestashop?.customer?.firstname,
    lastname: created?.prestashop?.customer?.lastname,
    email: created?.prestashop?.customer?.email,
    passwd: created?.prestashop?.customer?.passwd,
    birthday: created?.prestashop?.customer?.birthday,
    active: created?.prestashop?.customer?.active,
    newsletter: created?.prestashop?.customer?.newsletter,
    optin: created?.prestashop?.customer?.optin,
    company: created?.prestashop?.customer?.company,
    siret: created?.prestashop?.customer?.siret,
    ape: created?.prestashop?.customer?.ape,
    website: created?.prestashop?.customer?.website,
    note: created?.prestashop?.customer?.note,
    is_guest: created?.prestashop?.customer?.is_guest,
    deleted: created?.prestashop?.customer?.deleted,
    secure_key: created?.prestashop?.customer?.secure_key,
  };
}


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
          id_customer: customerId,
          id_country: 64,    // Madagascar (à adapter selon votre PS)
          id_state: 0,
          alias: "Principale",
          lastname: "Client",
          firstname: "Client",
          address1: adresseText,
          address2: "",
          postcode: "000",
          city: adresseText,
          phone: "",
          active: 1,
          deleted: 0,
        },
      },
    }),
  });

  const newId = Number(created?.prestashop?.address?.id);
  if (!newId) throw new Error(`Création adresse échouée`);
  return newId;
}
export async function findCustomerIdByEmail(email: string): Promise<number | null> {
  const trimmedEmail = String(email ?? "").trim();
  if (!trimmedEmail) {
    return null;
  }

  try {
    const search = await requestPrestashopXml<any>("/customers", {
      query: {
        display: "[id]",
        "filter[email]": `[${trimmedEmail}]`,
      },
    });

    const first = asArray(search?.prestashop?.customers?.customer ?? [])[0];
    const existingId = Number(first?.["@_id"] ?? first?.id);
    if (Number.isFinite(existingId) && existingId > 0) {
      return existingId;
    }
  } catch {
    // Ignore lookup failure and fallback to creation flow.
  }

  return null;
}

export async function getClient(id: number): Promise<ClientForm & { id: number; date_add: string; date_upd: string; secure_key: string }> {
  const json = await requestPrestashopXml<CustomerGetResponse>(`/customers/${id}`);
  const customer = json.prestashop.customer;

  return {
    id,
    id_gender: numFromUnknown(customer.id_gender),
    id_default_group: numFromUnknown(customer.id_default_group) || 3,
    id_lang: numFromUnknown(customer.id_lang) || 1,
    firstname: textFromUnknown(customer.firstname),
    lastname: textFromUnknown(customer.lastname),
    email: textFromUnknown(customer.email),
    passwd: textFromUnknown(customer.passwd),
    secure_key: textFromUnknown(customer.secure_key),
    birthday: textFromUnknown(customer.birthday),
    active: boolFromUnknown(customer.active),
    newsletter: boolFromUnknown(customer.newsletter),
    optin: boolFromUnknown(customer.optin),
    company: textFromUnknown(customer.company),
    siret: textFromUnknown(customer.siret),
    ape: textFromUnknown(customer.ape),
    website: textFromUnknown(customer.website),
    note: textFromUnknown(customer.note),
    is_guest: boolFromUnknown(customer.is_guest),
    deleted: boolFromUnknown(customer.deleted),
    date_add: textFromUnknown(customer.date_add),
    date_upd: textFromUnknown(customer.date_upd),
  };
}

export async function createClientAddress(idCustomer: number, form: ClientAddressImportForm): Promise<number> {
  const res = await requestPrestashopXml<any>("/addresses", {
    query: {
      display: "full",
      "filter[id_customer]": `[${idCustomer}]`,

      "filter[firstname]": `[${form.firstname}]`,
      "filter[lastname]": `[${form.lastname}]`,
      "filter[address1]": `[${form.address1}]`,
      "filter[postcode]": `[${form.postcode}]`,
      "filter[city]": `[${form.city}]`,
      "filter[id_country]": `[${form.id_country}]`,

      limit: "1",
    },
  });

  const addresses = res?.prestashop?.addresses?.address;

  if (addresses) {
    const firstAddress = Array.isArray(addresses)
      ? addresses[0]
      : addresses;

    const existingId = Number(firstAddress?.id);

    if (Number.isFinite(existingId) && existingId > 0) {
      return existingId;
    }
  }
  // else
  const xml = buildPrestashopXml({
    prestashop: {
      address: {
        id_customer: idCustomer,
        alias: form.alias || `${form.firstname} ${form.lastname}`.trim() || "Adresse",
        firstname: form.firstname,
        lastname: form.lastname,
        company: form.company || "",
        vat_number: form.vat_number || "",
        address1: form.address1,
        address2: form.other || "",
        postcode: form.postcode,
        city: form.city,
        id_country: form.id_country,
        phone: form.phone || "",
        phone_mobile: form.phone_mobile || "",
      },
    },
  });

  const response = await requestPrestashopXml<{ prestashop: { address: { id: unknown } } }>("/addresses", {
    method: "POST",
    bodyXml: xml,
  });

  const id = Number(response?.prestashop?.address?.id);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Erreur lors de la création de l'adresse");
  }

  return id;
}

export type ClientForm = {
  id: number;
  id_gender: number;
  id_default_group: number;
  id_lang: number;
  firstname: string;
  lastname: string;
  email: string;
  passwd: string;
  birthday: string;
  active: boolean;
  newsletter: boolean;
  optin: boolean;
  company: string;
  siret: string;
  ape: string;
  website: string;
  note: string;
  is_guest: boolean;
  deleted: boolean;
  secure_key: string;

  outstanding_allow_amount?: number;
  show_public_prices?: boolean;
  id_risk?: number;
  max_payment_days?: number;
  id_shop?: number;
  id_shop_group?: number;
  newsletter_date_add?: string;
  ip_registration_newsletter?: string;
  reset_password_token?: string;
  reset_password_validity?: string;
  date_add?: string;
  date_upd?: string;
};

type CustomerGetResponse = {
  prestashop: {
    customer: {
      id?: unknown;
      id_shop_group?: unknown;
      id_shop?: unknown;
      secure_key?: unknown;
      reset_password_token?: unknown;
      reset_password_validity?: unknown;
      last_passwd_gen?: unknown;
      id_gender?: unknown;
      id_default_group?: unknown;
      id_lang?: unknown;
      id_risk?: unknown;
      company?: unknown;
      siret?: unknown;
      ape?: unknown;
      firstname?: unknown;
      lastname?: unknown;
      email?: unknown;
      passwd?: unknown;
      birthday?: unknown;
      newsletter?: unknown;
      newsletter_date_add?: unknown;
      ip_registration_newsletter?: unknown;
      optin?: unknown;
      website?: unknown;
      // Financial
      outstanding_allow_amount?: unknown;
      max_payment_days?: unknown;
      show_public_prices?: unknown;

      note?: unknown;
      active?: unknown;
      is_guest?: unknown;
      deleted?: unknown;
      date_add?: unknown;
      date_upd?: unknown;
      // Associations
      associations?: unknown;
    };
  };
};
export type ClientAddressForm = {
  firstname: string;
  lastname: string;
  address1: string;
  postcode: string;
  city: string;
  id_country: number;
};

export type ClientAddressImportForm = ClientAddressForm & {
  id_customer?: number;
  alias?: string;
  phone?: string;
  phone_mobile?: string;
  other?: string;
  company?: string;
  vat_number?: string;
};