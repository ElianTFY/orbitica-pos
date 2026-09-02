import uuid
from typing import List, Optional
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.catalog import Category, TaxRate, Product, BranchProductStock
from app.schemas.catalog import CategoryCreate, CategoryUpdate, TaxRateCreate, ProductCreate, ProductUpdate
from app.core.exceptions import NotFoundException, ConflictException, BadRequestException
from app.services.audit_service import AuditService

class CatalogService:
    def __init__(self, db: AsyncSession, organization_id: uuid.UUID):
        self.db = db
        self.organization_id = organization_id

    # ---------------- CATEGORIES ----------------
    async def list_categories(self) -> List[Category]:
        stmt = select(Category).where(
            Category.organization_id == self.organization_id,
            Category.is_active == True
        ).order_by(Category.name.asc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def create_category(self, data: CategoryCreate, actor_id: uuid.UUID) -> Category:
        stmt = select(Category).where(
            Category.organization_id == self.organization_id,
            Category.name == data.name.strip()
        )
        res = await self.db.execute(stmt)
        if res.scalar_one_or_none():
            raise ConflictException(f"Ya existe una categoría llamada '{data.name}'")

        category = Category(
            organization_id=self.organization_id,
            name=data.name.strip(),
            description=data.description
        )
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    # ---------------- TAX RATES ----------------
    async def list_tax_rates(self) -> List[TaxRate]:
        stmt = select(TaxRate).where(
            TaxRate.organization_id == self.organization_id,
            TaxRate.is_active == True
        ).order_by(TaxRate.rate.desc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def create_tax_rate(self, data: TaxRateCreate) -> TaxRate:
        tax = TaxRate(
            organization_id=self.organization_id,
            name=data.name.strip(),
            code_cr=data.code_cr,
            rate=data.rate,
            is_default=data.is_default
        )
        self.db.add(tax)
        await self.db.commit()
        await self.db.refresh(tax)
        return tax

    # ---------------- PRODUCTS ----------------
    async def list_products(
        self,
        category_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        branch_id: Optional[uuid.UUID] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[dict]:
        stmt = select(Product, Category.name, TaxRate.rate).outerjoin(
            Category, Product.category_id == Category.id
        ).join(
            TaxRate, Product.tax_rate_id == TaxRate.id
        ).where(
            Product.organization_id == self.organization_id,
            Product.is_active == True
        )

        if category_id:
            stmt = stmt.where(Product.category_id == category_id)

        if search:
            s = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    Product.name.ilike(s),
                    Product.sku.ilike(s),
                    Product.barcode.ilike(s)
                )
            )

        stmt = stmt.order_by(Product.name.asc()).offset(offset).limit(limit)
        res = await self.db.execute(stmt)
        rows = res.all()

        products_data = []
        for prod, cat_name, t_rate in rows:
            curr_stock = Decimal("0.00")
            if branch_id:
                stk_stmt = select(BranchProductStock.quantity).where(
                    BranchProductStock.branch_id == branch_id,
                    BranchProductStock.product_id == prod.id
                )
                stk_res = await self.db.execute(stk_stmt)
                curr_stock = stk_res.scalar_one_or_none() or Decimal("0.00")

            products_data.append({
                "id": prod.id,
                "organization_id": prod.organization_id,
                "category_id": prod.category_id,
                "category_name": cat_name,
                "tax_rate_id": prod.tax_rate_id,
                "tax_rate": t_rate,
                "name": prod.name,
                "sku": prod.sku,
                "barcode": prod.barcode,
                "cabys_code": prod.cabys_code,
                "unit_of_measure": prod.unit_of_measure,
                "description": prod.description,
                "cost_price": prod.cost_price,
                "sale_price": prod.sale_price,
                "min_stock_alert": prod.min_stock_alert,
                "image_url": prod.image_url,
                "is_service": prod.is_service,
                "is_active": prod.is_active,
                "current_stock": curr_stock
            })

        return products_data

    async def get_product(self, product_id: uuid.UUID, branch_id: Optional[uuid.UUID] = None) -> dict:
        stmt = select(Product, Category.name, TaxRate.rate).outerjoin(
            Category, Product.category_id == Category.id
        ).join(
            TaxRate, Product.tax_rate_id == TaxRate.id
        ).where(
            Product.id == product_id,
            Product.organization_id == self.organization_id,
            Product.is_active == True
        )
        res = await self.db.execute(stmt)
        row = res.first()
        if not row:
            raise NotFoundException("Producto no encontrado")

        prod, cat_name, t_rate = row
        curr_stock = Decimal("0.00")
        if branch_id:
            stk_stmt = select(BranchProductStock.quantity).where(
                BranchProductStock.branch_id == branch_id,
                BranchProductStock.product_id == prod.id
            )
            stk_res = await self.db.execute(stk_stmt)
            curr_stock = stk_res.scalar_one_or_none() or Decimal("0.00")

        return {
            "id": prod.id,
            "organization_id": prod.organization_id,
            "category_id": prod.category_id,
            "category_name": cat_name,
            "tax_rate_id": prod.tax_rate_id,
            "tax_rate": t_rate,
            "name": prod.name,
            "sku": prod.sku,
            "barcode": prod.barcode,
            "cabys_code": prod.cabys_code,
            "unit_of_measure": prod.unit_of_measure,
            "description": prod.description,
            "cost_price": prod.cost_price,
            "sale_price": prod.sale_price,
            "min_stock_alert": prod.min_stock_alert,
            "image_url": prod.image_url,
            "is_service": prod.is_service,
            "is_active": prod.is_active,
            "current_stock": curr_stock
        }

    async def get_product_by_barcode(self, barcode: str, branch_id: Optional[uuid.UUID] = None) -> dict:
        stmt = select(Product, Category.name, TaxRate.rate).outerjoin(
            Category, Product.category_id == Category.id
        ).join(
            TaxRate, Product.tax_rate_id == TaxRate.id
        ).where(
            Product.organization_id == self.organization_id,
            Product.barcode == barcode.strip(),
            Product.is_active == True
        )
        res = await self.db.execute(stmt)
        row = res.first()
        if not row:
            raise NotFoundException("Producto no encontrado por código de barras")

        prod, cat_name, t_rate = row
        curr_stock = Decimal("0.00")
        if branch_id:
            stk_stmt = select(BranchProductStock.quantity).where(
                BranchProductStock.branch_id == branch_id,
                BranchProductStock.product_id == prod.id
            )
            stk_res = await self.db.execute(stk_stmt)
            curr_stock = stk_res.scalar_one_or_none() or Decimal("0.00")

        return {
            "id": prod.id,
            "organization_id": prod.organization_id,
            "category_id": prod.category_id,
            "category_name": cat_name,
            "tax_rate_id": prod.tax_rate_id,
            "tax_rate": t_rate,
            "name": prod.name,
            "sku": prod.sku,
            "barcode": prod.barcode,
            "cabys_code": prod.cabys_code,
            "unit_of_measure": prod.unit_of_measure,
            "description": prod.description,
            "cost_price": prod.cost_price,
            "sale_price": prod.sale_price,
            "min_stock_alert": prod.min_stock_alert,
            "image_url": prod.image_url,
            "is_service": prod.is_service,
            "is_active": prod.is_active,
            "current_stock": curr_stock
        }

    async def create_product(self, data: ProductCreate, actor_id: uuid.UUID) -> Product:
        if data.sku:
            sku_stmt = select(Product).where(
                Product.organization_id == self.organization_id,
                Product.sku == data.sku.strip(),
                Product.is_active == True
            )
            sku_res = await self.db.execute(sku_stmt)
            if sku_res.scalar_one_or_none():
                raise ConflictException(f"Ya existe un producto con el SKU '{data.sku}'")

        if data.barcode:
            bc_stmt = select(Product).where(
                Product.organization_id == self.organization_id,
                Product.barcode == data.barcode.strip(),
                Product.is_active == True
            )
            bc_res = await self.db.execute(bc_stmt)
            if bc_res.scalar_one_or_none():
                raise ConflictException(f"Ya existe un producto con el código de barras '{data.barcode}'")

        product = Product(
            organization_id=self.organization_id,
            category_id=data.category_id,
            tax_rate_id=data.tax_rate_id,
            name=data.name.strip(),
            sku=data.sku.strip() if data.sku else None,
            barcode=data.barcode.strip() if data.barcode else None,
            cabys_code=data.cabys_code.strip(),
            unit_of_measure=data.unit_of_measure.strip(),
            description=data.description,
            cost_price=data.cost_price,
            sale_price=data.sale_price,
            min_stock_alert=data.min_stock_alert,
            image_url=data.image_url,
            is_service=data.is_service
        )
        self.db.add(product)
        await self.db.flush()

        if data.branch_id and data.initial_stock and data.initial_stock > 0:
            stock = BranchProductStock(
                branch_id=data.branch_id,
                product_id=product.id,
                quantity=data.initial_stock
            )
            self.db.add(stock)

        await AuditService.log_action(
            db=self.db,
            action="PRODUCT_CREATED",
            resource="Product",
            actor_id=actor_id,
            organization_id=self.organization_id,
            resource_id=str(product.id),
            payload_after={"name": product.name, "cabys_code": product.cabys_code, "sale_price": str(product.sale_price)}
        )

        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def update_product(self, product_id: uuid.UUID, data: ProductUpdate, actor_id: uuid.UUID) -> Product:
        stmt = select(Product).where(
            Product.id == product_id,
            Product.organization_id == self.organization_id,
            Product.is_active == True
        )
        res = await self.db.execute(stmt)
        product = res.scalar_one_or_none()
        if not product:
            raise NotFoundException("Producto no encontrado")

        if data.sku and data.sku != product.sku:
            sku_stmt = select(Product).where(
                Product.organization_id == self.organization_id,
                Product.sku == data.sku.strip(),
                Product.id != product_id,
                Product.is_active == True
            )
            sku_res = await self.db.execute(sku_stmt)
            if sku_res.scalar_one_or_none():
                raise ConflictException(f"Ya existe un producto con el SKU '{data.sku}'")
            product.sku = data.sku.strip()

        if data.barcode and data.barcode != product.barcode:
            bc_stmt = select(Product).where(
                Product.organization_id == self.organization_id,
                Product.barcode == data.barcode.strip(),
                Product.id != product_id,
                Product.is_active == True
            )
            bc_res = await self.db.execute(bc_stmt)
            if bc_res.scalar_one_or_none():
                raise ConflictException(f"Ya existe un producto con el código de barras '{data.barcode}'")
            product.barcode = data.barcode.strip()

        if data.name is not None:
            product.name = data.name.strip()
        if data.category_id is not None:
            product.category_id = data.category_id
        if data.tax_rate_id is not None:
            product.tax_rate_id = data.tax_rate_id
        if data.cabys_code is not None:
            product.cabys_code = data.cabys_code.strip()
        if data.unit_of_measure is not None:
            product.unit_of_measure = data.unit_of_measure.strip()
        if data.description is not None:
            product.description = data.description
        if data.cost_price is not None:
            product.cost_price = data.cost_price
        if data.sale_price is not None:
            product.sale_price = data.sale_price
        if data.min_stock_alert is not None:
            product.min_stock_alert = data.min_stock_alert
        if data.image_url is not None:
            product.image_url = data.image_url
        if data.is_service is not None:
            product.is_service = data.is_service
        if data.is_active is not None:
            product.is_active = data.is_active

        await AuditService.log_action(
            db=self.db,
            action="PRODUCT_UPDATED",
            resource="Product",
            actor_id=actor_id,
            organization_id=self.organization_id,
            resource_id=str(product.id),
            payload_after={"name": product.name, "cabys_code": product.cabys_code, "sale_price": str(product.sale_price)}
        )

        await self.db.commit()
        await self.db.refresh(product)
        return product
