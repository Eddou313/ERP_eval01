import { Link } from "react-router-dom";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { formatPrice, products } from "../data";
import "./produits.css";

export function ProduitsList() {
    return (
        <div className="productsPage">
            <FrontOfficeHeader />

            <main className="productsShell">
                <section className="productsIntro">
                    <p className="eyebrow">Catalogue statique</p>
                    <h1>Produits en vitrine</h1>
                    <p className="introText">
                        Une sélection de produits cliquables construite pour reproduire la
                        logique d’un catalogue e-commerce simple.
                    </p>
                </section>

                <section className="productsGrid" aria-label="Liste des produits">
                    {products.map((product) => (
                        <Link key={product.slug} to={`/produits/${product.slug}`} className="productCard">
                            <div className="productImageWrap">
                                <img className="productImage" src={product.image} alt={product.name} />
                                <div className="badgesStack">
                                    {product.badges.map((badge) => (
                                        <span key={badge.label} className={`badge badge-${badge.tone}`}>
                                            {badge.label}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="productInfo">
                                <p className="productCategory">{product.category}</p>
                                <h2 className="productName">{product.name}</h2>

                                <div className="priceRow">
                                    {product.oldPrice ? <span className="oldPrice">{formatPrice(product.oldPrice)}</span> : null}
                                    <span className="price">{formatPrice(product.price)}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </section>
            </main>
        </div>
    );
}

export default ProduitsList;