@echo off
rem Make a signed JIZURA.zxp for distribution (Windows). Needs ZXPSignCmd.exe (Adobe CEP-Resources, "ZXPSignCMD")
rem next to this file or on PATH. The self-signed certificate is created once (jizura_cert.p12) and reused.
cd /d "%~dp0"
set "Z=ZXPSignCmd.exe"
if "%JIZURA_CERT_PASS%"=="" set "JIZURA_CERT_PASS=change-this-password"
if not exist jizura_cert.p12 %Z% -selfSignedCert JP Tokyo hakoniwa JIZURA %JIZURA_CERT_PASS% jizura_cert.p12
if exist JIZURA.zxp del JIZURA.zxp
%Z% -sign com.852wa.jizura JIZURA.zxp jizura_cert.p12 %JIZURA_CERT_PASS% -tsa http://timestamp.digicert.com
%Z% -verify JIZURA.zxp
echo JIZURA.zxp ready
pause
