import { useEffect, useState } from "react";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { getStoredClientSession } from "../../client/api/clientAPI";
import {getOrCreateGuestCart,getLatestCartForCustomerId,getCart,createCart} from "../../../Backoffice/panier/api/panierApi";
import {type CartDetail} from "../../../Backoffice/panier/api/object";
import { createCommande, DEFAULT_ORDER_FORM, updateOrderState } from "../../../Backoffice/commande/api/commandesApi";
import { createClientAddress, type ClientAddressImportForm } from "../../../Backoffice/client/api/clientAdresAPI";
import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import { asArray, textFromUnknown } from "../../../../utils/helper";
import "./WorkFlowCommande.css";
import { getAllModeLivraison, PRIX_LIVRAISON_STANDARD } from "../../../Backoffice/Livraison/api/LivraisonApi";
import {  type ModeLivraisonListItem } from "../../../Backoffice/Livraison/api/object";
import { PAYMENT_METHODS, type PaymentMethod } from "../../../Backoffice/paiement/api/PaiementApi";
import { useNavigate } from "react-router-dom";

type AddressMode = "existing" | "new";

type NewAddressForm = ClientAddressImportForm & {
	useForBilling: boolean;
};

const DEFAULT_NEW_ADDRESS: NewAddressForm = {
	firstname: "Test",
	lastname: "TestTest",
	company: "",
	vat_number: "",
	address1: "",
	other: "",
	postcode: "",
	city: "",
	id_country: 0,
	alias: "",
	phone: "",
	phone_mobile: "",
	id_customer: 0,
	useForBilling: true,
};

