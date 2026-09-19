@echo off
setlocal
cd /d "%~dp0"
echo === Node ===
node -v
echo === npm ===
npm -v
echo === Expo ===
npx expo --version
echo === Babel preset ===
node -e "console.log(require.resolve('babel-preset-expo/package.json'))"
echo === Expo doctor ===
npx expo-doctor
pause
