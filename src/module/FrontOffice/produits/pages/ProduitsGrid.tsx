import { getProductImageUrl, withTax, formatCurrency } from "../../../../utils/helper";
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
          key={(product as any).combination_id ? `${product.id}-${(product as any).combination_id}` : product.id}
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
              const dateStr = product.available_date  || "";
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
              {(() => {
                const taxRate = Number(product.tax_rate ?? 20) || 0;
                // Use `price_ht` when available (HT), otherwise fall back to `price`.
                // `price` from the API for simple products is already the final price (TTC),
                // while combination entries set `price` to HT earlier. Prioritize `price_ht` to avoid double-taxing.
                const priceHt = Number((product as any).price_ht ?? product.price ?? 0) || 0;
                const priceTtc = withTax(priceHt, taxRate);
                return (
                  <>
                    <span className="currentPrice">{formatCurrency(priceTtc)}</span>
                    {(product as any).wholesale_price !== undefined && (product as any).wholesale_price !== null ? (
                      <span className="wholesalePrice">Achat: {formatCurrency(Number((product as any).wholesale_price) || 0)}</span>
                    ) : null}
                  </>
                );
              })()}
              <span className="currentPrice">date de disponibilité: {product.available_date || product.date_add}</span>
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