# Home TV all'accensione
#
# Gira sul PC di casa: ogni pochi secondi chiede alla TV se è accesa e, quando passa da spenta
# ad accesa, le dice di aprire Home TV. Usa l'interfaccia di rete ufficiale delle TV Samsung (la
# stessa delle app telecomando sul telefono), non la Modalità sviluppatore.
#
# La prima volta la TV mostra una richiesta di autorizzazione: scegli "Consenti". Il permesso
# viene salvato in home-tv-token.txt, accanto a questo file.
#
# Avvio:   doppio clic su home-tv-avvio.bat (o: powershell -ExecutionPolicy Bypass -File home-tv-avvio.ps1)
# Fermare: chiudi la finestra.

param(
    [string]$TvIp = '192.168.0.170',
    [string]$AppId = 'Arn0Lnchr0.Launcher',
    [int]$EverySeconds = 3,
    [int]$DelayAfterOnSeconds = 4
)

$ErrorActionPreference = 'Stop'
$tokenFile = Join-Path $PSScriptRoot 'home-tv-token.txt'
$clientName = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('Home TV PC'))

# La TV usa un certificato proprio, non firmato da un'autorità: va accettato. Il controllo è
# scritto in C# perché viene chiamato fuori da PowerShell durante la connessione.
Add-Type -TypeDefinition @'
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
public static class HomeTvTrust {
    public static bool Accept(object sender, X509Certificate cert, X509Chain chain, SslPolicyErrors errors) { return true; }
}
'@
$trust = [Net.Security.RemoteCertificateValidationCallback][HomeTvTrust]::Accept
[Net.ServicePointManager]::ServerCertificateValidationCallback = $trust
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Write-Log($text) {
    Write-Host ((Get-Date -Format 'HH:mm:ss') + '  ' + $text)
}

# 'on', 'standby' oppure 'off' (la TV non risponde)
function Get-TvPower {
    try {
        $info = Invoke-RestMethod -Uri "http://${TvIp}:8001/api/v2/" -TimeoutSec 2
        if ($info.device.PowerState) { return $info.device.PowerState }
        return 'on'
    } catch {
        return 'off'
    }
}

function Receive-Text($ws) {
    $buffer = New-Object byte[] 8192
    $segment = New-Object ArraySegment[byte] -ArgumentList (, $buffer)
    $text = ''
    do {
        $result = $ws.ReceiveAsync($segment, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
        $text += [Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
    } while (-not $result.EndOfMessage)
    return $text
}

function Send-Text($ws, $text) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($text)
    $segment = New-Object ArraySegment[byte] -ArgumentList (, $bytes)
    $ws.SendAsync($segment, [Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
}

function Open-HomeTv {
    $token = ''
    if (Test-Path $tokenFile) { $token = (Get-Content $tokenFile -Raw).Trim() }
    $uri = "wss://${TvIp}:8002/api/v2/channels/samsung.remote.control?name=$clientName"
    if ($token) { $uri += "&token=$token" }

    $ws = New-Object Net.WebSockets.ClientWebSocket
    # PowerShell 7 ha il controllo del certificato sulla connessione stessa.
    if ($ws.Options.PSObject.Properties['RemoteCertificateValidationCallback']) {
        $ws.Options.RemoteCertificateValidationCallback = $trust
    }
    try {
        $ws.ConnectAsync([Uri]$uri, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
        # La prima risposta conferma la connessione e, la prima volta, porta il permesso (token).
        $hello = Receive-Text $ws | ConvertFrom-Json
        if ($hello.event -ne 'ms.channel.connect') {
            Write-Log ("La TV non ha accettato la connessione: " + $hello.event + " (hai scelto Consenti sulla TV?)")
            return
        }
        if ($hello.data.token -and $hello.data.token -ne $token) {
            Set-Content -Path $tokenFile -Value $hello.data.token
            Write-Log 'Permesso della TV salvato.'
        }
        $launch = @{
            method = 'ms.channel.emit'
            params = @{
                event = 'ed.apps.launch'
                to    = 'host'
                data  = @{ appId = $AppId; action_type = 'DEEP_LINK' }
            }
        } | ConvertTo-Json -Depth 5 -Compress
        Send-Text $ws $launch
        Write-Log 'Chiesto alla TV di aprire Home TV.'
        Start-Sleep -Milliseconds 800
    } catch {
        Write-Log ('Non sono riuscito ad aprire Home TV: ' + $_.Exception.Message)
    } finally {
        $ws.Dispose()
    }
}

Write-Log "Home TV all'accensione: controllo la TV $TvIp ogni $EverySeconds secondi. Chiudi la finestra per fermare."
$last = Get-TvPower
Write-Log "La TV ora è: $last"

while ($true) {
    Start-Sleep -Seconds $EverySeconds
    $now = Get-TvPower
    if ($now -ne $last) {
        Write-Log "La TV è passata da $last a $now"
        if ($now -eq 'on') {
            # Lascia alla TV il tempo di riaprire l'ultima app, poi apre Home TV sopra.
            Start-Sleep -Seconds $DelayAfterOnSeconds
            Open-HomeTv
        }
        $last = $now
    }
}
