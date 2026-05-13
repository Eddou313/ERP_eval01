import {  requestPrestashopXml } from "../../utils/prestashopClient";
import Papa from 'papaparse';
import { type CategoryListItem, deleteCategory, listCategoriesLight } from "../../module/Backoffice/categorie/api/categoriesApi";

import { listClientsLight,} from "../../module/Backoffice/client/api/clientApi";
import { deleteAddress, listClientAddressesLight } from "../../module/Backoffice/client/api/clientAdresAPI";
import { deleteCart, listCartsLight } from "../../module/Backoffice/panier/api/panierApi";
import { deleteOrder, listOrdersLight } from "../../module/Backoffice/commande/api/commandesApi";
import { listAttributeGroupsLight, listAttributeValuesLight, listFeatureGroupsLight, listFeatureValuesLight } from "../../module/Backoffice/attribue&Caracteristique/api/attributsCaracteristiquesApi";
import { deleteProduct, listProductsLight } from "../../module/Backoffice/produit/api/productsApi";
import { deleteClient } from "../../module/Backoffice/client/api/clientApi";
// import { ensureTaxExists, listTaxesLight } from "../../module/Backoffice/taxes/api/taxe";
/**
 * @param file Le fichier récupéré depuis l'input
 * @param separator Le caractère délimiteur (ex: , ou ;)
 * @param onComplete Callback appelé avec les données castées dans le bon type
 */

export type colonneCSV = {
        produitImport : {
            date_availability_produit: string;
            nom	:string;
            reference : string;
            prix_ttc : number;
            Taxe : string;
            categorie : string; 
            prix_achat :number;
        },

        produit_Attribut_StockImport:{
            reference : string;	
            specificité	: string ;
            karazany : string;
            stock_initial : number;
            prix_vente_ttc : number;
        };

        Commande_client_produit:{
            date: string;	
            nom	: string;
            email: string;
            pwd	: string;
            adresse	: string;
            achat : string;
            etat :string;
        }
    }

export type ImportDataType = keyof colonneCSV;

// Convertir les nombres français (virgule) en nombres JavaScript (point)
const convertFrenchNumbersInObject = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(item => convertFrenchNumbersInObject(item));
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            if (typeof value === 'string') {
                // Convertir "12,5" en 12.5 si c'est un nombre
                const trimmed = value.trim();
                const converted = trimmed.replace(',', '.');
                // Vérifier si c'est un nombre valide
                if (!isNaN(Number(converted)) && converted !== '' && converted.match(/^-?\d+\.?\d*$/)) {
                    acc[key] = Number(converted);
                } else {
                    acc[key] = value;
                }
            } else if (typeof value === 'object') {
                acc[key] = convertFrenchNumbersInObject(value);
            } else {
                acc[key] = value;
            }
            return acc;
        }, {} as any);
    }
    return obj;
};

export const parseCSVFile = <T>(
    file: File, 
    separator: string, 
    onComplete: (data: T[]) => void
) => {
    Papa.parse(file, {
        delimiter: separator,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            console.log("Données CSV brutes:", results.data);
            // Convertir les nombres français et filtrer les lignes vides
            const cleanedData = (results.data as any[])
                .filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined))
                .map(row => convertFrenchNumbersInObject(row)) as T[];
            console.log("Données nettoyées et converties:", cleanedData);
            onComplete(cleanedData);
        },
        error: (error) => {
            console.error("Erreur lors du parsing CSV:", error.message);
        }
    });
};

