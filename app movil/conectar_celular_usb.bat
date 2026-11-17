@echo off
chcp 65001 > nul
echo ========================================================
echo   Configuración de Conexión USB para Biblioteca Virtual
echo ========================================================
echo.

set ADB=adb

where adb >nul 2>nul
if %ERRORLEVEL% equ 0 goto found_adb

if exist "%LOCALAPPDATA%\Android\sdk\platform-tools\adb.exe" (
    set "ADB=%LOCALAPPDATA%\Android\sdk\platform-tools\adb.exe"
    goto found_adb
)
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
    goto found_adb
)
if exist "%USERPROFILE%\AppData\Local\Android\sdk\platform-tools\adb.exe" (
    set "ADB=%USERPROFILE%\AppData\Local\Android\sdk\platform-tools\adb.exe"
    goto found_adb
)
if exist "%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe" (
    set "ADB=%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe"
    goto found_adb
)

echo [AVISO] No se encontró el comando 'adb' automáticamente en el PATH.
echo Si tienes Android Studio instalado, asegúrate de tener platform-tools en el PATH.
echo.
pause
exit /b 1

:found_adb
echo [1/2] Verificando dispositivos conectados por USB...
"%ADB%" devices
echo.
echo [2/2] Redirigiendo el puerto 8000 hacia el teléfono celular por USB...
"%ADB%" reverse tcp:8000 tcp:8000
if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo  [EXITO] El puerto 8000 se redirigio correctamente.
    echo  Tu celular ahora puede comunicarse con tu PC por USB
    echo  a traves de: http://127.0.0.1:8000/api/v1
    echo ========================================================
) else (
    echo.
    echo [ERROR] No se pudo redirigir el puerto.
    echo Asegurate de:
    echo  1. Tener el telefono conectado por cable USB a la computadora.
    echo  2. Activar "Opciones de desarrollador" y "Depuracion por USB" en tu celular.
    echo  3. Aceptar el mensaje "Permitir depuracion USB" en la pantalla de tu celular.
)
echo.
pause
