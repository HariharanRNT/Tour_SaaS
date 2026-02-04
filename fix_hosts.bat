@echo off
echo Requesting Administrator privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Success: Administrative permissions confirmed.
) else (
    echo Failure: Current permissions inadequate.
    echo Please right-click this file and select "Run as administrator".
    pause
    exit
)

echo Adding haritravels.local to hosts file...
echo. >> C:\Windows\System32\drivers\etc\hosts
echo 127.0.0.1 haritravels.local >> C:\Windows\System32\drivers\etc\hosts

echo Done! You should now be able to access http://haritravels.local:3000
echo.
echo Test ping:
ping -n 4 haritravels.local
pause