// Initialiser toutes les données globales
export async function InitialisationGLobal(): Promise<void> {
  try {
    console.log("Initialisation globale en cours...");

        const [categories, products, clients, addresses, orders, carts, attributeGroups, attributeValues, featureGroups, featureValues] = await Promise.all([
            listCategoriesLight().catch(() => [] as CategoryListItem[]),
            listProductsLight().catch(() => []),
            listClientsLight().catch(() => []),
            listClientAddressesLight().catch(() => []),
            listOrdersLight().catch(() => []),
            listCartsLight().catch(() => []),
            listAttributeGroupsLight().catch(() => [] as any[]),
            listAttributeValuesLight().catch(() => [] as any[]),
            listFeatureGroupsLight().catch(() => [] as any[]),
            listFeatureValuesLight().catch(() => [] as any[]),
        ]);

        console.log("Suppression des stocks... (ignorée : PrestaShop n'autorise pas toujours DELETE sur stock_availables)");


        const failures: string[] = [];
        console.log("Suppression des commandes...");
        await Promise.all(orders.map(async (item: { id: number }) => {
            try {
                await deleteOrder(item.id);
            } catch (err: any) {
                failures.push(`order:${item.id} -> ${err?.status ?? 'error'} ${err?.responseText ?? err?.message ?? ''}`);
            }
        }));

        console.log("Suppression des paniers...");
        await Promise.all(carts.map(async (item: { id: number }) => {
            try {
                await deleteCart(item.id);
            } catch (err: any) {
                failures.push(`cart:${item.id} -> ${err?.status ?? 'error'} ${err?.responseText ?? err?.message ?? ''}`);
            }
        }));

        console.log("Suppression des adresses...");
        await Promise.all(addresses.map(async (item: { id: number }) => {
            try {
                await deleteAddress(item.id);
            } catch (err: any) {
                failures.push(`address:${item.id} -> ${err?.status ?? 'error'} ${err?.responseText ?? err?.message ?? ''}`);
            }
        }));

        console.log("Suppression des clients...");
        await Promise.all(clients.map(async (item: { id: number }) => {
            try {
                await deleteClient(item.id);
            } catch (err: any) {
                failures.push(`client:${item.id} -> ${err?.status ?? 'error'} ${err?.responseText ?? err?.message ?? ''}`);
            }
        }));

        console.log("Suppression des valeurs d'attributs...");
        await Promise.all(attributeValues.map(async (item: any) => {
            try {
                await requestPrestashopXml(`/product_option_values/${item.id}`, { method: 'DELETE' });
            } catch (err: any) {
                failures.push(`attrValue:${item.id} -> ${err?.status ?? 'error'} ${err?.responseText ?? err?.message ?? ''}`);
            }
        }));

        console.log("Suppression des groupes d'attributs...");
        await Promise.all(attributeGroups.map(async (item: any) => {
            try {
                await requestPrestashopXml(`/product_options/${item.id}`, { method: 'DELETE' });
            } catch (err: any) {
                failures.push(`attrGroup:${item.id} -> ${err?.status ?? 'error'} ${err?.responseText ?? err?.message ?? ''}`);
            }
        }));

        console.log("Suppression des valeurs de caractéristiques...");
        await Promise.all(featureValues.map(async (item: any) => {
            try {
                await requestPrestashopXml(`/product_feature_values/${item.id}`, { method: 'DELETE' });
            } catch (err: any) {
                failures.push(`featureValue:${item.id} -> ${err?.status ?? 'error'} ${err?.responseText ?? err?.message ?? ''}`);
            }
        }));

        console.log("Suppression des caractéristiques...");
        await Promise.all(featureGroups.map(async (item: any) => {
            try {
                await requestPrestashopXml(`/product_features/${item.id}`, { method: 'DELETE' });
            } catch (err: any) {
                failures.push(`featureGroup:${item.id} -> ${err?.status ?? 'error'} ${err?.responseText ?? err?.message ?? ''}`);
            }
        }));

        console.log("Suppression des produits...");
        await Promise.all(products.map(async (item: { id: number }) => {
            try {
                await deleteProduct(item.id);
            } catch (err: any) {
                failures.push(`product:${item.id} -> ${err?.status ?? 'error'} ${err?.responseText ?? err?.message ?? ''}`);
            }
        }));

        console.log("Suppression des catégories...");
        await Promise.all(categories.filter((category: CategoryListItem) => category.id > 2).map(async (category: CategoryListItem) => {
            try {
                await deleteCategory(category.id);
            } catch (err: any) {
                failures.push(`category:${category.id} -> ${err?.status ?? 'error'} ${err?.responseText ?? err?.message ?? ''}`);
            }
        }));

        if (failures.length > 0) {
            console.error('Initialisation partielle, erreurs rencontrées :', failures);
            throw new Error(`Initialisation partielle : ${failures.length} erreurs. Voir la console pour les détails.`);
        }

        console.log("Initialisation globale réussie !");
  } catch (error: any) {
    console.error("Erreur lors de l'initialisation globale:", error);
    throw new Error(`Erreur lors de l'initialisation global: ${error?.message ?? String(error)}`);
  }
}