import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import { asArray, numFromUnknown, textFromUnknown } from "../../../../utils/helper";
export type AddressGetResponse = {
    prestashop: {
        address: {
            id?: unknown;
            firstname?: unknown;
            lastname?: unknown;
            address1?: unknown;
            postcode?: unknown;
            city?: unknown;
            id_country?: unknown;
        };
    };
};

export type CountryGetResponse = {
    prestashop: {
        country: {
            name?: {
                language?:
                    | { "@_id"?: number | string; "#text"?: string }
                    | Array<{ "@_id"?: number | string; "#text"?: string }>;
            };
        };
    };
};

export type ClientAddressListItem = {
    id: number;
    firstname: string;
    lastname: string;
    address: string;
    postcode: string;
    city: string;
    countryId: number;
    country: string;
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

export async function listAddressIds(): Promise<number[]> {
    const json = await requestPrestashopXml<{
        prestashop?: {
            addresses?: {
                address?:
                    | Array<{ "@_id"?: number | string; id?: number | string }>
                    | { "@_id"?: number | string; id?: number | string };
            };
        };
    }>("/addresses", {
        query: { display: "[id]" },
    });

    const addresses = json?.prestashop?.addresses?.address;
    return asArray(addresses)
        .map((address) => Number(address["@_id"] ?? address.id))
        .filter((id) => Number.isFinite(id) && id > 0);
}

export async function getAddress(id: number): Promise<ClientAddressListItem> {
    const json = await requestPrestashopXml<AddressGetResponse>(`/addresses/${id}`);
    const address = json.prestashop.address;

    return {
        id,
        firstname: textFromUnknown(address.firstname),
        lastname: textFromUnknown(address.lastname),
        address: textFromUnknown(address.address1),
        postcode: textFromUnknown(address.postcode),
        city: textFromUnknown(address.city),
        countryId: numFromUnknown(address.id_country),
        country: "-",
    };
}

async function getCountryName(countryId: number): Promise<string> {
    if (!countryId) return "-";
    const json = await requestPrestashopXml<CountryGetResponse>(`/countries/${countryId}`);
    const language = asArray(json?.prestashop?.country?.name?.language);
    const first = language[0];
    return textFromUnknown(first?.["#text"]) || `Pays #${countryId}`;
}

export async function listClientAddressesLight(limit?: number): Promise<ClientAddressListItem[]> {
    const ids = await listAddressIds();
    const slice = typeof limit === "number" ? ids.slice(0, limit) : ids;
    const addresses = await Promise.all(slice.map((id) => getAddress(id)));

    const uniqueCountryIds = Array.from(new Set(addresses.map((entry) => entry.countryId).filter((id) => id > 0)));
    const countryNames = await Promise.all(
        uniqueCountryIds.map(async (id) => {
            try {
                const name = await getCountryName(id);
                return [id, name] as const;
            } catch {
                return [id, `Pays #${id}`] as const;
            }
        }),
    );
    const countryNameMap = new Map<number, string>(countryNames);

    return addresses.map((entry) => ({
        ...entry,
        country: countryNameMap.get(entry.countryId) ?? (entry.countryId > 0 ? `Pays #${entry.countryId}` : "-"),
    }));
}

export async function deleteAddress(id: number): Promise<void> {
    await requestPrestashopXml(`/addresses/${id}`, {
        method: "DELETE",
    });
}

export async function InitAdresse(items: ClientAddressListItem[]): Promise<void> 
{
    const confirmed = window.confirm("Vous etes sur de supprimer tous les adresses ?");
    if (!confirmed) return;
    try{
        await Promise.all(items.map((entry) => deleteAddress(entry.id)));
    }
    catch (caught: any) {
        console.error("Erreur lors de l'initialisation des adresses :", caught);
    }
}