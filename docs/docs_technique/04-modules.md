# 04 — Modules (quoi de chaque module)

Ce document couvre :

1) **Comment fonctionne un module PrestaShop** (structure, hooks, contrôleurs)
2) **Le rôle de chaque module présent dans `modules/`** (inventaire basé sur les métadonnées disponibles)

## 1) Structure standard d’un module

Un module PrestaShop (dossier `modules/<module>/`) contient souvent :

- `config.xml` : métadonnées (nom, version, description, auteur, catégorie `tab`).
- `<module>.php` : classe principale (hérite de `Module`).
- `controllers/front/` : endpoints FO du module (dispatcher legacy).
- `controllers/admin/` (ou `src/Controller/Admin/` selon module) : endpoints BO.
- `views/` : templates, assets, etc. (souvent `views/templates/` pour Smarty).
- `translations/` : traductions.
- `config/routing.yml` et/ou `config/services.yml` : intégration Symfony (routes/services) pour certains modules.
- `upgrade/` : scripts de migration de version du module.

### Hooks

Les modules s’intègrent majoritairement via des **hooks** :

- Ils s’enregistrent sur un hook lors de l’installation.
- Au runtime, PrestaShop appelle les hooks via `Hook::exec(...)` (ex: pendant le dispatch, lors du rendu, etc.).

## 2) Inventaire des modules présents

### Source de vérité utilisée

- Pour la majorité des modules, la description ci-dessous vient de `modules/<module>/config.xml`.
- Pour certains dossiers (modules incomplets), il n’y a pas de `config.xml` : ils sont listés à part.

### Table des modules (config.xml)

