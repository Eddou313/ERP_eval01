import { buildPrestashopXml, requestPrestashopXml } from "../../../utils/prestashopClient";
import { asArray, languageField, textFromUnknown, normalizeText } from "../../../utils/helper";

type CreatedTax = { id: number; name: string; rate: number };
type CreatedTaxRuleGroup = { id: number; name: string; active: boolean };


const DEFAULT_LANGUAGE_ID = 1;
const DEFAULT_COUNTRY_ID = 8;

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

export const listTaxRuleGroupsLight = async (): Promise<CreatedTaxRuleGroup[]> => {
    try {
        const response = await requestPrestashopXml<any>('/tax_rule_groups', { query: { display: 'full' } });
        const items = asArray(response?.prestashop?.tax_rule_groups?.tax_rule_group);
        return items
            .map((item: any) => ({
                id: Number(item?.id ?? item?.['@_id'] ?? 0),
                name: textFromUnknown(item?.name),
                active: textFromUnknown(item?.active) === '1',
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

export const ensureTaxRuleGroupExists = async (
    groupName: string,
    cache: Map<string, number>,
    groups: CreatedTaxRuleGroup[],
): Promise<number> => {
    const normalizedName = textFromUnknown(groupName).trim();
    if (!normalizedName) {
        throw new Error('Le nom du tax rule group est vide');
    }

    const key = normalizeText(normalizedName);
    const cached = cache.get(key);
    if (cached) {
        return cached;
    }

    let group = groups.find((item) => normalizeText(item.name ?? '') === key);
    if (!group) {
        const createdGroup = await requestPrestashopXml<{ prestashop: { tax_rule_group: { id: unknown } } }>('/tax_rule_groups', {
            method: 'POST',
            bodyXml: buildPrestashopXml({
                prestashop: {
                    tax_rule_group: {
                        name: languageField(normalizedName, DEFAULT_LANGUAGE_ID),
                        active: 1,
                    },
                },
            }),
        });

        const groupId = Number(createdGroup?.prestashop?.tax_rule_group?.id);
        if (!Number.isFinite(groupId) || groupId <= 0) {
            throw new Error(`Impossible de créer le tax rule group ${normalizedName}`);
        }

        group = { id: groupId, name: normalizedName, active: true };
        groups.push(group);
    }

    cache.set(key, group.id);
    return group.id;
};

export const ensureTaxRuleExists = async (
    taxRuleGroupId: number,
    taxId: number,
    taxRate: number,
    cache: Map<string, number>,
    description: string,
    countryId = DEFAULT_COUNTRY_ID,
): Promise<number> => {
    const key = `${taxRuleGroupId}:${taxId}:${countryId}:${taxRate.toFixed(4)}`;
    const cached = cache.get(key);
    if (cached) {
        return cached;
    }

    const createdRule = await requestPrestashopXml<{ prestashop: { tax_rule: { id: unknown } } }>('/tax_rules', {
        method: 'POST',
        bodyXml: buildPrestashopXml({
            prestashop: {
                tax_rule: {
                    id_tax_rules_group: taxRuleGroupId,
                    id_tax: taxId,
                    id_country: countryId,
                    id_state: 0,
                    zipcode_from: 0,
                    zipcode_to: 0,
                    behavior: 0,
                    description,
                },
            },
        }),
    });

    const ruleId = Number(createdRule?.prestashop?.tax_rule?.id);
    if (!Number.isFinite(ruleId) || ruleId <= 0) {
        throw new Error(`Impossible de créer la règle de taxe ${description}`);
    }

    cache.set(key, ruleId);
    return ruleId;
};

/**
 * Supprime toutes les taxes (tax rules, tax rule groups, puis taxes)
 */
export async function InitTaxes(): Promise<void> {
    try {
        // 1. Supprimer tous les tax rules
        try {
            const taxRulesResponse = await requestPrestashopXml<any>('/tax_rules', { query: { display: 'full' } });
            const taxRules = asArray(taxRulesResponse?.prestashop?.tax_rules?.tax_rule);
            for (const rule of taxRules) {
                const ruleId = Number(rule?.id ?? rule?.['@_id']);
                if (ruleId > 0) {
                    try {
                        await requestPrestashopXml(`/tax_rules/${ruleId}`, { method: 'DELETE' });
                    } catch (err) {
                        console.warn(`Impossible de supprimer la tax rule ${ruleId}:`, err);
                    }
                }
            }
        } catch (err) {
            console.warn("Erreur lors de la suppression des tax rules:", err);
        }

        // 2. Supprimer tous les tax rule groups
        try {
            const groupsResponse = await requestPrestashopXml<any>('/tax_rule_groups', { query: { display: 'full' } });
            const groups = asArray(groupsResponse?.prestashop?.tax_rule_groups?.tax_rule_group);
            for (const group of groups) {
                const groupId = Number(group?.id ?? group?.['@_id']);
                if (groupId > 0) {
                    try {
                        await requestPrestashopXml(`/tax_rule_groups/${groupId}`, { method: 'DELETE' });
                    } catch (err) {
                        console.warn(`Impossible de supprimer le tax rule group ${groupId}:`, err);
                    }
                }
            }
        } catch (err) {
            console.warn("Erreur lors de la suppression des tax rule groups:", err);
        }

        // 3. Supprimer toutes les taxes
        try {
            const taxesResponse = await requestPrestashopXml<any>('/taxes', { query: { display: 'full' } });
            const taxes = asArray(taxesResponse?.prestashop?.taxes?.tax);
            for (const tax of taxes) {
                const taxId = Number(tax?.id ?? tax?.['@_id']);
                if (taxId > 0) {
                    try {
                        await requestPrestashopXml(`/taxes/${taxId}`, { method: 'DELETE' });
                    } catch (err) {
                        console.warn(`Impossible de supprimer la taxe ${taxId}:`, err);
                    }
                }
            }
        } catch (err) {
            console.warn("Erreur lors de la suppression des taxes:", err);
        }

        console.log("Toutes les taxes ont été supprimées.");
    } catch (error: any) {
        console.error("Erreur lors de l'initialisation des taxes:", error);
    }
}