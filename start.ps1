Param(
    [switch]$SkipInstall = $false,
    [switch]$NoBrowser = $false
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[start] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[start] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[start] $msg" -ForegroundColor Red }

# 1) Node.js check
try {
    $nodeVersion = (& node -v) -replace 'v',''
} catch {
    Write-Err "Node.js no está instalado o no está en PATH. Instala Node 18+ desde https://nodejs.org/"
    exit 1
}

$major = ($nodeVersion.Split('.')[0] | ForEach-Object {[int]$_})
if ($major -lt 18) {
    Write-Err "Se requiere Node.js >= 18. Versión detectada: $nodeVersion"
    exit 1
}
Write-Info "Node.js $nodeVersion OK"

# 2) .env.local setup
$envFile = Join-Path $PSScriptRoot ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Warn ".env.local no existe. Creando plantilla..."
    @"
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
"@ | Out-File -FilePath $envFile -Encoding UTF8 -Force
    Write-Warn "Rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local antes del primer login."
}

# 3) npm install
if (-not $SkipInstall) {
    Write-Info "Instalando dependencias (npm install)..."
    npm install
} else {
    Write-Info "SkipInstall activado. Omitiendo npm install."
}

# 4) Lanzar Vite dev server
Write-Info "Arrancando en modo desarrollo (npm run dev)..."
if (-not $NoBrowser) {
    Start-Process powershell -ArgumentList "-NoProfile -Command Start-Sleep 2; Start-Process 'http://localhost:5173'" | Out-Null
}
npm run dev


