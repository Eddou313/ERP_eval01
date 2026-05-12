import bcrypt from "bcryptjs";
import { textFromUnknown } from "../../../../utils/helper";
import { requestPrestashopXml } from "../../../../utils/prestashopClient";

export type ClientSession = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  token: string;
  expiresAt: number; 
};

export const CLIENT_STORAGE_KEY = "evaluation01.client.session";
const SESSION_DURATION = 2 * 60 * 60 * 1000;

export function getStoredClientSession(): ClientSession | null {
  const rawSession = window.localStorage.getItem(CLIENT_STORAGE_KEY);
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as ClientSession;
  } catch {
    return null;
  }
}

export function saveClientSession(sessionData: Omit<ClientSession, 'expiresAt'>): void {
  const session: ClientSession = {
    ...sessionData,
    expiresAt: Date.now() + SESSION_DURATION
  };
  window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(session));
}

export function logoutClient(): void {
  window.localStorage.removeItem(CLIENT_STORAGE_KEY);
}

interface PrestashopCustomerResponse {
  prestashop: {
    customers: {
      customer: any; // On peut typer plus précisément si nécessaire
    }
  }
}

export async function checUser(gmail: string,pwd:string): Promise<boolean> {
  try {
    const response = await requestPrestashopXml<PrestashopCustomerResponse>("/customers", {
      query: {
        display: "full",
        "filter[email]": `[${gmail}]`,
        // limit: "1"
      }
    });
    const customers = response?.prestashop?.customers?.customer;

    if (!customers) {
      console.warn("Aucun utilisateur trouvé avec cet email.");
      return false;
    }

    const customerList = Array.isArray(customers) ? customers : [customers];

    for(const customer of customerList) 
    {
      if(customer.email === gmail) 
      {
        const isValidPassword = await bcrypt.compare(pwd, customer.passwd);
        const customerData = customer;
        if(isValidPassword) {
          // 2. Création de la session avec des données réelles
          saveClientSession({
            id: textFromUnknown(customerData.id),
            email: textFromUnknown(customerData.email),
            prenom: textFromUnknown(customerData.firstname),
            nom: textFromUnknown(customerData.lastname),

            token: textFromUnknown(customerData.secure_key) 
          });
          return isValidPassword;
        }
      }
    }
    return false;
  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    return false;
  }
}
