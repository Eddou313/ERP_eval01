<?php

class StockApiUpdateModuleFrontController extends ModuleFrontController
{
    public $display_header = false;
    public $display_footer = false;
    public $content_only = true; 

    public function initContent()
    {
        // =========================
        // CORS
        // =========================
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }

        header('Content-Type: application/xml; charset=utf-8');

        try {
            // =========================
            // RECUPERATION DES DONNEES
            // =========================
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $token              = Tools::getValue('token');
                $idProduct          = (int) Tools::getValue('id_product');
                $idProductAttribute = (int) Tools::getValue('id_product_attribute'); // Ajout
                $delta              = (int) Tools::getValue('delta');
            } else {
                $rawXml = file_get_contents('php://input');

                if (empty($rawXml)) {
                    throw new Exception('Body XML vide');
                }

                $previousEntityState = libxml_disable_entity_loader(true);
                $xmlRequest = simplexml_load_string($rawXml);
                libxml_disable_entity_loader($previousEntityState);

                if (!$xmlRequest) {
                    throw new Exception('XML invalide');
                }

                $token              = (string) $xmlRequest->token;
                $idProduct          = (int) $xmlRequest->id_product;
                $idProductAttribute = (int) $xmlRequest->id_product_attribute; // Ajout
                $delta              = (int) $xmlRequest->delta;
            }

            // =========================
            // VALIDATIONS
            // =========================
            if ($token !== 'MON_SECRET_TOKEN') {
                http_response_code(401);
                throw new Exception('Token invalide');
            }

            if ($idProduct <= 0) {
                http_response_code(400);
                throw new Exception('Produit invalide');
            }

            if (!Product::existsInDatabase($idProduct, 'product')) {
                http_response_code(404);
                throw new Exception('Produit introuvable');
            }

            // AJOUT : Vérification de la déclinaison si elle est renseignée
            if ($idProductAttribute > 0 && !Combination::isFeatureActive()) {
                http_response_code(400);
                throw new Exception('Les déclinaisons ne sont pas activées sur cette boutique');
            }

            if ($idProductAttribute > 0 && !Combination::isCombinationExist($idProduct, $idProductAttribute)) {
                http_response_code(404);
                throw new Exception('Déclinaison introuvable pour ce produit');
            }

            // =========================
            // MISE A JOUR STOCK
            // =========================
            // On passe désormais $idProductAttribute au lieu de 0
            StockAvailable::updateQuantity($idProduct, $idProductAttribute, $delta);

            // Récupération dynamique de l'id_stock_available lié à la déclinaison
            $idStock = (int) Db::getInstance()->getValue(
                'SELECT id_stock_available
                FROM '._DB_PREFIX_.'stock_available
                WHERE id_product = '.(int)$idProduct.'
                AND id_product_attribute = '.(int)$idProductAttribute.'
                AND id_shop = 1'
            );

            // =========================
            // CREATION MOUVEMENT STOCK
            // =========================
            Db::getInstance()->insert('stock_mvt', [
                'id_stock'            => $idStock,
                'id_order'            => 0,
                'id_supply_order'     => 0,
                'id_stock_mvt_reason' => ($delta >= 0 ? 3 : 2),
                'employee_lastname'   => 'API',
                'employee_firstname'  => 'Stock',
                'physical_quantity'   => abs($delta),
                'sign'                => ($delta >= 0 ? 1 : -1),
                'price_te'            => 0,
                'date_add'            => date('Y-m-d H:i:s')
            ]);

            $movementId = (int) Db::getInstance()->Insert_ID();

            // =========================
            // NOUVEAU STOCK
            // =========================
            // On passe $idProductAttribute pour obtenir le stock précis de la déclinaison
            $newQuantity = (int) StockAvailable::getQuantityAvailableByProduct($idProduct, $idProductAttribute);

            // =========================
            // REPONSE XML SUCCÈS
            // =========================
            http_response_code(200);
            $xml = new SimpleXMLElement('<response/>');
            $xml->addChild('success', 'true');
            $xml->addChild('id_product', (string)$idProduct);
            $xml->addChild('id_product_attribute', (string)$idProductAttribute); // Ajout dans le XML
            $xml->addChild('delta', (string)$delta);
            $xml->addChild('new_quantity', (string)$newQuantity);
            $xml->addChild('stock_movement_id', (string)$movementId);

            echo $xml->asXML();
            exit;

        } catch (Exception $e) {
            if (http_response_code() === 200) {
                http_response_code(500);
            }

            $xml = new SimpleXMLElement('<response/>');
            $xml->addChild('success', 'false');
            $xml->addChild('message', htmlspecialchars($e->getMessage()));

            echo $xml->asXML();
            exit;
        }
    }
}