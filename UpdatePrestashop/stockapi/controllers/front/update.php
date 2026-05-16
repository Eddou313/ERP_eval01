<?php

class StockApiUpdateModuleFrontController extends ModuleFrontController
{
    public $display_header = false;
    public $display_footer = false;

    public function init()
    {
        // CORS
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: *');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }

        header('Content-Type: application/xml; charset=utf-8');

        try {

            $token = (string) Tools::getValue('token');

            if ($token !== 'MON_SECRET_TOKEN') {
                throw new Exception('Token invalide');
            }

            $idProduct = (int) Tools::getValue('id_product');
            $idProductAttribute = (int) Tools::getValue('id_product_attribute', 0);
            $quantity = (int) Tools::getValue('quantity');

            if ($idProduct <= 0) {
                throw new Exception('Produit invalide');
            }

            // STOCK AVAILABLE (quantité vendable)
            StockAvailable::setQuantity(
                $idProduct,
                $idProductAttribute,
                $quantity
            );

            // 🔥 UPDATE physical_quantity (stock physique réel)
            Db::getInstance()->update(
                'stock_available',
                [
                    'physical_quantity' => (int) $quantity
                ],
                'id_product = ' . (int)$idProduct .
                ' AND id_product_attribute = ' . (int)$idProductAttribute
            );

            $xml = new SimpleXMLElement('<response/>');

            $xml->addChild('success', 'true');
            $xml->addChild('id_product', (string)$idProduct);
            $xml->addChild('id_product_attribute', (string)$idProductAttribute);
            $xml->addChild('quantity', (string)$quantity);
            $xml->addChild('physical_quantity', (string)$quantity);

            echo $xml->asXML();
            exit;

        } catch (Exception $e) {

            http_response_code(500);

            $xml = new SimpleXMLElement('<response/>');

            $xml->addChild('success', 'false');
            $xml->addChild('message', htmlspecialchars($e->getMessage()));

            echo $xml->asXML();
            exit;
        }
    }
}