#!/bin/bash
# Make a signed JIZURA.zxp for distribution (macOS). Needs ZXPSignCmd (Adobe CEP-Resources, "ZXPSignCMD")
# next to this file or on PATH. The self-signed certificate is created once (jizura_cert.p12) and reused.
set -e
cd "$(dirname "$0")"
Z=./ZXPSignCmd; [ -x "$Z" ] || Z=ZXPSignCmd
PASS="${JIZURA_CERT_PASS:-change-this-password}"
[ -f jizura_cert.p12 ] || "$Z" -selfSignedCert JP Tokyo hakoniwa JIZURA "$PASS" jizura_cert.p12
rm -f JIZURA.zxp
"$Z" -sign com.852wa.jizura JIZURA.zxp jizura_cert.p12 "$PASS" -tsa http://timestamp.digicert.com
"$Z" -verify JIZURA.zxp
echo "JIZURA.zxp ready"
