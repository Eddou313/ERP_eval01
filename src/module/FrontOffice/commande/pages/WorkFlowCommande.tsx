import { useEffect, useState } from "react";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { getStoredClientSession } from "../../client/api/clientAPI";
import {
	getOrCreateGuestCart,
	getLatestCartForCustomerId,
	type CartDetail,
} from "../../../Backoffice/panier/api/panierApi";
import { createOrder, DEFAULT_ORDER_FORM } from "../../../Backoffice/commande/api/commandesApi";
import { createClientAddress, type ClientAddressImportForm } from "../../../Backoffice/client/api/clientAdresAPI";
import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import { asArray, textFromUnknown } from "../../../../utils/helper";
import "./WorkFlowCommande.css";
import { getAllModeLivraison, type ModeLivraisonForm, type ModeLivraisonListItem } from "../../../Backoffice/Livraison/api/LivraisonApi";
import { PAYMENT_METHODS,type PaymentMethod } from "../../../Backoffice/paiement/api/PaiementApi";

type AddressMode = "existing" | "new";

type NewAddressForm = ClientAddressImportForm & {
	useForBilling: boolean;
};

const DEFAULT_NEW_ADDRESS: NewAddressForm = {
	firstname: "John",
	lastname: "DOE",
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
	const [shippingMethod, setShippingMethod] = useState<string>("Standard");
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0] || {} as PaymentMethod);
	const [addressMode, setAddressMode] = useState<AddressMode>("existing");
	const [addresses, setAddresses] = useState<Array<{ id: number; label: string }>>([]);
	const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
	const [countryIdFrance, setCountryIdFrance] = useState<number>(0);
	const [newAddress, setNewAddress] = useState<NewAddressForm>(DEFAULT_NEW_ADDRESS);

	const [ModeLivraison, setModeLivraison] = useState<ModeLivraisonListItem[]>([]);
	const [selectedModeLivraisonId, setSelectedModeLivraisonId] = useState<number>(0);

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

	const handleConfirm = () => {
		if (!cart) return alert("Panier introuvable");
		const session = getStoredClientSession();
		if (!session) return alert("Veuillez vous connecter pour confirmer la commande.");

		(async () => {
			try {
				setCreatingOrder(true);

				let deliveryAddressId = selectedAddressId || 0;
				let invoiceAddressId = selectedAddressId || 0;

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
					invoiceAddressId = newAddress.useForBilling ? createdAddressId : invoiceAddressId;
				}

				if (!deliveryAddressId) {
					alert("Veuillez sélectionner ou créer une adresse de livraison.");
					return;
				}

				const form = { ...DEFAULT_ORDER_FORM } as any;
				form.id_customer = Number(session.id);
				form.payment = paymentMethod || form.payment;
				form.total_paid = Number(total) || 0;
				form.id_currency = 1;
				form.id_address_delivery = deliveryAddressId;
				form.id_address_invoice = invoiceAddressId || deliveryAddressId;

				const orderId = await createOrder(form);
				alert(`Commande créée (ID: ${orderId}) — total: ${total.toFixed(2)} €`);
			} catch (err: any) {
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
												<option key={address.id} value={String(address.id)}>
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
									{/* <select className="workflow-select" value={ModeLivraison.id} onChange={(e) => setShippingMethod(e.target.value)}>
										<option>Standard</option>
										<option>Express</option>
										<option>Retrait en magasin</option>
									</select> */}
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
								</div>
							</div>

							<div className="step">
								<div className="step-title">3. Méthode de paiement</div>
								<div className="step-body">
									<select className="workflow-select" value={paymentMethod?.id || 0} onChange={(e) => setPaymentMethod(PAYMENT_METHODS.find((m) => m.code === e.target.value) || {} as PaymentMethod)}>
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
										<strong>Montant total produits:</strong> {total.toFixed(2)} €
									</div>
									<button className="confirm-button" onClick={handleConfirm} disabled={creatingOrder}>
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
