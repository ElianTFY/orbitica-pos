# Arquitectura de ORBÍTICA POS

## 1. Clean Architecture en Backend (FastAPI)
- **Capa de Dominio (`app/domains/`, `app/models/`):** Entidades puras y reglas de negocio.
- **Capa de Aplicación / Servicios (`app/services/`):** Casos de uso desacoplados (Auth, Multi-tenancy, POS, Inventario).
- **Capa de Infraestructura / Repositorios (`app/repositories/`, `app/db/`):** Acceso a PostgreSQL con filtrado obligatorio por `organization_id`.
- **Capa de Interfaces / API (`app/api/v1/`):** Routers RESTful con schemas Pydantic estrictos.

## 2. Aislamiento Multi-tenant (Anti-IDOR)
Toda consulta sensible extrae el `organization_id` del token verificado criptográficamente en el servidor, garantizando aislamiento total entre empresas sin confiar en parámetros enviados por el cliente.

## 3. Libro Mayor de Inventario (Inventory Ledger)
El stock nunca se altera de forma destructiva; cada cambio genera un registro inmutable en `inventory_movements` con actor, sucursal, tipo de movimiento y timestamp en UTC.
