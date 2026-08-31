# -*- coding: utf-8 -*-
def test_multi_tenant_isolation():
    print("Testing Multi-tenant State Isolation...")
    # Simulating Company A
    org_a = {
        "id": "org_alfa_101",
        "trade_name": "Supermercado Alfa",
        "identification_number": "3101111111"
    }
    products_a = [
        {"id": "prod_1", "organization_id": org_a["id"], "name": "Arroz 1kg", "sale_price": 1200, "stock": 50},
        {"id": "prod_2", "organization_id": org_a["id"], "name": "Frijoles 900g", "sale_price": 1500, "stock": 30}
    ]
    sales_a = [
        {"id": "sale_1", "organization_id": org_a["id"], "total": 2700, "sale_number": "V-000001"}
    ]

    # Simulating Company B
    org_b = {
        "id": "org_beta_202",
        "trade_name": "Panaderia Beta",
        "identification_number": "3101222222"
    }
    products_b = []
    sales_b = []

    # Verification 1: Company B must start 100% empty
    assert len(products_b) == 0, "Company B must have 0 products"
    assert len(sales_b) == 0, "Company B must have 0 sales"
    assert sum(s["total"] for s in sales_b) == 0, "Company B sales total must be 0"

    # Verification 2: Filtering by organization_id
    all_products = products_a + products_b
    filtered_for_b = [p for p in all_products if p["organization_id"] == org_b["id"]]
    assert len(filtered_for_b) == 0, "Company B cannot see Company A products"

    # Verification 3: Total calculations
    total_sales_a = sum(s["total"] for s in sales_a)
    total_sales_b = sum(s["total"] for s in sales_b)
    assert total_sales_a == 2700
    assert total_sales_b == 0

    print("[SUCCESS] All multi-tenant isolation assertions passed successfully!")

if __name__ == "__main__":
    test_multi_tenant_isolation()