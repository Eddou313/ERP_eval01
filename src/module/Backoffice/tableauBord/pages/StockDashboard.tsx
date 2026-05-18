import React from "react";

type StockItem = {
  categorie: string;
  qtePhysique: number;
  qteReservee: number;
  qteDisponible: number;
};

const stockData: StockItem[] = [
  { categorie: "Téléphones", qtePhysique: 120, qteReservee: 30, qteDisponible: 90 },
  { categorie: "Ordinateurs", qtePhysique: 80, qteReservee: 12, qteDisponible: 68 },
  { categorie: "Accessoires", qtePhysique: 200, qteReservee: 50, qteDisponible: 150 },
];

export  function StockDashboard() {
  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "15px" }}>État du stock</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#fff",
        }}
      >
        <thead>
          <tr style={{ background: "#f2f2f2" }}>
            <th style={thStyle}>Catégorie</th>
            <th style={thStyle}>Qté physique</th>
            <th style={thStyle}>Qté réservé</th>
            <th style={thStyle}>Qté disponible</th>
          </tr>
        </thead>

        <tbody>
          {stockData.map((item, index) => (
            <tr key={index} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={tdStyle}>{item.categorie}</td>
              <td style={tdStyle}>{item.qtePhysique}</td>
              <td style={tdStyle}>{item.qteReservee}</td>
              <td style={tdStyle}>{item.qteDisponible}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "2px solid #ccc",
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
};