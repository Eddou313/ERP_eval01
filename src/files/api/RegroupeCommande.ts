import type { colonneCSV } from "./object";

type ProduitAchat = {
  reference: string;
  quantite: number;
  fournisseur: string;
};

type Commande = colonneCSV["Commande_client_produit"];

function parseAchat(achat: string): ProduitAchat[] {
  if (!achat) return [];

  // IMPORTANT : ([^"]*) et non +
  const regex = /\("([^"]*)"\s*;\s*(\d+)\s*;\s*"([^"]*)"\)/g;

  const produits: ProduitAchat[] = [];

  let match: RegExpExecArray | null;

  while ((match = regex.exec(achat)) !== null) {
    produits.push({
      reference: match[1],
      quantite: Number(match[2]),
      fournisseur: match[3],
    });
  }

  return produits;
}

function buildAchat(produits: ProduitAchat[]): string {
  return (
    "[" +
    produits
      .map(
        (p) =>
          `("${p.reference}";${p.quantite};"${p.fournisseur}")`
      )
      .join(",") +
    "]"
  );
}

export function regrouperCommandes(commandes: Commande[]): Commande[] {
  const map = new Map<string,Commande & { produits: ProduitAchat[] }>();

  for (const cmd of commandes) {
    const key = [
      cmd.date,
      cmd.nom,
      cmd.email,
      cmd.pwd,
      cmd.adresse,
      cmd.etat,
    ].join("|");

    const produits = parseAchat(cmd.achat);

    if (!map.has(key)) {
      map.set(key, {
        ...cmd,
        produits: [...produits],
      });

      continue;
    }

    const existing = map.get(key)!;

    for (const produit of produits) {
      const exist = existing.produits.find(
        (p) =>
          p.reference === produit.reference &&
          p.fournisseur === produit.fournisseur
      );

      if (exist) {
        exist.quantite += produit.quantite;
      } else {
        existing.produits.push({ ...produit });
      }
    }
  }

  return Array.from(map.values()).map((cmd) => ({
    date: cmd.date,
    nom: cmd.nom,
    email: cmd.email,
    pwd: cmd.pwd,
    adresse: cmd.adresse,
    etat: cmd.etat,
    achat: buildAchat(cmd.produits),
  }));
}