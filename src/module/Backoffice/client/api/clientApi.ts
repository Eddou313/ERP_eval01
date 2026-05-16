import { buildPrestashopXml, requestPrestashopXml } from "../../../../utils/prestashopClient";
import {
    asArray,
    textFromUnknown,
    numFromUnknown,
    boolFromUnknown,
    toPrestashopBool,
} from "../../../../utils/helper";

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


export type ClientListItem = {
    id: number;
    title: string;
    firstname: string;
    lastname: string;
    fullName: string;
    email: string;
    secureKey: string;
    defaultGroupId: number;
    sales: string;
    active: boolean;
    newsletter: boolean;
    optin: boolean;
    registrationDate: string;
    lastVisitDate: string;
};



export type ClientForm = {
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

// export type ClientCreateForm = ClientForm;

// export type ClientImportForm = ClientImport;


export type ClientImport = {
    id_shop_group?: number;
    id_shop?: number;
    id_gender?: number;
    id_default_group?: number;
    id_lang?: number;
    id_risk?: number;
    company?: string;
    siret?: string;
    ape?: string;
    firstname: string;
    lastname: string;
    email: string;
    passwd: string;
    birthday: string;
    newsletter: boolean | number;
    newsletter_date_add?: string;
    ip_registration_newsletter?: string;
    optin: boolean | number;
    website: string;
    outstanding_allow_amount?: number;
    show_public_prices?: boolean | number;
    max_payment_days?: number;
    note: string;
    active: boolean | number;
    is_guest: boolean | number;
    deleted: boolean | number;
    reset_password_token?: string;
    reset_password_validity?: string;
    date_add?: string;
    date_upd?: string;
};

export const DEFAULT_CLIENT_FORM: ClientForm = {
    id_gender: 0,
    id_default_group: 3,
    id_lang: 1,
    firstname: "",
    lastname: "",
    email: "",
    passwd: "",
    birthday: "",
    active: true,
    newsletter: false,
    optin: false,
    company: "",
    siret: "",
    ape: "",
    outstanding_allow_amount: 0,
    show_public_prices: true,
    id_risk: 0,
    max_payment_days: 0,
    website: "",
    note: "",
    is_guest: false,
    deleted: false,
    id_shop: 1,
    id_shop_group: 1,
    newsletter_date_add: "",
    ip_registration_newsletter: "",
    reset_password_token: "",
    reset_password_validity: "",
    date_add: "",
    date_upd: "",
};

export function formatTitle(genderId: number): string {
    if (genderId === 1) return "M.";
    if (genderId === 2) return "Mme";
    return "-";
}

export async function listClientIds(): Promise<number[]> {
    const json = await requestPrestashopXml<{
        prestashop?: {
            customers?: {
                customer?:
                | Array<{ "@_id"?: number | string; id?: number | string }>
                | { "@_id"?: number | string; id?: number | string };
            };
        };
    }>("/customers", {
        query: { display: "[id]" },
    });

    const customers = json?.prestashop?.customers?.customer;
    return asArray(customers)
        .map((customer) => Number(customer["@_id"] ?? customer.id))
        .filter((id) => Number.isFinite(id) && id > 0);
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

export async function listClientsLight(limit?: number): Promise<ClientListItem[]> {
    const ids = await listClientIds();
    const slice = typeof limit === "number" ? ids.slice(0, limit) : ids;
    const customers = await Promise.all(slice.map((id) => getClient(id)));

    return customers.map((customer) => ({
        id: customer.id,
        title: formatTitle(customer.id_gender),
        firstname: customer.firstname,
        lastname: customer.lastname,
        fullName: `${customer.firstname} ${customer.lastname}`.trim(),
        email: customer.email,
        secureKey: customer.secure_key,
        defaultGroupId: customer.id_default_group,
        sales: "-",
        active: customer.active,
        newsletter: customer.newsletter,
        optin: customer.optin,
        registrationDate: customer.date_add,
        lastVisitDate: customer.date_upd,
    }));
}
export const DEFAULT_CLIENT_IMPORT: ClientImport = {
    id_shop_group: 1,
    id_shop: 1,
    id_gender: 0,
    id_default_group: 3,
    id_lang: 1,
    id_risk: 0,
    company: "",
    siret: "",
    ape: "",
    firstname: "",
    lastname: "",
    email: "",
    passwd: "",
    birthday: "",
    newsletter: 0,
    optin: 0,
    website: "",
    note: "",
    active: 1,
    is_guest: 0,
    deleted: 0,
};

function buildClientXml(form: ClientForm): string {
    const payload = {
        prestashop: {
            customer: {
                id_gender: form.id_gender,
                id_default_group: form.id_default_group,
                id_lang: form.id_lang,
                firstname: form.firstname,
                lastname: form.lastname,
                email: form.email,
                passwd: form.passwd,
                birthday: form.birthday,
                active: form.active ? 1 : 0,
                newsletter: form.newsletter ? 1 : 0,
                optin: form.optin ? 1 : 0,
                company: form.company,
                siret: form.siret,
                ape: form.ape,
                website: form.website,
                note: form.note,
                is_guest: form.is_guest ? 1 : 0,
                deleted: form.deleted ? 1 : 0,
            },
        },
    };

    return buildPrestashopXml(payload);
}

function buildClientImportXml(form: ClientImport): string {
    const password = form.passwd.trim();
    if (!password) {
        throw new Error("Le mot de passe est obligatoire pour l'import client.");
    }

    const payload = {
        prestashop: {
            customer: {
                id_shop_group: form.id_shop_group,
                id_shop: form.id_shop,
                id_gender: form.id_gender,
                id_default_group: form.id_default_group,
                id_lang: form.id_lang,
                id_risk: form.id_risk,
                company: form.company,
                siret: form.siret,
                ape: form.ape,
                firstname: form.firstname,
                lastname: form.lastname,
                email: form.email,
                passwd: password,
                birthday: form.birthday,
                newsletter: toPrestashopBool(form.newsletter),
                optin: toPrestashopBool(form.optin),
                website: form.website,
                note: form.note,
                active: toPrestashopBool(form.active),
                is_guest: toPrestashopBool(form.is_guest),
                deleted: toPrestashopBool(form.deleted),
                ...(form.date_add ? { date_add: form.date_add } : {}),
                ...(form.date_upd ? { date_upd: form.date_upd } : {}),
            },
        },
    };

    return buildPrestashopXml(payload);
}

export async function createClient(form: ClientForm): Promise<number> {
    const xml = buildClientXml(form);
    const response = await requestPrestashopXml<{ prestashop: { customer: { id: unknown } } }>(
        "/customers",
        { method: "POST", bodyXml: xml },
    );

    const id = Number(response?.prestashop?.customer?.id);
    if (!Number.isFinite(id) || id <= 0) {
        throw new Error("Erreur lors de la création du client");
    }

    return id;
}

export async function importClient(form: ClientImport): Promise<number> {
    const xml = buildClientImportXml(form);
    console.debug("PrestaShop import customer XML:", xml);
    try {
        const response = await requestPrestashopXml<{ prestashop: { customer: { id: unknown } } }>(
            "/customers",
            { method: "POST", bodyXml: xml },
        );

        const id = Number(response?.prestashop?.customer?.id);
        if (!Number.isFinite(id) || id <= 0) {
            throw new Error("Erreur lors de l'import du client");
        }

        return id;
    } catch (err: any) {
        // If error indicates email already used, try to find existing customer by email
        try {
            const email = String(form.email || "").trim();
            if (email) {
                const search = await requestPrestashopXml<any>("/customers", {
                    query: { display: "[id]", [`filter[email]`]: `[${email}]` },
                });
                const customers = search?.prestashop?.customers?.customer;
                const list = asArray(customers || []);
                const first = list[0];
                const existingId = Number(first?.["@_id"] ?? first?.id);
                if (Number.isFinite(existingId) && existingId > 0) {
                    console.warn(`Client existant trouvé pour l'email ${email}, utilisation de l'ID ${existingId}`);
                    return existingId;
                }
            }
        } catch (searchErr) {
            // ignore and rethrow original error below
        }

        throw err;
    }
}

export async function updateClient(id: number, form: ClientForm): Promise<void> {
    const xml = buildClientXml(form);
    await requestPrestashopXml(`/customers/${id}`, {
        method: "PUT",
        bodyXml: xml,
    });
}

export async function deleteClient(id: number): Promise<void> {
    await requestPrestashopXml(`/customers/${id}`, {
        method: "DELETE",
    });
}

export async function initClients(): Promise<void> {
    // const confirmed = window.confirm("Vous etes sur de supprimer tous les clients ?");
    // if (!confirmed) return;
    try {
        const ids = await listClientIds();
        await Promise.all(ids.map((id) => 
        {
            if(id>1)
            {
                deleteClient(id)
            }
        }));
        console.log("Tous les clients ont été supprimés.");

    } catch (caught: any) {
        console.log(caught?.message ?? "Erreur lors de l'initialisation des clients");
    }
}
import {saveClientSession} from "../../../FrontOffice/client/api/clientAPI";
export async function createSession(id:number): Promise<boolean>
{
    try
    {
        const client = await getClient(id);
        if(!client)  return false;
        saveClientSession({
            id: textFromUnknown(client.id),
            email: textFromUnknown(client.email),
            prenom: textFromUnknown(client.firstname),
            nom: textFromUnknown(client.lastname),
            token: textFromUnknown(client.secure_key) 
          });
        return true;
    }
    catch(e:any)
    {
        console.error(`Erreur lors de la creation session : ${e.message}`);
        return false;
    }
} 