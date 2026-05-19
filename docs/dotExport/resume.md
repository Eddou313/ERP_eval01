4. Exemple d'intégration globale
Voici comment regrouper tous ces boutons sur une seule et même page de votre application.

App.tsx / PageImport.tsx
TypeScript
import React from 'react';
import ExportCsvButton from './ExportCsvButton';
import ExportPdfButton from './ExportPdfButton';
import ExportExcelButton from './ExportExcelButton';

const mockData = [
    { reference: "T_01", quantity: 2, variant: "kely" },
    { reference: "C_03", quantity: 1, variant: "" },
    { reference: "B_12", quantity: 5, variant: "rouge" },
];

const PageExportDonnees: React.FC = () => {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Gestion des Exports de Données</h1>
            <p className="text-gray-600 mb-6">
                Sélectionnez le format d'export souhaité pour vos données d'achats actuelles.
            </p>

            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 border rounded-lg">
                <ExportCsvButton data={mockData} />
                <ExportPdfButton data={data=mockData} />
                <ExportExcelButton data={mockData} />
            </div>
        </div>
    );
};

export default PageExportDonnees;
"""

with open("guide_exports_react_ts.md", "w", encoding="utf-8") as f:
f.write(markdown_content)
print("Markdown guide generated successfully.")

Voici le guide complet au format Markdown (`.md`) prêt à être intégré dans ton projet. Il contient les explications, les dépendances à installer et le code source complet en **React + TypeScript** pour chaque type d'export (CSV natif, PDF structuré avec tableau, et Excel contenant plusieurs feuilles/onglets).

Votre fichier Markdown (`.md`) est prêt :
[file-tag: code-generated-file-0-1779170922771596601]

---

### Aperçu rapide des solutions choisies dans le guide :

1. **Export CSV (Sans librairie externe) :**
   Utilise l'API native `Blob` du navigateur. Ajoute automatiquement le BOM UTF-8 (`\uFEFF`) et utilise le point-virgule (`;`) comme séparateur afin qu'Excel en version française l'ouvre directement avec les bonnes colonnes et les bons accents.

2. **Export PDF (Avec `jspdf` & `jspdf-autotable`) :**
   C'est le combo le plus stable et standard en React/TS pour créer des PDF propres contenant des tableaux de données (sans risque de décalage de mise en page).

3. **Export Excel Multi-feuilles (Avec `xlsx` / SheetJS) :**
   Utilise `xlsx` qui permet de créer un classeur (`Workbook`), puis d'y injecter plusieurs feuilles (`Worksheet`). Dans le code fourni, une première feuille **"Résumé"** calcule des indicateurs globaux (totaux) et une deuxième feuille **"Détails Achats"** liste l'intégralité de tes lignes de données.