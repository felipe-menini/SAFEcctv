@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 "%~dp0servidor_safe.py"
  exit /b
)
where python >nul 2>nul
if %errorlevel%==0 (
  python "%~dp0servidor_safe.py"
  exit /b
)
echo No se encontro Python 3 en este equipo.
echo El cotizador se abrira en modo navegador y podras descargar el PDF.
echo Para guardar automaticamente en cotizaciones instala Python 3 o selecciona una carpeta en Mis presupuestos.
start "SAFE Security - Cotizador" "%~dp0index.html"
pause
