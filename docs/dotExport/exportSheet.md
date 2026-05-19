## dependance
npm install xlsx
## exemple
import React from 'react';
import * as XLSX from 'xlsx';

interface DataItem {
    reference: string;
    quantity: number;
    variant: string;
}

interface ExportExcelButtonProps {
    data: DataItem[];
}

const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({ data }) => {
    const exportToExcel = () => {
        // 1. Créer un nouveau classeur (Workbook)
        const workbook = XLSX.utils.book_new();

        // --- FEUILLE 1 : Résumé / Métriques ---
        const totalItems = data.length;
        const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);
        
        const summaryData = [
            { 'Indicateur': 'Nombre total de références', 'Valeur': totalItems },
            { 'Indicateur': 'Quantité totale commandée', 'Valeur': totalQuantity },
            { 'Indicateur': 'Date de génération', 'Valeur': new Date().toLocaleDateString() }
        ];
        const worksheetSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, worksheetSummary, 'Résumé');

        // --- FEUILLE 2 : Détails des données ---
        // Optionnel : On peut renommer les clés pour avoir de beaux en-têtes de colonnes
        const detailedData = data.map(item => ({
            'Référence Produit': item.reference,
            'Quantité': item.quantity,
            'Variante / Option': item.variant || 'Aucune'
        }));
        
        const worksheetDetails = XLSX.utils.json_to_sheet(detailedData);
        XLSX.utils.book_append_sheet(workbook, worksheetDetails, 'Détails Achats');

        // 2. Générer le fichier Excel et déclencher le téléchargement
        XLSX.writeFile(workbook, 'export_complet.xlsx');
    };

    return (
        <button 
            onClick={exportToExcel}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
            Exporter en Excel (Multi-feuilles)
        </button>
    );
};

export default ExportExcelButton;