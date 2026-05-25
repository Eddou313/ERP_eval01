## depeendace 
`
npm install jspdf jspdf-autotable
`
import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DataItem {
    reference: string;
    quantity: number;
    variant: string;
}

interface ExportPdfButtonProps {
    data: DataItem[];
}

const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({ data }) => {
    const exportToPdf = () => {
        // 1. Initialiser le document PDF (A4, portrait)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // 2. Ajouter un titre
        doc.setFontSize(18);
        doc.text('Rapport des Achats', 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Généré le : ${new Date().toLocaleDateString()}`, 14, 26);

        // 3. Préparer les données pour le tableau
        const tableHeaders = [['Référence', 'Quantité', 'Variante']];
        const tableRows = data.map(item => [item.reference, item.quantity, item.variant || '-']);

        // 4. Générer le tableau avec autoTable
        autoTable(doc, {
            startY: 32,
            head: tableHeaders,
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 3 },
        });

        // 5. Sauvegarder le fichier
        doc.save('rapport_achats.pdf');
    };

    return (
        <button 
            onClick={exportToPdf}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
            Exporter en PDF
        </button>
    );
};

export default ExportPdfButton;
