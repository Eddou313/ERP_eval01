import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import {logoutEmployee} from "../module/Backoffice/auth/api/authAPI";
import "./SidebarNav.css";

function OrdersIcon() {
  return (
    <svg
      className="homeNavItemIcon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7 4H17C18.1046 4 19 4.89543 19 6V20H5V6C5 4.89543 5.89543 4 7 4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 9H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 13H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      className="homeNavItemIcon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7 7H20L18.5 15H8.5L7 7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M4 4H6L7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 20C9.55228 20 10 19.5523 10 19C10 18.4477 9.55228 18 9 18C8.44772 18 8 18.4477 8 19C8 19.5523 8.44772 20 9 20Z"
        fill="currentColor"
      />
      <path
        d="M17 20C17.5523 20 18 19.5523 18 19C18 18.4477 17.5523 18 17 18C16.4477 18 16 18.4477 16 19C16 19.5523 16.4477 20 17 20Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CatalogIcon() {
  return (
    <svg
      className="homeNavItemIcon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6C4 4.89543 4.89543 4 6 4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 8H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 12H13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg
      className="homeNavItemIcon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7 7H17V20H7V7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M9 4H15V7H9V4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function CategoriesIcon() {
  return (
    <svg
      className="homeNavItemIcon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 6H10V12H4V6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M14 6H20V12H14V6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 16H10V20H4V16Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M14 16H20V20H14V16Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      className="homeNavItemIcon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7 3H14L19 8V21H7V3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M14 3V8H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 13H17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AttributesIcon() {
  return (
    <svg
      className="homeNavItemIcon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 6H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 18H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 6V6"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M15 12V12"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M11 18V18"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SidebarNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openDropdownId, setOpenDropdownId] = useState<
    "commandes" | "catalogue" | "clients" | "sav" | null
  >(null);

  const activeGroupId = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/commandes")) return "commandes" as const;
    if (path.startsWith("/catalogue")) return "catalogue" as const;
    if (path.startsWith("/clients")) return "clients" as const;
    if (path.startsWith("/sav")) return "sav" as const;
    return null;
  }, [location.pathname]);

  const toggleDropdown = (
    id: "commandes" | "catalogue" | "clients" | "sav",
  ) => {
    setOpenDropdownId((prev) => (prev === id ? null : id));
  };

  const handleLogout = () => {
    logoutEmployee();
    navigate("/", { replace: true });
  };
  const VueBoutique = ()=>{
    navigate("/", { replace: true });
  }

  return (
    <aside className="homeSidebar">
      <div className="homeSidebarInner">
        <div className="homeSidebarActions">
          <button className="homeSidebarButton homeSidebarButton--view" onClick={VueBoutique}>
            Vue Boutique
          </button>
        </div>

        <nav className="homeNav" aria-label="Navigation">
        {/* <NavLink
          className={({ isActive }) =>
            `homeNavItem${isActive ? " homeNavItemActive" : ""}`
          }
          to="/"
          end
        >
          <DashboardIcon />
          <span>Tableau de bord</span>
        </NavLink> */}

        <details className="homeNavDropdown" open={openDropdownId === "commandes"}>
          <summary
            className={`homeNavDropdownSummary${activeGroupId === "commandes" ? " homeNavItemActive" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown("commandes");
            }}
          >
            <span className="homeNavDropdownSummaryLeft">
              <OrdersIcon />
              <span>Commandes</span>
            </span>
            <span className="homeNavDropdownChevron" aria-hidden="true">
              ▾
            </span>
          </summary>
          
          <div className="homeNavDropdownItems">
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/commandes/list"
              onClick={() => setOpenDropdownId("commandes")}
            >
              <OrdersIcon />
              <span>Commande</span>
            </NavLink>
            {/* <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/commandes/Facture"
              onClick={() => setOpenDropdownId("commandes")}
            >
              <OrdersIcon />
              <span>Facture</span>
            </NavLink> */}
            {/* <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/commandes/avoirs"
              onClick={() => setOpenDropdownId("commandes")}
            >
              <CreditNoteIcon />
              <span>Avoirs</span>
            </NavLink> */}
            {/* <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/commandes/bons-de-livraison"
              onClick={() => setOpenDropdownId("commandes")}
            >
              <DeliveryIcon />
              <span>Bons de livraison</span>
            </NavLink> */}
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/commandes/panier"
              onClick={() => setOpenDropdownId("commandes")}
            >
              <CartIcon />
              <span>Panier</span>
            </NavLink>
          </div>
        </details>

        <details className="homeNavDropdown" open={openDropdownId === "catalogue"}>
          <summary
            className={`homeNavDropdownSummary${activeGroupId === "catalogue" ? " homeNavItemActive" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown("catalogue");
            }}
          >
            <span className="homeNavDropdownSummaryLeft">
              <CatalogIcon />
              <span>Catalogue</span>
            </span>
            <span className="homeNavDropdownChevron" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="homeNavDropdownItems">
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/catalogue/produits"
              onClick={() => setOpenDropdownId("catalogue")}
            >
              <ProductsIcon />
              <span>Produits</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/catalogue/categories"
              onClick={() => setOpenDropdownId("catalogue")}
            >
              <CategoriesIcon />
              <span>Categories</span>
            </NavLink>
            {/* <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/catalogue/suivi"
              onClick={() => setOpenDropdownId("catalogue")}
            >
              <TrackingIcon />
              <span>Suivi</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/catalogue/stock"
              onClick={() => setOpenDropdownId("catalogue")}
            >
              <StockIcon />
              <span>Stock</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/catalogue/reductions"
              onClick={() => setOpenDropdownId("catalogue")}
            >
              <DiscountIcon />
              <span>Reductions</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/catalogue/marques-fournisseurs"
              onClick={() => setOpenDropdownId("catalogue")}
            >
              <BrandSupplierIcon />
              <span>Marque &amp; fournisseur</span>
            </NavLink> */}
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/catalogue/fichier"
              onClick={() => setOpenDropdownId("catalogue")}
            >
              <FileIcon />
              <span>Fichier</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/catalogue/attributs-caracteristiques"
              onClick={() => setOpenDropdownId("catalogue")}
            >
              <AttributesIcon />
              <span>Attributs &amp; caracteristique</span>
            </NavLink>
          </div>
        </details>

        {/* <details className="homeNavDropdown" open={openDropdownId === "clients"}>
          <summary
            className={`homeNavDropdownSummary${activeGroupId === "clients" ? " homeNavItemActive" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown("clients");
            }}
          >
            <span className="homeNavDropdownSummaryLeft">
              <ClientsIcon />
              <span>Clients</span>
            </span>
            <span className="homeNavDropdownChevron" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="homeNavDropdownItems">
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/clients/clients"
              onClick={() => setOpenDropdownId("clients")}
            >
              <ClientsIcon />
              <span>Clients</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/clients/adresses"
              onClick={() => setOpenDropdownId("clients")}
            >
              <AddressIcon />
              <span>Adresses</span>
            </NavLink>
          </div>
        </details>

        <details className="homeNavDropdown" open={openDropdownId === "sav"}>
          <summary
            className={`homeNavDropdownSummary${activeGroupId === "sav" ? " homeNavItemActive" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown("sav");
            }}
          >
            <span className="homeNavDropdownSummaryLeft">
              <SavIcon />
              <span>SAV</span>
            </span>
            <span className="homeNavDropdownChevron" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="homeNavDropdownItems">
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/sav/sav"
              onClick={() => setOpenDropdownId("sav")}
            >
              <SavIcon />
              <span>SAV</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/sav/retours-produit"
              onClick={() => setOpenDropdownId("sav")}
            >
              <ReturnIcon />
              <span>Retours produit</span>
            </NavLink>
          </div>
        </details> */}
        </nav>
<br />
        <div className="homeSidebarActions homeSidebarActions--bottom">
          <button className="homeSidebarButton homeSidebarButton--logout" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );
}
