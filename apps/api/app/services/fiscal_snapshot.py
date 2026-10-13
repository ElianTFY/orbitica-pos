"""Immutable inputs for fiscal documents and receipt reprints."""
from types import SimpleNamespace

EMITTER_FIELDS = ("legal_name", "trade_name", "identification_type", "identification_number",
                  "economic_activity_code", "province_code", "canton_code", "district_code",
                  "neighborhood_code", "address_detail", "phone", "email", "country_code")
RECEIVER_FIELDS = ("name", "identification_type", "identification_number", "email", "phone",
                   "address", "economic_activity_code")
BRANCH_FIELDS = ("code", "name", "address", "phone")

def capture_fiscal_snapshot(org, customer, branch):
    def capture(obj, fields):
        return {key: getattr(obj, key, None) for key in fields} if obj else None
    return {"emitter": capture(org, EMITTER_FIELDS), "receiver": capture(customer, RECEIVER_FIELDS),
            "branch": capture(branch, BRANCH_FIELDS)}

def fiscal_parties(snapshot):
    return tuple(SimpleNamespace(**snapshot[key]) if snapshot.get(key) else None
                 for key in ("emitter", "receiver", "branch"))
