<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

class StockApi extends Module
{
    public function __construct()
    {
        $this->name = 'stockapi';
        $this->tab = 'administration';
        $this->version = '1.0.0';
        $this->author = 'Himass';
        $this->need_instance = 0;
        $this->bootstrap = true;

        parent::__construct();

        $this->displayName = 'Stock API';
        $this->description = 'API simple pour modifier le stock.';
    }

    public function install()
    {
        return parent::install();
    }

    public function uninstall()
    {
        return parent::uninstall();
    }
}