import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import {logoutEmployee} from "../module/Backoffice/auth/api/authAPI";
import "./SidebarNav.css";
import {
  IconList,
  IconShoppingCart,
  IconBox,
  IconPackage,
  IconLayoutGrid,
  IconFileText,
  IconAdjustments,
} from "@tabler/icons-react";

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
              <IconList className="homeNavItemIcon" />
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
              <IconList className="homeNavItemIcon" />
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
              <IconShoppingCart className="homeNavItemIcon" />
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
              <IconBox className="homeNavItemIcon" />
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
              <IconPackage className="homeNavItemIcon" />
              <span>Produits</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/catalogue/categories"
              onClick={() => setOpenDropdownId("catalogue")}
            >
              <IconLayoutGrid className="homeNavItemIcon" />
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
              <IconFileText className="homeNavItemIcon" />
              <span>Fichier</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `homeNavSubItem homeNavSubItemIndented${isActive ? " homeNavItemActive" : ""}`
              }
              to="/catalogue/attributs-caracteristiques"
              onClick={() => setOpenDropdownId("catalogue")}
            >
              <IconAdjustments className="homeNavItemIcon" />
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
