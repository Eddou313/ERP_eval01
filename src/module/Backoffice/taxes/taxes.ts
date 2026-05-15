import { buildPrestashopXml, requestPrestashopXml } from "../../../utils/prestashopClient";
import { asArray, languageField, textFromUnknown, normalizeText } from "../../../utils/helper";

type CreatedTax = { id: number; name: string; rate: number };


const DEFAULT_LANGUAGE_ID = 1;

const formatTaxLabel = (rate: number): string => {
    const formattedRate = Number.isInteger(rate)
        ? rate.toFixed(0)
        : rate.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return `TVA ${formattedRate}%`;
};

const rateKey = (rate: number): string => rate.toFixed(4);

export const  listTaxesLight = async (): Promise<CreatedTax[]> => {
    try {
        const response = await requestPrestashopXml<any>('/taxes', { query: { display: 'full' } });
        const items = asArray(response?.prestashop?.taxes?.tax);
        return items
            .map((item: any) => ({
                id: Number(item?.id ?? item?.['@_id'] ?? 0),
                name: textFromUnknown(item?.name),
                rate: Number(textFromUnknown(item?.rate) || 0),
            }))
            .filter((item) => Number.isFinite(item.id) && item.id > 0);
    } catch {
        return [];
    }
};

export const ensureTaxExists = async (
    taxRate: number,
    cache: Map<string, number>,
    taxes: CreatedTax[],
): Promise<number> => {
    const key = rateKey(taxRate);
    const cached = cache.get(key);
    if (cached) {
        return cached;
    }

    const taxLabel = formatTaxLabel(taxRate);

    let tax = taxes.find((item) => Math.abs(item.rate - taxRate) < 0.0001 || normalizeText(item.name ?? '') === normalizeText(taxLabel));
    if (!tax) {
        const createdTax = await requestPrestashopXml<{ prestashop: { tax: { id: unknown } } }>('/taxes', {
            method: 'POST',
            bodyXml: buildPrestashopXml({
                prestashop: {
                    tax: {
                        name: languageField(taxLabel, DEFAULT_LANGUAGE_ID),
                        rate: taxRate,
                        active: 1,
                    },
                },
            }),
        });

        const taxId = Number(createdTax?.prestashop?.tax?.id);
        if (!Number.isFinite(taxId) || taxId <= 0) {
            throw new Error(`Impossible de créer la taxe ${taxLabel}`);
        }

        tax = { id: taxId, name: taxLabel, rate: taxRate };
        taxes.push(tax);
    }

    cache.set(key, tax.id);
    return tax.id;
};