<?php

class StockApiUpdateModuleFrontController extends ModuleFrontController
{
    public $display_header = false;
    public $display_footer = false;

    public function initContent()
    {
        parent::initContent();

        header('Content-Type: application/xml; charset=utf-8');

        try {

            $token = Tools::getValue('token');

            // sécurité minimale
            if ($token !== 'MON_SECRET_TOKEN') {
                http_response_code(401);

                die($this->xmlError(
                    'Token invalide'
                ));
            }

            $idProduct = (int) Tools::getValue('id_product');

            $idProductAttribute = (int) Tools::getValue('id_product_attribute', 0);

            $quantity = (int) Tools::getValue('quantity');

            if ($idProduct <= 0) {
                throw new Exception('Produit invalide');
            }

            // mise à jour stock
            StockAvailable::setQuantity(
                $idProduct,
                $idProductAttribute,
                $quantity
            );

            $xml = new SimpleXMLElement('<response/>');

            $xml->addChild('success', 'true');
            $xml->addChild('id_product', $idProduct);
            $xml->addChild('id_product_attribute', $idProductAttribute);
            $xml->addChild('quantity', $quantity);

            echo $xml->asXML();

            exit;

        } catch (Exception $e) {

            http_response_code(500);

            die($this->xmlError(
                $e->getMessage()
            ));
        }
    }

    private function xmlError($message)
    {
        $xml = new SimpleXMLElement('<response/>');

        $xml->addChild('success', 'false');
        $xml->addChild('message', htmlspecialchars($message));

        return $xml->asXML();
    }
}