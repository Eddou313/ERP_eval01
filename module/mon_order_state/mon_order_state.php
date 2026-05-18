<?php
if (!defined('_PS_VERSION_')) exit;

class Mon_Order_State extends Module
{
    public function __construct()
    {
        $this->name    = 'mon_order_state';
        $this->tab     = 'administration';
        $this->version = '1.0.0';
        $this->author  = 'Moi';
        parent::__construct();
        $this->displayName = 'Mon Order State API';
        $this->description = 'Endpoint webservice pour changer le statut d\'une commande avec gestion des mouvements de stock';
    }

    public function install()
    {
        return parent::install()
            && $this->registerHook('addWebserviceResources');
    }

    public function hookAddWebserviceResources($params)
    {
        require_once dirname(__FILE__) . '/classes/WebserviceResourceOrderState.php';

        return [
            'order_state_update' => [
                'description'         => 'Change order state with stock movement',
                'specific_management' => true,
            ],
        ];
    }
}