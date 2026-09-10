# ORBÍTICA POS

**Empresa:** ORBÍTICA STUDIO  
**Producto:** ORBÍTICA POS (SaaS Multi-tenant & Multisucursal)  
**Enfoque Inicial:** Costa Rica (Moneda CRC/USD, Impuestos IVA Costa Rica, Facturación Electrónica v4.4 Oficial)

---

## 🚀 Descripción del Proyecto

Orbítica POS es una plataforma SaaS moderna, de alto rendimiento y segura diseñada para la administración integral de comercios en Costa Rica (tiendas, minimarkets, licorerías, barberías, restaurantes y comercios).

### Stack Tecnológico:
- **Frontend:** Next.js 15+ (App Router, React 19, TypeScript, Tailwind CSS, Lucide Icons).
- **Backend:** FastAPI (Python 3.12+, Clean Architecture, Pydantic v2).
- **Base de Datos:** PostgreSQL 16+ con SQLAlchemy 2.0 (Async/Sync) y Alembic.
- **Facturación Electrónica:** Esquemas oficiales v4.4 de Hacienda Costa Rica, CAByS estricto, firma digital XAdES-EPES v1.3.2, Outbox transaccional con reintentos exponenciales y auditoría inmutable append-only.
- **Seguridad:** Argon2id, Sesiones revocables en cookies HttpOnly, RBAC, Aislamiento Cero Confianza Multi-tenant, Acceso delegado para superadmin con registro pericial.

---

## 🛠️ Estructura del Monorepo

```text
orbitica-pos/
├── apps/
│   ├── api/        # Backend FastAPI con Clean Architecture
│   └── web/        # Frontend Next.js 15 App Router
├── infra/          # Docker Compose para PostgreSQL y API
├── docs/           # Documentación arquitectónica y fiscal
├── scripts/        # Seeders y herramientas de desarrollo
└── .github/        # CI/CD Workflows
```

---

## ⚡ Inicio Rápido en Desarrollo Local

### 1. Iniciar Base de Datos y Servicios
```bash
docker compose up -d postgres redis
```

### 2. Iniciar el Backend (API)
```bash
cd apps/api
python -m venv .venv
# En Windows:
.venv\Scripts\activate
# En Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python scripts/download_official_xsds.py --verify-only
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
API Docs: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

### 3. Iniciar el Frontend (Web)
```bash
cd apps/web
npm install
npm run dev
```
Web App: [http://localhost:3000](http://localhost:3000)

### 4. Credenciales de Prueba (Demo Seeder)
- **Superadmin Orbítica:** `superadmin@orbitica.cr` / `SuperSecret123!`
- **Propietario (Owner):** `owner@sanjoseexpress.cr` / `OwnerPassword123!`
- **Cajero (POS):** `cajero@sanjoseexpress.cr` / `CashierPassword123!`

---

## 🧪 Ejecución de Pruebas Automatizadas

```bash
# Pruebas Backend
cd apps/api
pytest -v

# Verificación Frontend
cd apps/web
npm run typecheck
npm run build
```

---

## 📄 Licencia
Propiedad exclusiva de **ORBÍTICA STUDIO**. Todos los derechos reservados.
