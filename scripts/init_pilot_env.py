"""Create private initial secrets on the deployment host without overwriting them."""
import argparse
import os
from pathlib import Path
import re
import secrets


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--domain", required=True, help="Public hostname, without https:// or a path")
    parser.add_argument("--output", type=Path, default=Path(".env.pilot"))
    args = parser.parse_args()
    domain = args.domain.strip().lower()
    if len(domain) > 253 or not re.fullmatch(r"(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", domain):
        parser.error("El dominio debe ser un hostname público, sin protocolo, puerto ni ruta.")
    if args.output.exists():
        parser.error("El archivo ya existe. Conservar las claves actuales; no se sobrescribió nada.")
    content = f"""# Privado: completar correo y proveedor antes de desplegar.
# Conservar este archivo fuera del servidor junto con los respaldos.
POS_DOMAIN={domain}
POSTGRES_PASSWORD={secrets.token_hex(32)}
JWT_SECRET_KEY={secrets.token_hex(32)}
ENCRYPTION_MASTER_KEY={secrets.token_hex(32)}

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_TLS=true

SOFTWARE_PROVIDER_TAX_ID_TYPE=
SOFTWARE_PROVIDER_TAX_ID=
SOFTWARE_PROVIDER_NAME=
"""
    fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as output:
        output.write(content)
    print(f"Creado {args.output}. Completar SMTP y datos reales del proveedor en ese archivo.")


if __name__ == "__main__":
    main()
