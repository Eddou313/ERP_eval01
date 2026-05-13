import { BrowserRouter, Routes, Route } from "react-router-dom"
import DashboardPage from "../module/Backoffice/tableauBord/pages/DashboardPage"

// import CategoriesListPage from "../module/Backoffice/categorie/pages/CategoriesListPage"
// import ProductsListPage from "../module/Backoffice/produit/pages/ProductsListPage"
import CommandesListPage from "../module/Backoffice/commande/pages/CommandesListPage"
import ImportGlobal from "../files/pages/ImportGlobal"
// import PaniersListPage from "../module/Backoffice/panier/pages/PaniersListPage"
// import PanierDetailPage from "../module/Backoffice/panier/pages/PanierDetailPage"
import EtatCommande from "../module/Backoffice/commande/pages/EtatCommande"
import Login from "../module/Backoffice/auth/pages/login"
import SecureRoute from "./securiter"
// import FrontOfficePage from "../module/FrontOffice/pages/FrontOfficePage"
import ClientLogin from "../module/FrontOffice/client/pages/ClientLogin"
import ProductDetailPage from "../module/FrontOffice/produits/pages/ProduitDetail"
// import AttributsCaracteristiquesPage from "../module/Backoffice/attribue&Caracteristique/pages/AttributsCaracteristiquesPage"
import ClientRegister from "../module/FrontOffice/client/pages/ClientRegister"
import Home from "./Home"
import ProduitsList from "../module/FrontOffice/produits/pages/ProduitsList"
import { Panier } from "../module/FrontOffice/panier/Panier"
import Commande from "../module/FrontOffice/commande/pages/Commande"
import WorkFlowCommande from "../module/FrontOffice/commande/pages/WorkFlowCommande"

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
          <Route path="/" element={<ProduitsList />} />
          <Route path="/login" element={<ClientLogin />} />
          <Route path="/register" element={<ClientRegister />} />
          <Route path="/produit/:id" element={<ProductDetailPage />} />
          <Route path="/panier" element={<Panier />} />
          <Route path="/Mescommande" element={<Commande />} />
          <Route path="/Commande" element={<WorkFlowCommande />} />
          <Route path="/admin/login" element={<Login />} />

          <Route element={<SecureRoute />}>
            {/* <Route path="/Home" element={<Home />} /> */}
            
            <Route path="/Dashbord" element={<DashboardPage />} />

            {/* <Route path="catalogue/categories" element={<CategoriesListPage />} /> */}
            {/* <Route path="catalogue/produits" element={<ProductsListPage />} /> */}
            {/* <Route path="catalogue/attributs-caracteristiques" element={<AttributsCaracteristiquesPage />} /> */}
            {/* <Route path="catalogue/marques-fournisseurs" element={<MarquesFournisseursPage />} /> */}
            {/* <Route path="catalogue/stock" element={<StockPage />} /> */}

            <Route path="commandes/list" element={<CommandesListPage />} />
            <Route path="/catalogue/fichier" element={<ImportGlobal/>}/>

            {/* <Route path="/clients/clients" element={<ClientsListe/>}/> */}
            {/* <Route path="/clients/adresses" element={<ClientsAdressesListe/>}/> */}
            {/* <Route path="/commandes/panier" element={<PaniersListPage/>} /> */}
            {/* <Route path="/commandes/panier/:id" element={<PanierDetailPage/>} /> */}
            <Route path="/commandes/etat" element={<EtatCommande/>} />

            {/* <Route path="/sav/sav" element={<SavePage/>} /> */}
            {/* <Route path="/sav/sav/:id" element={<SaveDetailPage/>} /> */}
            {/* <Route path="/sav/retours-produit" element={<ReturnPage/>} /> */}
            {/* <Route path="/sav/retours-produit/:id" element={<ReturnDetailPage/>} /> */}
          </Route>

          {/* <Route path="/produit/:id" element={<ProductDetailPage />} /> */}
          <Route path="*" element={<ClientLogin />} />
          <Route path="/home" element={<Home/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter