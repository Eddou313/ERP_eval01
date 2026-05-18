<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

class Mon_Module extends Module
{
    public function __construct()
    {
        $this->name = 'mon_module';
        $this->tab = 'administration';
        $this->version = '1.0.0';
        $this->author = 'Himass';
        $this->need_instance = 0;
        $this->bootstrap = true;

        parent::__construct();

        $this->displayName = 'Mon Module API';
        $this->description = 'Gestion API commandes et stock';

        $this->ps_versions_compliancy = [
            'min' => '8.0.0',
            'max' => _PS_VERSION_
        ];
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