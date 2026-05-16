import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredClientSession, logoutClient } from "../client/api/clientAPI";
import type { ClientSession } from "../client/api/clientAPI";
import "./FrontOfficeHeader.css";
import { IconHome, IconReceipt, IconShoppingCart, IconUserPlus, IconLogout } from "@tabler/icons-react";

export default function FrontOfficeHeader() {
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientSession | null>(null);

  useEffect(() => {
    const session = getStoredClientSession();
    setClient(session);
  }, []);

  const handleLogout = () => {
    logoutClient();
    setClient(null);
    navigate("/");
  };

  return (
    <header className="frontOfficeHeader">
      <div className="headerContainer">
        <div className="headerLeft">
          <Link to="/" className="logoLink">
            <h1>E-COMMERCE</h1>
          </Link>
          <nav className="headerNav">
            <Link to="/produits" className="navLink"><IconHome size={18} /> Accueil</Link>
            {client?.email!=="anonymous@psgdpr.com" && (
              <Link to="/Mescommande" className="navLink"><IconReceipt size={18} /> Mes Commandes</Link>
            )}
          </nav>
        </div>

        <div className="headerActions">
          <Link to="/panier" className="iconAction" title="Panier">
            <IconShoppingCart size={22} />
          </Link>

          {client ? (
            <div className="userMenu">
              <div className="clientAvatar" title={`${client.prenom} ${client.nom}`}>
                {client.prenom[0]}{client.nom[0]}
              </div>
              <button className="logoutBtn" onClick={handleLogout}>
                <IconLogout size={18} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="loginButton">
              <IconUserPlus size={18} /> Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}