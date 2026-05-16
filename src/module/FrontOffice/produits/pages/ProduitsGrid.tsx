import { getProductImageUrl } from "../../../../utils/helper";
import type { ProductListItem } from "../../../Backoffice/produit/api/object";

type ProduitsGridProps = {
  products: ProductListItem[];
  onProductClick: (product: ProductListItem) => void;
};

function ProduitsGrid({ products, onProductClick }: ProduitsGridProps) {
  return (
    <div className="productsGrid">
      {products.map((product) => (
        <div
          key={product.id}
          className="productCard"
          onClick={() => onProductClick(product)}
          style={{ cursor: "pointer" }}
        >
          <div className="productImageWrap">
            {product.id_default_image ? (
              <img
                src={getProductImageUrl(product.id, product.id_default_image)}
                alt={product.name}
                className="productImage"
                onError={(event) => {
                  (event.target as HTMLImageElement).src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="250"%3E%3Crect fill="%23f0f0f0" width="250" height="250"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                }}
              />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250" className="productImage">
                <rect fill="#f0f0f0" width="250" height="250" />
                <text x="50%" y="50%" textAnchor="middle" dy=".3em" fill="#999" fontSize="14">
                  No Image
                </text>
              </svg>
            )}
            {(() => {
              const dateStr = product.available_date || product.date_add || "";
              if (!dateStr) return null;

              const date = new Date(dateStr);
              if (Number.isNaN(date.getTime())) return null;

              const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);

              if (diffDays <= 1) {
                return (
                  <div className="badgesStack">
                    <span className="hotBadge">HOT</span>
                  </div>
                );
              }

              if (diffDays <= 7) {
                return (
                  <div className="badgesStack" style={{ top: 4, left: 4 }}>
                    <span className="newBadge">NEW</span>
                  </div>
                );
              }

              return null;
            })()}
          </div>

          <div className="productCardContent">
            <h3 className="productName">{product.name || "Produit sans nom"}</h3>
            <p className="productReference">{product.reference}</p>
            <div className="productPricing">
              <span className="currentPrice">€{(product.price || 0).toFixed(2)}</span>
            </div>
            {product.quantity && product.quantity > 0 ? (
              <span className="inStock">
                En stock <span className="lowStockWarning"> {product.quantity}</span>
              </span>
            ) : (
              <span className="outOfStock">Rupture de stock</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProduitsGrid;