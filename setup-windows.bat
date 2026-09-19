@echo off
setlocal
cd /d "%~dp0"

echo [1/5] Removing old dependencies...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json
if exist .expo rmdir /s /q .expo
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo [2/5] Installing dependencies...
npm install
if errorlevel 1 goto :error

echo [3/5] Aligning Expo SDK dependencies...
npx expo install --fix
if errorlevel 1 goto :error

echo [4/5] Checking Expo project...
npx expo-doctor
if errorlevel 1 goto :error

echo [5/5] Ready.
echo.
echo Run: npx expo start --web
pause
exit /b 0

:error
echo.
echo Installation failed. Check the message above.
pause
exit /b 1
