@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo Dance Content Engine - Next.js bootstrap
echo ==========================================
echo Current directory:
cd
echo.

if not exist "apps" mkdir "apps"
cd apps

if exist "web\package.json" (
  echo Next.js project already exists in apps\web
  echo.
  echo To start:
  echo   cd web
  echo   npm run dev
  pause
  exit /b 0
)

echo Checking Node.js and npm...
node -v
if errorlevel 1 (
  echo Node.js is not available in PATH.
  pause
  exit /b 1
)
npm -v
if errorlevel 1 (
  echo npm is not available in PATH.
  pause
  exit /b 1
)

echo.
echo Creating Next.js app with non-interactive options...
echo If npm asks for confirmation, use the command shown in START_HERE.md.
echo.

call npx --yes create-next-app@latest web --ts --eslint --app --src-dir --use-npm --import-alias "@/*"
if errorlevel 1 (
  echo.
  echo Next.js creation failed.
  echo If the problem is registry/network access, do not recreate the project.
  echo Run the diagnostic command from START_HERE.md.
  pause
  exit /b 1
)

echo.
echo ==========================================
echo NEXT.JS CREATED
echo ==========================================
echo Start development server:
echo   cd apps\web
echo   npm run dev
echo.
pause
