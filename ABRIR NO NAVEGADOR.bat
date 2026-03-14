@echo off
title Mewgenics Cat Manager
echo.
echo  ===========================================
echo   MEWGENICS CAT MANAGER - Iniciando...
echo  ===========================================
echo.
echo  Abrindo no navegador em http://localhost:5173
echo  (feche esta janela para parar o servidor)
echo.
start "" http://localhost:5173
"C:\Program Files\nodejs\npm.cmd" run vite
