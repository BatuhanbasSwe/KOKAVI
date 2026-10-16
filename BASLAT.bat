@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js yok! https://nodejs.org adresinden LTS surumunu kur. & pause & exit /b)
if not exist node_modules (echo Paketler kuruluyor... & call npm install)
if not exist .pgdata (echo Veritabani hazirlaniyor... & call npm run seed)
echo Uygulama aciliyor: http://localhost:5173
start "" http://localhost:5173
call npm run dev
pause