| Module | Nom (Back-Office) | Version | Auteur | Catégorie (tab) | Description |
|---|---|---:|---|---|---|
| `blockreassurance` | Customer reassurance block | 5.1.4 | PrestaShop |  | Adds an information block aimed at offering helpful information to reassure customers that your store is trustworthy. |
| `blockwishlist` | Wishlist block | 3.0.2 | PrestaShop | front_office_features | Adds a block containing the customer's wishlists. |
| `contactform` | Contact form | 4.4.3 | PrestaShop | front_office_features | Adds a contact form to the "Contact us" page. |
| `dashactivity` | Dashboard Activity | 2.1.1 | PrestaShop | dashboard |  |
| `dashgoals` | Dashboard Goals | 2.0.4 | PrestaShop | dashboard | Adds a block with your store's forecast. |
| `dashproducts` | Dashboard Products | 2.1.4 | PrestaShop | dashboard | Adds a block with a table of your latest orders and a ranking of your products |
| `dashtrends` | Dashboard Trends | 2.1.3 | PrestaShop | dashboard | Adds a block whith the evolution of your stores main numbers along with a graphic. |
| `gamification` | Merchant Expertise | 3.0.6 | PrestaShop | administration | Become an e-commerce expert within the blink of an eye! |
| `graphnvd3` | NVD3 Charts | 2.0.3 | PrestaShop | administration |  |
| `gridhtml` | Simple HTML table display | 2.0.3 | PrestaShop | administration | Allows the statistics system to display data in a grid. |
| `gsitemap` | Google sitemap | 4.4.0 | PrestaShop | seo | Generate your Google sitemap file |
| `klaviyopsautomation` | PrestaShop Automation with Klaviyo | 1.11.1 | PrestaShop Partners | advertising_marketing | Klaviyo module to integrate PrestaShop with Klaviyo. |
| `pagesnotfound` | Pages not found | 2.0.3 | PrestaShop | analytics_stats | Displays the pages requested by your visitors that have not been found. |
| `productcomments` | Product Comments | 7.0.0 | PrestaShop | front_office_features | Allows users to post reviews and rate products on specific criteria. |
| `ps_accounts` | PrestaShop Account | 8.0.13 | PrestaShop | administration | Link your store to your PrestaShop account to activate and manage your subscriptions in your back office. Do not uninstall this module if you have a current subscription. |
| `ps_banner` | Banner | 2.1.2 | PrestaShop |  | Displays a banner on your shop. |
| `ps_bestsellers` | Top-sellers block | 1.0.7 | PrestaShop |  | Adds a block displaying your store's top-selling products. |
| `ps_brandlist` | Brand list | 1.0.3 | PrestaShop | front_office_features | Displays a block listing product brands. |
| `ps_cashondelivery` | Cash on delivery (COD) | 2.0.1 | PrestaShop |  | Accept cash payments on delivery to make it easy for customers to purchase on your store. |
| `ps_categoryproducts` | Products category | 1.0.8 | PrestaShop |  | Displays products of the same category on the product page. |
| `ps_categorytree` | Category tree links | 3.0.1 | PrestaShop | front_office_features | Help navigation on your store, show your visitors current category and subcategories. |
| `ps_checkout` | PrestaShop Checkout | 8.5.1.1 | PrestaShop | payments_gateways | Provide the most commonly used payment methods to your customers in this all-in-one module, and manage all your sales in a centralized interface. |
| `ps_checkpayment` | Check payment | 2.1.0 | PrestaShop | payments_gateways | This module allows you to accept payments by check. |
| `ps_contactinfo` | Contact information | 3.3.3 | PrestaShop | front_office_features | Allows you to display additional information about your store's customer service. |
| `ps_crossselling` | Cross-selling | 2.0.3 | PrestaShop |  | Adds a "Customers who bought this product also bought..." section to every product page. |
| `ps_currencyselector` | Currency selector | 2.1.1 | PrestaShop |  | Adds a block allowing customers to choose their preferred shopping currency. |
| `ps_customeraccountlinks` | Customer account links | 3.2.0 | PrestaShop |  | Displays a block with links relative to a user's account. |
| `ps_customersignin` | Customer "Sign in" link | 2.0.5 | PrestaShop |  | Adds a block that displays information about the customer. |
| `ps_customtext` | Custom text | 4.2.1 | PrestaShop |  | Adds custom information block in your store. |
| `ps_dataprivacy` | Customer data privacy block | 2.1.1 | PrestaShop |  | Adds a block displaying your data privacy policy for more transparency and reassurance. |
| `ps_distributionapiclient` | Distribution API Client | 1.2.0 | PrestaShop | market_place | Download and upgrade PrestaShop's native modules. |
| `ps_edition_basic` | PrestaShop Edition Basic | 1.0.20 | PrestaShop | administration | PrestaShop Edition Basic. |
| `ps_emailalerts` | Mail alerts | 3.0.1 | PrestaShop | administration | Sends e-mail notifications to customers and merchants regarding stock and order modifications. |
| `ps_emailsubscription` | E-mail subscription form | 2.8.2 | PrestaShop |  | Adds a block for newsletter subscription. |
| `ps_eventbus` | PrestaShop EventBus | 4.0.13 | PrestaShop | administration | Link your PrestaShop account to synchronize your shop data to a tech partner of your choice. Do not uninstall this module if you are already using a service, as it will prevent it from working. |
| `ps_facebook` | PS Social with Facebook & Instagram | 1.38.17 | PrestaShop | advertising_marketing | PS Social with Facebook & Instagram gives you all the tools you need to successfully sell and market across Facebook and Instagram. Discover new opportunities to help you scale and grow your business, and manage all your Facebook accounts and products from one place. |
| `ps_facetedsearch` | Faceted search | 4.0.0 | PrestaShop | front_office_features | Displays a block allowing multiple filters. |
| `ps_faviconnotificationbo` | Order Notifications on the Favicon | 2.1.3 | PrestaShop | administration | Get notified directly on your browser tab each time you get a new order, customer or message. |
| `ps_featuredproducts` | Featured products | 2.1.6 | PrestaShop | front_office_features | Displays featured products in the central column of your homepage. |
| `ps_googleanalytics` | Google Analytics | 5.0.2 | PrestaShop | analytics_stats | Gain clear insights into important metrics about your customers, using Google Analytics |
| `ps_imageslider` | Image slider | 3.2.1 | PrestaShop | front_office_features | Adds an image slider to your site. |
| `ps_languageselector` | Language selector | 2.1.3 | PrestaShop |  | Adds a block allowing customers to select a language for your store's content. |
| `ps_linklist` | Link List | 6.0.7 | PrestaShop | front_office_features | Adds a block with several links. |
| `ps_mainmenu` | Main menu | 2.3.4 | PrestaShop | front_office_features | Adds a new menu to the top of your e-commerce website. |
| `ps_mbo` | PrestaShop Marketplace in your Back Office | 4.14.1 | PrestaShop | administration | Discover the best PrestaShop modules to optimize your online store. |
| `ps_newproducts` | New products | 1.0.5 | PrestaShop |  | Displays a block featuring your store's newest products. |
| `ps_searchbar` | Search bar | 2.1.4 | PrestaShop |  | Adds a quick search bar to your website. |
| `ps_sharebuttons` | Social media share buttons | 2.1.3 | PrestaShop |  | Displays social media sharing buttons (Twitter, Facebook, Google+ and Pinterest) on every product page. |
| `ps_shoppingcart` | Shopping cart | 3.0.0 | PrestaShop | front_office_features | Adds a block containing the customer's shopping cart. |
| `ps_socialfollow` | Social media follow links | 2.3.2 | PrestaShop |  | Allows you to add information about your brand's social networking accounts. |
| `ps_specials` | Specials block | 1.0.3 | PrestaShop |  | Displays your products that are currently on sale in a dedicated block. |
| `ps_supplierlist` | Supplier List | 1.0.6 | PrestaShop | front_office_features | Adds a block with a list of your product suppliers on your shop. |
| `ps_themecusto` | Theme Customization | 1.2.5 | PrestaShop |  | Easily configure and customize your homepage’s theme and main native modules. Feature available on Design > Theme & Logo page. |
| `ps_viewedproduct` | Viewed products block | 1.2.5 | PrestaShop | front_office_features | Adds a block displaying recently viewed products. |
| `ps_wirepayment` | Wire payment | 2.2.0 | PrestaShop | payments_gateways | Accept payments by bank transfer. |
| `psgdpr` | Official GDPR compliance | 1.4.3 | PrestaShop | front_office_features | Make your store comply with the General Data Protection Regulation (GDPR). |
| `psshipping` | PrestaShop Shipping | 1.1.4 | PrestaShop | shipping_logistics | Powered by Mail Boxes Etc, PrestaShop Shipping offers standard, pickup-point and express international delivery methods to your customers no matter where they are located. Have access to exclusive rates for each delivered and returned parcels by using our extensive network of trusted partners. |
| `psxmarketingwithgoogle` | Marketing with Google | 1.75.6 | PrestaShop | advertising_marketing | PrestaShop Marketing makes it easy to connect your store with Google and promote your products to millions of shoppers across multiple Google channels. Create Performance Max campaigns without leaving your PrestaShop dashboard and drive more traffic. |
| `statsbestcategories` | Best categories | 2.0.1 | PrestaShop | analytics_stats | Adds a list of the best categories to the Stats dashboard. |
| `statsbestcustomers` | Best customers | 2.0.4 | PrestaShop | analytics_stats | Adds a list of the best customers to the Stats dashboard. |
| `statsbestmanufacturers` | Best manufacturers | 2.0.3 | PrestaShop | analytics_stats | Adds a list of the best manufacturers to the Stats dashboard. |
| `statsbestproducts` | Best-selling products | 2.0.1 | PrestaShop | analytics_stats | Adds a list of the best-selling products to the Stats dashboard. |
| `statsbestsuppliers` | Best suppliers | 2.0.2 | PrestaShop | analytics_stats | Adds a list of the best suppliers to the Stats dashboard. |
| `statsbestvouchers` | Best vouchers | 2.0.1 | PrestaShop | analytics_stats | Adds a list of the best vouchers to the Stats dashboard. |
| `statscarrier` | Carrier distribution | 2.0.1 | PrestaShop | analytics_stats | Adds a graph displaying each carriers' distribution to the Stats dashboard. |
| `statscatalog` | Catalog statistics | 2.0.4 | PrestaShop | analytics_stats | Adds a tab containing general statistics about your catalog to the Stats dashboard. |
| `statscheckup` | Catalog evaluation | 2.0.3 | PrestaShop | analytics_stats | Adds a quick evaluation of your catalog quality to the Stats dashboard. |
| `statsdata` | Data mining for statistics | 2.1.2 | PrestaShop | analytics_stats | This module must be enabled if you want to use statistics. |
| `statsforecast` | Stats Dashboard | 2.0.4 | PrestaShop | analytics_stats | This is the main module for the Stats dashboard. It displays a summary of all your current statistics. |
| `statsnewsletter` | Newsletter | 2.0.3 | PrestaShop | analytics_stats | Adds a tab with a graph showing newsletter registrations to the Stats dashboard. |
| `statspersonalinfos` | Registered customer information | 2.0.4 | PrestaShop | analytics_stats | Adds information about your registered customers (such as gender and age) to the Stats dashboard. |
| `statsproduct` | Product details | 2.1.3 | PrestaShop | analytics_stats | Adds detailed statistics for each product to the Stats dashboard. |
| `statsregistrations` | Customer accounts | 2.0.1 | PrestaShop | analytics_stats | Adds a registration progress tab to the Stats dashboard. |
| `statssales` | Sales and orders | 2.1.0 | PrestaShop | analytics_stats | Adds sales evolution and orders by status. |
| `statssearch` | Shop search | 2.0.2 | PrestaShop | analytics_stats | Adds a tab showing which keywords have been searched by your store's visitors. |
| `statsstock` | Available quantities | 2.0.1 | PrestaShop | analytics_stats | Adds a tab showing the quantity of available products for sale to the Stats dashboard. |

### Modules/dossiers sans `config.xml`

Ces dossiers existent dans `modules/`, mais ne contiennent pas de `config.xml` dans cette instance :

- `followup` : dossier présent, contient uniquement `mails/` (pas de code module détecté).
- `ps_reminder` : dossier présent, contient uniquement `mails/` (pas de code module détecté).
- `referralprogram` : dossier présent, contient uniquement `mails/` (pas de code module détecté).
- `psassistant` : module complet (pas de `config.xml`) ; la classe principale (`PsAssistant`) indique :
  - version `2.0.1`
  - onglet `administration`
  - description : accès support PrestaShop à certaines parties du BO.

---

Pour un module donné, si tu veux une « fiche » plus détaillée (hooks utilisés, contrôleurs exposés, services Symfony, tables SQL), dis-moi le nom du module et je la génère.
