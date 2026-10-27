<?php
/**
 * AMLIA — envío del formulario de contacto por el correo de Hostinger (SMTP).
 * El mensaje llega a info@amlia.cl en segundo plano, sin servicios externos.
 *
 * Configuración: completa la contraseña en amlia-mail-config.php
 * (ver instrucciones en ese archivo). No hace falta instalar nada.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function responder($ok, $msg, $code = 200) {
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'mensaje' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(false, 'Método no permitido.', 405);
}

/* ---------- Configuración ---------- */
// Se busca primero fuera de public_html (más seguro) y luego junto a este archivo.
$rutas = [
    dirname(__DIR__) . '/amlia-mail-config.php',
    __DIR__ . '/amlia-mail-config.php',
];
$cfg = null;
foreach ($rutas as $r) {
    if (is_file($r)) { $cfg = require $r; break; }
}
if (!is_array($cfg) || empty($cfg['smtp_pass']) || $cfg['smtp_pass'] === 'PEGA_AQUI_LA_CONTRASEÑA') {
    responder(false, 'El formulario aún no está configurado. Escríbenos a info@amlia.cl.', 500);
}

/* ---------- Validación ---------- */
// Campo trampa: los humanos no lo ven; si viene con texto, es un bot.
if (!empty($_POST['sitio_web'])) {
    responder(true, 'Mensaje enviado.');
}

$limpiar = function ($v, $max) {
    $v = trim((string)$v);
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    return mb_substr($v, 0, $max);
};
$nombre  = $limpiar($_POST['nombre'] ?? '', 120);
$email   = $limpiar($_POST['emailcorporativo'] ?? '', 160);
$empresa = $limpiar($_POST['empresa'] ?? '', 160);
$mensaje = $limpiar($_POST['mensaje'] ?? '', 5000);

// Sin saltos de línea en campos que van a cabeceras.
$nombre  = str_replace("\n", ' ', $nombre);
$empresa = str_replace("\n", ' ', $empresa);

if ($nombre === '' || $mensaje === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    responder(false, 'Revisa tu nombre, tu email y el mensaje.', 422);
}

// Límite simple: un envío cada 30 segundos por visitante.
session_start();
if (!empty($_SESSION['ultimo_envio']) && time() - $_SESSION['ultimo_envio'] < 30) {
    responder(false, 'Espera unos segundos antes de volver a enviar.', 429);
}

/* ---------- Armado del correo ---------- */
date_default_timezone_set('America/Santiago');
$fecha  = date('d-m-Y H:i');
$asunto = 'Solicitud de demo AMLIA' . ($empresa !== '' ? ' — ' . $empresa : '');
$cuerpo = "Nueva solicitud desde amlia.cl\n\n"
        . "Nombre: $nombre\n"
        . "Email: $email\n"
        . "Empresa / institución: " . ($empresa !== '' ? $empresa : '—') . "\n"
        . "Fecha: $fecha\n\n"
        . "Mensaje:\n$mensaje\n";

$enc = function ($s) { return '=?UTF-8?B?' . base64_encode($s) . '?='; };
$dominio = substr(strrchr($cfg['smtp_user'], '@'), 1) ?: 'amlia.cl';

$cabeceras = [
    'Date: ' . date('r'),
    'From: ' . $enc('Sitio AMLIA') . ' <' . $cfg['smtp_user'] . '>',
    'To: <' . $cfg['destino'] . '>',
    'Reply-To: ' . $enc($nombre) . ' <' . $email . '>',
    'Subject: ' . $enc($asunto),
    'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $dominio . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
];
$datos = implode("\r\n", $cabeceras) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($cuerpo), 76, "\r\n"));

/* ---------- Envío SMTP (SSL, puerto 465) ---------- */
function smtp_enviar($cfg, $datos) {
    $host = $cfg['smtp_host'];
    $port = (int)$cfg['smtp_port'];
    $ctx  = stream_context_create(['ssl' => [
        'verify_peer' => $cfg['verificar_ssl'] ?? true,
        'verify_peer_name' => $cfg['verificar_ssl'] ?? true,
        'allow_self_signed' => !($cfg['verificar_ssl'] ?? true),
        'peer_name' => $host,
    ]]);
    $fp = @stream_socket_client("ssl://$host:$port", $errno, $errstr, 20, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) { throw new Exception("Conexión fallida: $errstr ($errno)"); }
    stream_set_timeout($fp, 20);

    $leer = function () use ($fp) {
        $resp = '';
        while (($linea = fgets($fp, 1024)) !== false) {
            $resp .= $linea;
            if (strlen($linea) < 4 || $linea[3] === ' ') break;
        }
        return $resp;
    };
    $cmd = function ($c, $esperado) use ($fp, $leer) {
        if ($c !== null) fwrite($fp, $c . "\r\n");
        $r = $leer();
        if ((int)substr($r, 0, 3) !== $esperado) {
            throw new Exception('SMTP: respuesta inesperada a "' . strtok((string)$c, ' ') . '": ' . trim($r));
        }
        return $r;
    };

    $cmd(null, 220);
    $cmd('EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'amlia.cl'), 250);
    $cmd('AUTH LOGIN', 334);
    $cmd(base64_encode($cfg['smtp_user']), 334);
    $cmd(base64_encode($cfg['smtp_pass']), 235);
    $cmd('MAIL FROM:<' . $cfg['smtp_user'] . '>', 250);
    $cmd('RCPT TO:<' . $cfg['destino'] . '>', 250);
    $cmd('DATA', 354);
    // Escapar líneas que empiezan con punto.
    $datos = preg_replace('/^\./m', '..', $datos);
    $cmd($datos . "\r\n.", 250);
    // El correo ya fue aceptado; QUIT no debe convertir un envío exitoso en error.
    fwrite($fp, "QUIT\r\n");
    fclose($fp);
}

try {
    smtp_enviar($cfg, $datos);
    $_SESSION['ultimo_envio'] = time();
    responder(true, 'Tu mensaje fue enviado correctamente. Te contactaremos pronto.');
} catch (Exception $e) {
    error_log('[AMLIA formulario] ' . $e->getMessage());
    responder(false, 'No se pudo enviar. Inténtalo de nuevo o escríbenos por WhatsApp al +56 9 6178 4164.', 502);
}
