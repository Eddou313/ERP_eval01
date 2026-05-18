import React, { useState, useMemo } from 'react';

// --- INTERFACES ---
interface VenteCategorie {
  id: string;
  nom: string;
  totalVentes: number;
  totalAchats: number;
}

// --- DONNÉES FICTIVES (Pour le test) ---
const DONNEES_INITIALES: VenteCategorie[] = [
  { id: '1', nom: 'Électronique', totalVentes: 15400, totalAchats: 9200 },
  { id: '2', nom: 'Vêtements & Mode', totalVentes: 8900, totalAchats: 4100 },
  { id: '3', nom: 'Maison & Cuisine', totalVentes: 12100, totalAchats: 7800 },
  { id: '4', nom: 'Livres & Papeterie', totalVentes: 3200, totalAchats: 1500 },
  { id: '5', nom: 'Sports & Loisirs', totalVentes: 6500, totalAchats: 4800 },
];

export function StockDashboard(){
  const [data] = useState<VenteCategorie[]>(DONNEES_INITIALES);
  const [recherche, setRecherche] = useState<string>('');

  // --- CALCULS DES TOTAUX GLOBAUX ---
  const globaux = useMemo(() => {
    return data.reduce(
      (acc, curr) => {
        const benefice = curr.totalVentes - curr.totalAchats;
        return {
          ventes: acc.ventes + curr.totalVentes,
          achats: acc.achats + curr.totalAchats,
          benefice: acc.benefice + benefice,
        };
      },
      { ventes: 0, achats: 0, benefice: 0 }
    );
  }, [data]);

  // --- FILTRE DES CATÉGORIES ---
  const categoriesFiltrees = useMemo(() => {
    return data.filter((cat) =>
      cat.nom.toLowerCase().includes(recherche.toLowerCase())
    );
  }, [data, recherche]);

  // --- FORMATEUR DE DEVISE ---
  const formaterPrix = (valeur: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(valeur);
  };

  return (
    <div style={styles.contenant}>
      <header style={styles.enTete}>
        <h1 style={styles.titrePrincipal}>Tableau de Bord des Statistiques</h1>
        <p style={styles.sousTitre}>Analyse des ventes, achats et bénéfices par catégorie de produits.</p>
      </header>

      {/* --- CARTES DE VUE D'ENSEMBLE --- */}
      <section style={styles.grilleCartes}>
        <div style={styles.carte}>
          <span style={styles.carteTitre}>Montant Total des Ventes</span>
          <span style={{ ...styles.carteValeur, color: '#2563eb' }}>
            {formaterPrix(globaux.ventes)}
          </span>
        </div>
        <div style={styles.carte}>
          <span style={styles.carteTitre}>Montant Total d'Achats</span>
          <span style={{ ...styles.carteValeur, color: '#dc2626' }}>
            {formaterPrix(globaux.achats)}
          </span>
        </div>
        <div style={styles.carte}>
          <span style={styles.carteTitre}>Bénéfice Global</span>
          <span style={{ ...styles.carteValeur, color: globaux.benefice >= 0 ? '#16a34a' : '#dc2626' }}>
            {formaterPrix(globaux.benefice)}
          </span>
        </div>
      </section>

      {/* --- SECTION TABLEAU & FILTRE --- */}
      <section style={styles.sectionTableau}>
        <div style={styles.barreAction}>
          <h2 style={styles.titreSection}>Détails par Catégorie</h2>
          <input
            type="text"
            placeholder="Rechercher une catégorie..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={styles.champRecherche}
          />
        </div>

        <div style={styles.contenantTableau}>
          <table style={styles.tableau}>
            <thead>
              <tr style={styles.thLigne}>
                <th style={styles.th}>Catégorie</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Total Ventes</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Total Achats</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Bénéfice Net</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Marge</th>
              </tr>
            </thead>
            <tbody>
              {categoriesFiltrees.length > 0 ? (
                categoriesFiltrees.map((cat) => {
                  const benefice = cat.totalVentes - cat.totalAchats;
                  const marge = cat.totalVentes > 0 ? (benefice / cat.totalVentes) * 100 : 0;
                  const estPositif = benefice >= 0;

                  return (
                    <tr key={cat.id} style={styles.trBody}>
                      <td style={{ ...styles.td, fontWeight: 600, color: '#1f2937' }}>{cat.nom}</td>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#2563eb' }}>{formaterPrix(cat.totalVentes)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#4b5563' }}>{formaterPrix(cat.totalAchats)}</td>
                      <td style={{ 
                        ...styles.td, 
                        textAlign: 'right', 
                        fontWeight: 600, 
                        color: estPositif ? '#16a34a' : '#dc2626' 
                      }}>
                        {formaterPrix(benefice)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: estPositif ? '#dcfce7' : '#fee2e2',
                          color: estPositif ? '#15803d' : '#991b1b'
                        }}>
                          {marge.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={styles.tdVide}>Aucune catégorie trouvée</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// --- STYLES CSS-IN-JS ---
const styles: { [key: string]: React.CSSProperties } = {
  contenant: {
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    padding: '2rem',
    color: '#334155',
  },
  enTete: {
    marginBottom: '2rem',
  },
  titrePrincipal: {
    fontSize: '1.875rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 0.5rem 0',
  },
  sousTitre: {
    fontSize: '0.975rem',
    color: '#64748b',
    margin: 0,
  },
  grilleCartes: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2.5rem',
  },
  carte: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #e2e8f0',
  },
  carteTitre: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  },
  carteValeur: {
    fontSize: '1.75rem',
    fontWeight: 700,
  },
  sectionTableau: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  barreAction: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  titreSection: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
  },
  champRecherche: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.875rem',
    width: '260px',
    outline: 'none',
  },
  contenantTableau: {
    overflowX: 'auto',
  },
  tableau: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thLigne: {
    backgroundColor: '#f8fafc',
  },
  th: {
    padding: '1rem 1.5rem',
    fontSize: '0.815rem',
    fontWeight: 650,
    color: '#475569',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e2e8f0',
  },
  trBody: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '1rem 1.5rem',
    fontSize: '0.925rem',
    verticalAlign: 'middle',
  },
  badge: {
    padding: '0.25rem 0.625rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-block',
  },
  tdVide: {
    padding: '3rem',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.925rem',
  }
};