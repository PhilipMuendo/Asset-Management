import os, sys
# Ensure the backend package is on the import path for this script
sys.path.append(os.path.abspath('backend'))
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import hash_password
from app.users.models import User, UserRole, UserStatus
from app.assets.models import Asset, AssetStatus, AssetCategory, AssetLocation, AssetSupplier
from app.database.base import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine('sqlite:///:memory:', connect_args={'check_same_thread': False})
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)
session = SessionLocal()
# admin
admin = User(first_name='Admin', last_name='User', email='admin@example.com', phone_number='111', department_id=None, job_title='Admin', role=UserRole.ADMIN, status=UserStatus.ACTIVE, password_hash=hash_password('adminpass'), must_change_password=False)
session.add(admin)
session.commit()
session.refresh(admin)
# staff
staff = User(first_name='Staff', last_name='One', email='staff@example.com', phone_number='222', department_id=None, job_title='Staff', role=UserRole.STAFF, status=UserStatus.ACTIVE, password_hash=hash_password('staffpass'), must_change_password=False)
session.add(staff)
session.commit()
session.refresh(staff)
# category, location, supplier
cat = AssetCategory(name='Cat')
loc = AssetLocation(name='Loc')
sup = AssetSupplier(name='Sup')
session.add_all([cat, loc, sup])
session.commit()
# asset
asset = Asset(name='Tool', permanent_id='T001', category_id=cat.id, location_id=loc.id, supplier_id=sup.id, status=AssetStatus.AVAILABLE, condition='Good')
session.add(asset)
session.commit()
session.refresh(asset)
# token
from app.core.security import create_access_token
from app.core.config import settings
token = create_access_token(str(staff.id))
client = TestClient(app)
client.cookies.set(settings.cookie_name, token)
# submit request
payload = {'asset_ids':[asset.id], 'purpose':'Need tool', 'expected_return_date':'2026-12-31T00:00:00'}
resp = client.post('/api/v1/borrowing/requests', json=payload)
print('POST status', resp.status_code)
print('POST json', resp.json())
# get my requests
resp2 = client.get('/api/v1/borrowing/my-requests')
print('GET status', resp2.status_code)
print('GET json', resp2.json())
