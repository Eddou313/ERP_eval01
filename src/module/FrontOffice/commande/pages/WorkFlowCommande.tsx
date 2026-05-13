import React, { useEffect, useState } from "react";
import FrontOfficeHeader from "../../include/FrontOfficeHeader";
import { getStoredClientSession } from "../../client/api/clientAPI";
import {
	getOrCreateGuestCart,
	getLatestCartForCustomerId,
	type CartDetail,
} from "../../../Backoffice/panier/api/panierApi";
import { PAYMENT_METHODS, createOrder, DEFAULT_ORDER_FORM } from "../../../Backoffice/commande/api/commandesApi";
import { requestPrestashopXml } from "../../../../utils/prestashopClient";
import { asArray, textFromUnknown, numFromUnknown } from "../../../../utils/helper";
import "./WorkFlowCommande.css";

export default function WorkFlowCommande() {
	const [cart, setCart] = useState<CartDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [shippingMethod, setShippingMethod] = useState<string>("Standard");
	const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0] || "");
	const [address, setAddress] = useState<string>("");
	const [addresses, setAddresses] = useState<Array<{ id: number; label: string }>>([]);
	const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

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
					// si utilisateur connecté, charger ses adresses
					if (session && Number(session.id) > 0) {
						try {
							const res = await requestPrestashopXml<any>(`/addresses`, {
								query: { display: "full", [`filter[id_customer]`]: `[${Number(session.id)}]` },
							});
							const raw = res?.prestashop?.addresses?.address;
							const arr = asArray(raw).map((a: any) => {
								const id = Number(a["@_id"] ?? a.id) || 0;
								const label = `${textFromUnknown(a.address1)} ${textFromUnknown(a.postcode)} ${textFromUnknown(a.city)}`.trim();
								return { id, label };
							}).filter((x: any) => x.id > 0);
							setAddresses(arr);
							if (arr.length > 0) {
								setSelectedAddressId(arr[0].id);
								setAddress(arr[0].label);
							}
						} catch (e) {
							console.warn('Impossible de charger les adresses utilisateur', e);
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

		// Créer la commande réelle via l'API PrestaShop
		(async () => {
			try {
				const form = { ...DEFAULT_ORDER_FORM } as any;
				form.id_customer = Number(session.id);
				form.payment = paymentMethod || form.payment;
				form.total_paid = Number(total) || 0;
				form.id_currency = 1;
				form.id_address_delivery = selectedAddressId || form.id_address_delivery || 0;
				form.id_address_invoice = selectedAddressId || form.id_address_invoice || 0;

				const orderId = await createOrder(form);
				alert(`Commande créée (ID: ${orderId}) — total: ${total.toFixed(2)} €`);
			} catch (err: any) {
				console.error('Erreur création commande:', err);
				alert('Erreur lors de la création de la commande: ' + (err?.message || String(err)));
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
									<input
										placeholder="Adresse de livraison (ligne + ville)"
										value={address}
										onChange={(e) => setAddress(e.target.value)}
										style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
									/>
								</div>
							</div>

							<div className="step">
								<div className="step-title">2. Méthode de livraison</div>
								<div className="step-body">
									<select value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)}>
										<option>Standard</option>
										<option>Express</option>
										<option>Retrait en magasin</option>
									</select>
								</div>
							</div>

							<div className="step">
								<div className="step-title">3. Méthode de paiement</div>
								<div className="step-body">
									<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
										{PAYMENT_METHODS.map((m) => (
											<option key={m} value={m}>
												{m}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="step">
								<div className="step-title">4. Confirmation</div>
								<div className="step-body">
									<div style={{ marginBottom: 8 }}>
										<strong>Montant total produits:</strong> {total.toFixed(2)} €
									</div>
									{addresses.length > 0 && (
										<div style={{ marginBottom: 8 }}>
											<label style={{ display: "block", marginBottom: 6 }}>Adresses enregistrées</label>
											<select
												value={String(selectedAddressId ?? "new")}
												onChange={(e) => {
													const val = e.target.value;
													if (val === "new") {
														setSelectedAddressId(null);
														setAddress("");
													} else {
														const id = Number(val);
														setSelectedAddressId(id);
														const found = addresses.find((a) => a.id === id);
														setAddress(found ? found.label : "");
													}
												}}
												style={{ marginBottom: 8, padding: 6 }}
											>
												{addresses.map((a) => (
													<option key={a.id} value={String(a.id)}>
														{a.label}
													</option>
												))}
												<option value="new">Nouvelle adresse...</option>
											</select>
										</div>
									)}
									<button className="confirm-button" onClick={handleConfirm}>
										Confirmer la commande
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
