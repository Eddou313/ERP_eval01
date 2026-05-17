
export type colonneCSV = {
    produitImport: {
        date_availability_produit: string;
        nom: string;
        reference: string;
        prix_ttc: number;
        Taxe: string;
        categorie: string;
        prix_achat: number;
    },

    produit_Attribut_StockImport: {
        reference: string;
        specificité: string;
        karazany: string;
        stock_initial: number;
        prix_vente_ttc: number;
    };

    Commande_client_produit: {
        date: string;
        nom: string;
        email: string;
        pwd: string;
        adresse: string;
        achat: string;
        etat: string;
    }
}
export type ImportDataType = keyof colonneCSV;
export const PRODUIT_IMPORT_COLUMNS = [
    "date_availability_produit",
    "nom",
    "reference",
    "prix_ttc",
    "Taxe",
    "categorie",
    "prix_achat",
] as const;

export const PRODUIT_IMPORT_DATE_COLUMNS = ["date_availability_produit"] as const;
export const PRODUIT_IMPORT_POSITIVE_NUMBER_COLUMNS = ["prix_ttc", "prix_achat"] as const;

export const PRODUIT_ATTRIBUT_STOCK_IMPORT_COLUMNS = [
    "reference",
    "specificité",
    "karazany",
    "stock_initial",
    "prix_vente_ttc",
] as const;
export const PRODUIT_ATTRIBUT_STOCK_POSITIVE_NUMBER_COLUMNS = ["stock_initial", "prix_vente_ttc"] as const;

export const COMMANDE_CLIENT_PRODUIT_COLUMNS = [
    "date",
    "nom",
    "email",
    "pwd",
    "adresse",
    "achat",
    "etat",
] as const;

export const COMMANDE_CLIENT_PRODUIT_DATE_COLUMNS = ["date"] as const;

export const DEFAULT_LANGUAGE_ID = 1;
export const DEFAULT_SHOP_ID = 1;
export const DEFAULT_SHOP_GROUP_ID = 1;
