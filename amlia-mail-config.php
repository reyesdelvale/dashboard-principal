<?php
/**
 * Configuración del correo para el formulario de contacto de AMLIA.
 *
 * DÓNDE PONER ESTE ARCHIVO (recomendado):
 *   Súbelo a la carpeta que está UN NIVEL ARRIBA de public_html
 *   (por ejemplo /home/uXXXX/domains/amlia.cl/amlia-mail-config.php),
 *   así nadie puede abrirlo desde el navegador.
 *   Si no puedes, déjalo junto a enviar.php: también funciona.
 *
 * QUÉ COMPLETAR:
 *   smtp_pass → la contraseña del buzón info@amlia.cl
 *               (la del correo, no la de tu cuenta de Hostinger).
 */
return [
    'smtp_host' => 'smtp.hostinger.com',
    'smtp_port' => 465,                      // SSL
    'smtp_user' => 'info@amlia.cl',          // buzón que envía
    'smtp_pass' => 'PEGA_AQUI_LA_CONTRASEÑA',
    'destino'   => 'info@amlia.cl',          // buzón que recibe
];