export default function WorkFlowCommande() {
	const [cart, setCart] = useState<CartDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [creatingOrder, setCreatingOrder] = useState(false);
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(PAYMENT_METHODS[0] || null);
	const [addressMode, setAddressMode] = useState<AddressMode>("existing");
	const [addresses, setAddresses] = useState<Array<{ id: number; label: string }>>([]);
	const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
	const [countryIdFrance, setCountryIdFrance] = useState<number>(0);
	const [newAddress, setNewAddress] = useState<NewAddressForm>(DEFAULT_NEW_ADDRESS);

	const [ModeLivraison, setModeLivraison] = useState<ModeLivraisonListItem[]>([]);
	const [selectedModeLivraisonId, setSelectedModeLivraisonId] = useState<number>(0);
	const [shippingPrice] = useState<number>(PRIX_LIVRAISON_STANDARD);
	const [clearCartAfterOrder] = useState<boolean>(true);
	const navigate = useNavigate();

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const session = getStoredClientSession();
				let current: CartDetail | null = null;
				if (session && Number(session.id) > 0) {
					current = await getLatestCartForCustomerId(Number(session.id));
				}
				if (!current) {
					current = await getOrCreateGuestCart();
				}
				setCart(current);

				if (session && Number(session.id) > 0) {
					try {
						const [addressesResponse, countriesResponse] = await Promise.all([
							requestPrestashopXml<any>("/addresses", {
								query: { display: "full", ["filter[id_customer]"]: `[${Number(session.id)}]` },
							}),
							requestPrestashopXml<any>("/countries", {
								query: { display: "full" },
							}),
						]);

						const rawAddresses = addressesResponse?.prestashop?.addresses?.address;
						const loadedAddresses = asArray(rawAddresses)
							.map((address: any) => {
								const id = Number(address["@_id"] ?? address.id) || 0;
								const label = `${textFromUnknown(address.address1)} ${textFromUnknown(address.postcode)} ${textFromUnknown(address.city)}`.trim();
								return { id, label };
							})
							.filter((entry: any) => entry.id > 0);

						setAddresses(loadedAddresses);
						if (loadedAddresses.length > 0) {
							setSelectedAddressId(loadedAddresses[0].id);
							setAddressMode("existing");
						} else {
							setAddressMode("new");
						}

						const countries = asArray(countriesResponse?.prestashop?.countries?.country);
						const france = countries.find((country: any) => {
							const countryName = textFromUnknown(country?.name);
							return countryName.toLowerCase().includes("france");
						});
						const franceId = Number(france?.["@_id"] ?? france?.id) || 0;
						setCountryIdFrance(franceId);
						setNewAddress((currentValue) => ({ ...currentValue, id_country: franceId || currentValue.id_country }));


						const modeLivraisonResponse = await getAllModeLivraison(5);
						setModeLivraison(modeLivraisonResponse);
					} catch (e) {
						console.warn("Impossible de charger les adresses utilisateur", e);
					}
				}
			} catch (e) {
				console.error("Erreur chargement panier pour workflow:", e);
			} finally {
				setLoading(false);
			}
		};

		load();
	}, []);

	const total = cart ? Number(cart.total || cart.total_products || 0) : 0;
	const grandTotal = Number(total + shippingPrice);
	const canCreateOrder = Boolean(
		cart &&
		getStoredClientSession() &&
		selectedModeLivraisonId > 0 &&
		paymentMethod &&
		shippingPrice >= 0 &&
		(addressMode === "existing" ? selectedAddressId && selectedAddressId > 0 : newAddress.firstname.trim() && newAddress.lastname.trim() && newAddress.address1.trim() && newAddress.postcode.trim() && newAddress.city.trim())
	);

	const handleConfirm = () => {
		if (!cart) return alert("Panier introuvable");
		const session = getStoredClientSession();
		if (!session) return alert("Veuillez vous connecter pour confirmer la commande.");
		if (!paymentMethod) return alert("Veuillez choisir une méthode de paiement.");
		if (!selectedModeLivraisonId) return alert("Veuillez choisir un mode de livraison.");

		(async () => {
			let freshCart: CartDetail | null = null;
			let cartItems: CartDetail["items"] = [];
			let cartTotalProducts = 0;
			let shippingCost = 0;
			let orderGrandTotal = 0;
			let deliveryAddressId = 1;
			let invoiceAddressId = 1;
			let form: any = null;

			try {
				setCreatingOrder(true);

				// === RÈGLE PROPRE ===
				// 1. Récupérer le cart frais
				freshCart = await getCart(cart.id);

				// 2. Récupérer les produits du cart
				cartItems = freshCart.items || [];

				// 3. Calculer les totaux à partir des produits
				cartTotalProducts = cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
				shippingCost = Number(shippingPrice) || 0;
				orderGrandTotal = cartTotalProducts + shippingCost;

				// nouvelle adresse ? -> créer l'adresse et récupérer son ID
				if (addressMode === "new") {
					if (!newAddress.firstname.trim() || !newAddress.lastname.trim() || !newAddress.address1.trim() || !newAddress.postcode.trim() || !newAddress.city.trim()) {
						alert("Veuillez remplir les champs obligatoires de la nouvelle adresse.");
						return;
					}

					const createdAddressId = await createClientAddress(Number(session.id), {
						...newAddress,
						id_customer: Number(session.id),
						alias: newAddress.alias || `${newAddress.firstname} ${newAddress.lastname}`.trim(),
						other: newAddress.other || "",
						id_country: newAddress.id_country || countryIdFrance || 0,
					});
					deliveryAddressId = createdAddressId;
					invoiceAddressId = newAddress.useForBilling ? createdAddressId : 0;
				} else {
					deliveryAddressId = Number(selectedAddressId || 0);
					invoiceAddressId = Number(selectedAddressId || 0);
				}

				if (!deliveryAddressId) {
					alert("Veuillez sélectionner ou créer une adresse de livraison.");
					return;
				}

				if (!invoiceAddressId) {
					invoiceAddressId = deliveryAddressId;
				}

				console.debug("=== Order Totals ===");
				console.debug("Cart Items:", cartItems.length);
				console.debug("Total Products:", cartTotalProducts);
				console.debug("Shipping Cost:", shippingCost);
				console.debug("Grand Total:", orderGrandTotal);

				form = {
					...DEFAULT_ORDER_FORM,
					id_customer: Number(session.id),
					id_cart: freshCart.id,
					id_lang: 1,
					id_currency: 1,
					id_carrier: selectedModeLivraisonId,
					id_address_delivery: deliveryAddressId,
					id_address_invoice: invoiceAddressId || deliveryAddressId,
					payment: paymentMethod.label,
					module: paymentMethod.code,
					current_state: 1,
					total_paid: orderGrandTotal,
					total_paid_real: orderGrandTotal,
					total_products: cartTotalProducts,
					total_products_wt: cartTotalProducts,
					total_shipping: shippingCost,
					total_shipping_tax_incl: shippingCost,
					total_shipping_tax_excl: shippingCost,
					total_paid_tax_incl: orderGrandTotal,
					total_paid_tax_excl: orderGrandTotal,
					conversion_rate: 1,
					valid: false,
					note: "",
					gift: false,
					gift_message: "",
					payment_code: paymentMethod.code,
					// Transmettre les lignes de commande (associations) minimalistes
					order_rows: cartItems.map((item) => ({ product_id: item.product_id, product_quantity: item.quantity })),
				};

				const orderId = await createCommande(form);
				// await updateOrderState(orderId, 1);

				if (clearCartAfterOrder) {
				setCart(null);
			}

				console.log(`Commande créée (ID: ${orderId}) — total: ${orderGrandTotal.toFixed(2)} €`);
				navigate(`/Mescommande`);
			} catch (err: any) {
				const errorMessage = String(err?.message || err || "");
				if (errorMessage.includes('idShop') || errorMessage.includes('id_shop')) {
					try {
						if (!freshCart || !form) {
							throw new Error("Contexte de commande incomplet pour le retry");
						}

					const retryCart = await createCart({
						id_customer: Number(session.id),
						id_lang: form.id_lang,
						id_currency: form.id_currency,
						id_address_delivery: deliveryAddressId,
						id_address_invoice: invoiceAddressId || deliveryAddressId,
						id_carrier: selectedModeLivraisonId,
						id_shop: 1,
						id_shop_group: 1,
						items: cartItems.map((item) => ({
							id_product: item.product_id,
							id_product_attribute: item.id_product_attribute,
							quantity: item.quantity,
						})),
					});
						const retryTotalProducts = retryCart.items.reduce((sum, item) => sum + (item.total || 0), 0);
						const retryGrandTotal = retryTotalProducts + shippingCost;
						const retryForm = {
							...form,
						id_cart: retryCart.id,
							total_paid: retryGrandTotal,
							total_paid_tax_incl: retryGrandTotal,
							total_paid_tax_excl: retryGrandTotal,
							total_paid_real: retryGrandTotal,
							total_products: retryTotalProducts,
							total_products_wt: retryTotalProducts,
							order_rows: retryCart.items.map((item) => ({ product_id: item.product_id, product_quantity: item.quantity })),
						};

						const retryOrderId = await createCommande(retryForm);
						const dateJ = new Date().toISOString().split("T")[0];
						await updateOrderState(retryOrderId, 1,dateJ);
						if (clearCartAfterOrder) {

							setCart(null);
						}
						// alert(`Commande recréée (ID: ${retryOrderId}) — total: ${retryGrandTotal.toFixed(2)} €`);
						navigate(`/Mescommande`);
						return;
					} catch (retryErr: any) {
						console.error("Erreur création commande (retry):", retryErr);
						alert("Erreur lors de la création de la commande: " + (retryErr?.message || String(retryErr)));
						return;
					}
				}
				console.error("Erreur création commande:", err);
				alert("Erreur lors de la création de la commande: " + (err?.message || String(err)));
			} finally {
				setCreatingOrder(false);
			}
		})();
	};

	return (
		<div className="workflow-root">
			<FrontOfficeHeader />
			<div className="workflow-container">
				<div className="workflow-card">
					<h3>Validation de la commande</h3>

					{loading && <p>Chargement...</p>}

					{!loading && (
						<div className="workflow-steps">
							<div className="step">
								<div className="step-title">1. Adresse de livraison</div>
								<div className="step-body">
									<div className="address-mode-switch">
										<label>
											<input
												type="radio"
												name="addressMode"
												checked={addressMode === "existing"}
												onChange={() => setAddressMode("existing")}
											/>
											Utiliser une adresse existante
										</label>
										<label>
											<input
												type="radio"
												name="addressMode"
												checked={addressMode === "new"}
												onChange={() => setAddressMode("new")}
											/>
											Créer une nouvelle adresse
										</label>
									</div>

									{addressMode === "existing" ? (
										<select
											className="workflow-select"
											value={String(selectedAddressId ?? "new")}
											onChange={(e) => {
												const value = e.target.value;
												if (value === "new") {
													setSelectedAddressId(null);
												} else {
													setSelectedAddressId(Number(value));
												}
											}}
										>
											{addresses.map((address) => (
												<option key={address.id} value={address.id}>
													{address.label}
												</option>
											))}
											<option value="new">Nouvelle adresse...</option>
										</select>
									) : (
										<div className="new-address-form">
											<div className="form-grid">
												<div className="field">
													<label>Alias <span>Optionnel</span></label>
													<input
														value={newAddress.alias}
														onChange={(e) => setNewAddress((currentValue) => ({ ...currentValue, alias: e.target.value }))}
														placeholder="Maison, Travail..."
													/>
												</div>
												<div className="field">
													<label>Prénom</label>
													<input
														value={newAddress.firstname}
														onChange={(e) => setNewAddress((currentValue) => ({ ...currentValue, firstname: e.target.value }))}
													/>
												</div>
												<div className="field">
													<label>Nom</label>
													<input
														value={newAddress.lastname}
														onChange={(e) => setNewAddress((currentValue) => ({ ...currentValue, lastname: e.target.value }))}
													/>
												</div>
												<div className="field">
													<label>Société <span>Optionnel</span></label>
													<input
														value={newAddress.company}
														onChange={(e) => setNewAddress((currentValue) => ({ ...currentValue, company: e.target.value }))}
													/>
												</div>
												<div className="field">
													<label>Numéro de TVA <span>Optionnel</span></label>
													<input
														value={newAddress.vat_number || ""}
														onChange={(e) => setNewAddress((currentValue) => ({ ...currentValue, vat_number: e.target.value }))}
													/>
												</div>
												<div className="field field-wide">
													<label>Adresse</label>
													<input
														value={newAddress.address1}
														onChange={(e) => setNewAddress((currentValue) => ({ ...currentValue, address1: e.target.value }))}
													/>
												</div>
												<div className="field field-wide">
													<label>Complément d'adresse <span>Optionnel</span></label>
													<input
														value={newAddress.other || ""}
														onChange={(e) => setNewAddress((currentValue) => ({ ...currentValue, other: e.target.value }))}
													/>
												</div>
												<div className="field">
													<label>Code postal</label>
													<input
														value={newAddress.postcode}
														onChange={(e) => setNewAddress((currentValue) => ({ ...currentValue, postcode: e.target.value }))}
													/>
												</div>
												<div className="field">
													<label>Ville</label>
													<input
														value={newAddress.city}
														onChange={(e) => setNewAddress((currentValue) => ({ ...currentValue, city: e.target.value }))}
													/>
												</div>
												<div className="field">
													<label>Pays</label>
													<select
														value={String(newAddress.id_country || countryIdFrance || 0)}
														onChange={(e) => setNewAddress((currentValue) => ({ ...currentValue, id_country: Number(e.target.value) }))}
													>
														<option value={String(countryIdFrance || 0)}>France</option>
													</select>
												</div>
												<div className="field">
													<label>Téléphone <span>Optionnel</span></label>
													<input
														value={newAddress.phone || ""}
														onChange={(e) => setNewAddress((currentValue) => ({ ...currentValue, phone: e.target.value }))}
													/>
												</div>
											</div>
											<label className="billing-check">
												<input
													type="checkbox"
													checked={newAddress.useForBilling}
													onChange={(e) => setNewAddress((currentValue) => ({ ...currentValue, useForBilling: e.target.checked }))}
												/>
												Utiliser aussi cette adresse pour la facturation
											</label>
										</div>
									)}
								</div>
							</div>

							<div className="step">
								<div className="step-title">2. Méthode de livraison</div>
								<div className="step-body">
									<select
										className="workflow-select"
										value={selectedModeLivraisonId}
										onChange={(e) =>
											setSelectedModeLivraisonId(Number(e.target.value))
										}
									>
										<option value={0}>
											Sélectionner un mode de livraison
										</option>

										{ModeLivraison.map((mode) => (
											<option key={mode.id} value={mode.id}>
												{mode.name}
											</option>
										))}
									</select>
									{/* <div className="field" style={{ marginTop: 12 }}>
										<label>Prix de livraison</label>
										<input
											type="number"
											min={0}
											step="0.01"
											value={shippingPrice}
											onChange={(e) => setShippingPrice(Math.max(0, Number(e.target.value) || 0))}
										/>
									</div> */}
								</div>
							</div>

							<div className="step">
								<div className="step-title">3. Méthode de paiement</div>
								<div className="step-body">
									<select className="workflow-select" value={paymentMethod?.code || PAYMENT_METHODS[0]?.code || ""} onChange={(e) => setPaymentMethod(PAYMENT_METHODS.find((m) => m.code === e.target.value) || null)}>
										{PAYMENT_METHODS.map((m) => (
											<option key={m.code} value={m.code}>
												{m.label}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="step">
								<div className="step-title">4. Confirmation</div>
								<div className="step-body">
									<div className="workflow-total">
										<strong>Sous-total produits:</strong> {total.toFixed(2)} €
									</div>
									<div className="workflow-total">
										<strong>Livraison:</strong> {shippingPrice.toFixed(2)} €
									</div>
									<div className="workflow-total">
										<strong>Total commande:</strong> {grandTotal.toFixed(2)} €
									</div>
									<div className="workflow-total">
										<strong>Adresse livraison:</strong> {String(selectedAddressId ?? "nouvelle adresse")}
									</div>
									{/* <label className="billing-check" style={{ display: "block", marginBottom: 12 }}>
										<input
											type="checkbox"
											checked={clearCartAfterOrder}
											onChange={(e) => setClearCartAfterOrder(e.target.checked)}
										/>
										Vider le panier après la commande
									</label> */}
									<button className="confirm-button" onClick={handleConfirm} disabled={creatingOrder || !canCreateOrder}>
										{creatingOrder ? "Création..." : "Confirmer la commande"}
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
