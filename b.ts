// Dans importProduitCommandeCsv, remplacer :

// ── 2. Créer le panier ──
const { cartId, addressId } = await createCart(customer.id, cmd.adresse);
cartsCreated++;

// ── 3. Ajouter TOUS les produits en un seul PUT ──
await addProductsToCart(cartId, produits, cmd.date, customer.id, addressId);

// ─────────────────────────────────────────────
// Et modifier createCart pour retourner aussi addressId :
// ─────────────────────────────────────────────

