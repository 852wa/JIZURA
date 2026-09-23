@echo off
rem JIZURA CEP panel - install for the current user (Windows).
rem Copies com.852wa.jizura into the CEP extensions folder and allows unsigned panels (PlayerDebugMode).
set "DEST=%APPDATA%\Adobe\CEP\extensions\com.852wa.jizura"
if exist "%DEST%" rmdir /S /Q "%DEST%"
xcopy /E /I /Y /Q "%~dp0com.852wa.jizura" "%DEST%" >nul
for %%v in (10 11 12 13 14) do reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
echo Installed: %DEST%
echo Restart After Effects, then open Window ^> Extensions ^> JIZURA.
pause
