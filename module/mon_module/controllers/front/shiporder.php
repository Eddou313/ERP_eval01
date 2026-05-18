<?php

class Mon_ModuleShipOrderModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        parent::initContent();

        header('Content-Type: application/xml; charset=utf-8');

        try {

            // $token = Tools::getValue('token');
            $id_order = (int)Tools::getValue('id_order');
            $idOrderState =(int) Tools::getValue('state');

            // TOKEN
            // if ($token !== 'MON_SECRET_TOKEN') {
                // throw new Exception('Token invalide');
            // }

            // ID ORDER
            if (!$id_order) {
                throw new Exception('id_order manquant');
            }

            $order = new Order($id_order);

            if (!Validate::isLoadedObject($order)) {
                throw new Exception('Commande introuvable');
            }

            // HISTORIQUE
            $history = new OrderHistory();
            $history->id_order = (int)$order->id;

            // CHANGE ETAT
            $history->changeIdOrderState(
                (int)$idOrderState,
                $order,
                true
            );

            // SAVE + EMAIL
            $history->addWithemail(true);

            // XML SUCCESS
            $xml = new SimpleXMLElement('<prestashop/>');

            $response = $xml->addChild('response');

            $response->addChild('success', 'true');
            $response->addChild('message', 'Etat commande modifié');
            $response->addChild('id_order', (int)$order->id);
            $response->addChild('new_state', (int)$idOrderState);

            echo $xml->asXML();

        } catch (Exception $e) {

            http_response_code(400);

            $xml = new SimpleXMLElement('<prestashop/>');

            $response = $xml->addChild('response');

            $response->addChild('success', 'false');
            $response->addChild('message', htmlspecialchars($e->getMessage()));

            echo $xml->asXML();
        }

        exit;
    }
}