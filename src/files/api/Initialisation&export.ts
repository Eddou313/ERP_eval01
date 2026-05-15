import { InitAttributesAndCharacteristics } from "../../module/Backoffice/attribue&Caracteristique/api/attributsCaracteristiquesApi";
import { InitCategory } from "../../module/Backoffice/categorie/api/categoriesApi";
import { InitAdresse } from "../../module/Backoffice/client/api/clientAdresAPI";
import { initClients } from "../../module/Backoffice/client/api/clientApi";
import { InitOrder } from "../../module/Backoffice/commande/api/commandesApi";
import { initPanier } from "../../module/Backoffice/panier/api/panierApi";
import { InitProducts } from "../../module/Backoffice/produit/api/productsApi";
import Papa from 'papaparse';
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
        console.log("Suppression des commandes...");
        await InitOrder();

        console.log("Suppression des paniers...");
        await initPanier();

        console.log("Suppression des adresses...");
        await InitAdresse();

        console.log("Suppression des clients...");
        await initClients();

        console.log("Suppression des valeurs d'attributs...");
        await InitAttributesAndCharacteristics();

        console.log("Suppression des produits...");
        await InitProducts();

        console.log("Suppression des catégories...");
        await InitCategory();

        console.log("Initialisation globale réussie !");
  } catch (error: any) {
    console.error("Erreur lors de l'initialisation globale:", error);
    throw new Error(`Erreur lors de l'initialisation global: ${error?.message ?? String(error)}`);
  }
}
