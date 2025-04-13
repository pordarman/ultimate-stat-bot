@echo off
SET COUNT=0
:RESTART
IF %COUNT% GEQ 15 (
    echo Bot 15 kez yeniden baslatildi. Cikis yapiliyor...
    pause
    exit
)
echo Baslatiliyor... Deneme: %COUNT%
node index.js
SET /A COUNT+=1
echo Bot hata verdi. 5 saniye icinde yeniden baslatiliyor...
timeout /t 5 /nobreak >nul
goto RESTART