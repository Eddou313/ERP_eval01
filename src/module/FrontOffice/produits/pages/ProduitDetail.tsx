import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { IconHeart, IconShoppingCart } from "@tabler/icons-react";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { formatPrice, getProductBySlug } from "../data";
import "./produits.css";

export function ProduitDetail() {
    const { slug } = useParams();
    const product = useMemo(() => getProductBySlug(slug), [slug]);
    const [selectedImage, setSelectedImage] = useState(product.gallery[0]);
    const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
    const [selectedColor, setSelectedColor] = useState(product.featuredColor);

    useEffect(() => {
        setSelectedImage(product.gallery[0]);
        setSelectedSize(product.sizes[0]);
        setSelectedColor(product.featuredColor);
    }, [product]);

    const finalPrice = formatPrice(product.price);
    const oldPrice = product.oldPrice ? formatPrice(product.oldPrice) : null;

    return (
        <div className="productsPage">
            <FrontOfficeHeader />

            <main className="productDetailShell">
                <section className="productDetailGrid">
                    <div className="detailMedia">
                        <div className="detailHero">
                            <img src={selectedImage} alt={product.name} className="detailImage" />
                            <div className="badgesStack detailBadges">
                                {product.badges.map((badge) => (
                                    <span key={badge.label} className={`badge badge-${badge.tone}`}>
                                        {badge.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="detailThumbnails" aria-label="Galerie du produit">
                            {product.gallery.map((image) => (
                                <button
                                    key={image}
                                    type="button"
                                    className={`thumbnailButton ${selectedImage === image ? "isActive" : ""}`}
                                    onClick={() => setSelectedImage(image)}
                                    aria-label="Voir l'image du produit"
                                >
                                    <img src={image} alt="Miniature du produit" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="detailContent">
                        <p className="productCategory productCategoryDetail">{product.category}</p>
                        <h1 className="detailTitle">{product.name.toUpperCase()}</h1>

                        <div className="detailPriceRow">
                            {oldPrice ? <span className="detailOldPrice">{oldPrice}</span> : null}
                            <span className="detailPrice">{finalPrice}</span>
                            {product.oldPrice ? (
                                <span className="discountTag">ÉCONOMISEZ 20%</span>
                            ) : null}
                        </div>

                        <p className="taxLabel">TTC</p>
                        <p className="detailDescription">{product.description}</p>

                        <div className="optionBlock">
                            <p className="optionLabel">Taille : <strong>{selectedSize}</strong></p>
                            <div className="sizeGroup">
                                {product.sizes.map((size) => (
                                    <button
                                        key={size}
                                        type="button"
                                        className={`optionButton ${selectedSize === size ? "isSelected" : ""}`}
                                        onClick={() => setSelectedSize(size)}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="optionBlock">
                            <p className="optionLabel">Couleur : <strong>{selectedColor}</strong></p>
                            <div className="colorGroup">
                                {product.colors.map((color) => (
                                    <button
                                        key={color.name}
                                        type="button"
                                        className={`colorSwatch ${selectedColor === color.name ? "isSelected" : ""}`}
                                        style={{ backgroundColor: color.value }}
                                        onClick={() => setSelectedColor(color.name)}
                                        aria-label={color.name}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="quantityRow">
                            <label className="quantityField">
                                <span>Quantité</span>
                                <input type="number" min="1" defaultValue="1" />
                            </label>

                            <button type="button" className="addToCartButton">
                                <IconShoppingCart size={18} /> AJOUTER AU PANIER
                            </button>

                            <button type="button" className="favoriteButton" aria-label="Ajouter aux favoris">
                                <IconHeart size={20} />
                            </button>
                        </div>

                        <div className="shareRow">
                            <span>Partager</span>
                            <button type="button" className="shareButton">f</button>
                            <button type="button" className="shareButton">t</button>
                            <button type="button" className="shareButton">p</button>
                        </div>

                        <section className="assuranceCards">
                            <article className="assuranceCard">
                                <div className="assuranceIcon">🔒</div>
                                <div>
                                    <h2>Garanties sécurité</h2>
                                    <p>(à modifier dans le module “Réassurance”)</p>
                                </div>
                            </article>

                            <article className="assuranceCard">
                                <div className="assuranceIcon">🚚</div>
                                <div>
                                    <h2>Politique de livraison</h2>
                                    <p>Livraison suivie et emballage soigné sur l’ensemble du catalogue.</p>
                                </div>
                            </article>
                        </section>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default ProduitDetail;