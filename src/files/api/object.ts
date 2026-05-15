
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
export const DEFAULT_LANGUAGE_ID = 1;
export const DEFAULT_SHOP_ID = 1;
export const DEFAULT_SHOP_GROUP_ID = 1;
