@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   ESAT APAJH 94 - Serveur local
echo ============================================
echo.
echo Le site sera disponible sur :
echo http://localhost:5500/index.html
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:5500/index.html"
  py -3 -m http.server 5500
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:5500/index.html"
  python -m http.server 5500
  goto :end
)

echo Python n'est pas installe ou introuvable dans le PATH.
echo Installe Python puis relance ce fichier.
echo.
pause
exit /b 1

:end
echo.
echo Serveur arrete.
pause
