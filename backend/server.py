import hashlib
import math
import os
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).parent / '.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]


@asynccontextmanager
async def lifespan(_app):
    await db.players.create_index('token_hash', unique=True)
    await db.orders.create_index([('player_id', 1), ('status', 1)])
    yield
    client.close()


app = FastAPI(title='Chill Dash', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])
api = APIRouter(prefix='/api')


class Position(BaseModel):
    x: float = Field(ge=30, le=1090)
    y: float = Field(ge=30, le=1330)


class Profile(BaseModel):
    id: str
    name: str = 'Rookie rider'
    balance: int = 0
    earned: int = 0
    deliveries: int = 0
    xp: int = 0
    bike: str = 'scooter'
    gear: str = 'everyday'
    owned_bikes: list[str] = ['scooter', 'bicycle']
    owned_gear: list[str] = ['everyday']
    online: bool = False
    position: Position = Position(x=400, y=750)
    minutes: float = 540
    weather: Literal['sunny', 'cloudy', 'rainy'] = 'sunny'


class Session(BaseModel):
    token: str
    profile: Profile


class Progress(BaseModel):
    position: Position
    minutes: float = Field(ge=0, lt=1440)
    weather: Literal['sunny', 'cloudy', 'rainy']


class Equipment(BaseModel):
    bike: Literal['scooter', 'bicycle', 'express']
    gear: Literal['everyday', 'raincoat']


class Purchase(BaseModel):
    item: Literal['express', 'raincoat']


class Online(BaseModel):
    online: bool


class Place(BaseModel):
    name: str
    address: str
    x: float
    y: float


class Order(BaseModel):
    id: str
    player_id: str
    pickup: Place
    dropoff: Place
    item: str
    customer: str
    reward: int
    xp: int = 25
    status: Literal['offered', 'accepted', 'picked_up', 'delivered', 'declined', 'cancelled'] = 'offered'
    created_at: str


class DeliveryResult(BaseModel):
    order: Order
    profile: Profile


PICKUPS = [
    {'name': 'Sunny Side Café', 'address': '12 Palm Street', 'x': 400, 'y': 580},
    {'name': 'Slice of Heaven', 'address': '24 Market Lane', 'x': 560, 'y': 400},
    {'name': 'Bloom & Go', 'address': '8 Garden Avenue', 'x': 680, 'y': 870},
    {'name': 'Corner Noodles', 'address': '36 Sunset Road', 'x': 850, 'y': 680},
]
DROPOFFS = [
    {'name': 'Maple Apartments', 'address': '7 Maple Walk', 'x': 590, 'y': 680},
    {'name': 'Sunset Studios', 'address': '18 Sunset Road', 'x': 960, 'y': 540},
    {'name': 'Palm House', 'address': '3 Palm Street', 'x': 400, 'y': 1000},
    {'name': 'Seaside Offices', 'address': '2 Ocean Drive', 'x': 820, 'y': 120},
]


async def player(authorization: str = Header(default='')):
    token = authorization.removeprefix('Bearer ').strip()
    record = await db.players.find_one({'token_hash': hashlib.sha256(token.encode()).hexdigest()}, {'_id': 0})
    if not record:
        raise HTTPException(401, 'Your save could not be opened. Please reconnect.')
    return record


async def profile_for(pid):
    return Profile(**await db.players.find_one({'id': pid}, {'_id': 0, 'token_hash': 0}))


@api.get('/health')
async def health():
    await db.command('ping')
    return {'status': 'ok'}


@api.post('/sessions', response_model=Session)
async def session():
    token = secrets.token_urlsafe(32)
    profile = Profile(id=str(uuid.uuid4()))
    record = profile.model_dump()
    record['token_hash'] = hashlib.sha256(token.encode()).hexdigest()
    await db.players.insert_one(record)
    return Session(token=token, profile=profile)


@api.get('/profile', response_model=Profile)
async def get_profile(p=Depends(player)):
    return Profile(**p)


@api.put('/profile/progress', response_model=Profile)
async def save_progress(body: Progress, p=Depends(player)):
    await db.players.update_one({'id': p['id']}, {'$set': body.model_dump()})
    return await profile_for(p['id'])


@api.put('/profile/equipment', response_model=Profile)
async def equipment(body: Equipment, p=Depends(player)):
    if body.bike not in p['owned_bikes'] or body.gear not in p['owned_gear']:
        raise HTTPException(400, 'Unlock this item before equipping it.')
    await db.players.update_one({'id': p['id']}, {'$set': body.model_dump()})
    return await profile_for(p['id'])


@api.post('/profile/purchase', response_model=Profile)
async def purchase(body: Purchase, p=Depends(player)):
    cost = 180 if body.item == 'express' else 60
    field = 'owned_bikes' if body.item == 'express' else 'owned_gear'
    if body.item in p[field]:
        return Profile(**p)
    result = await db.players.update_one({'id': p['id'], 'balance': {'$gte': cost}, field: {'$ne': body.item}}, {'$inc': {'balance': -cost}, '$addToSet': {field: body.item}})
    if not result.modified_count:
        raise HTTPException(400, f'You need {cost} coins. Complete deliveries to earn more!')
    return await profile_for(p['id'])


@api.put('/profile/online', response_model=Profile)
async def online(body: Online, p=Depends(player)):
    await db.players.update_one({'id': p['id']}, {'$set': body.model_dump()})
    if not body.online:
        await db.orders.update_many({'player_id': p['id'], 'status': 'offered'}, {'$set': {'status': 'declined'}})
    return await profile_for(p['id'])


@api.get('/orders', response_model=list[Order])
async def orders(p=Depends(player)):
    current = await db.orders.find({'player_id': p['id'], 'status': {'$in': ['offered', 'accepted', 'picked_up']}}, {'_id': 0}).to_list(10)
    if current or not p['online']:
        return [Order(**o) for o in current]
    n = await db.orders.count_documents({'player_id': p['id']})
    pickup, dropoff = PICKUPS[n % 4], DROPOFFS[n % 4]
    distance = abs(pickup['x'] - dropoff['x']) + abs(pickup['y'] - dropoff['y'])
    o = Order(id=str(uuid.uuid4()), player_id=p['id'], pickup=Place(**pickup), dropoff=Place(**dropoff), item=['Coffee & croissants', 'Two margherita pizzas', 'A fresh flower bouquet', 'Noodles for two'][n % 4], customer=['Maya', 'Leo', 'Sam', 'Alex'][n % 4], reward=25 + int(distance / 40), created_at=datetime.now(timezone.utc).isoformat())
    # Atomic offer creation per player also prevents duplicate offers from concurrent polls.
    doc = await db.orders.find_one_and_update({'player_id': p['id'], 'status': {'$in': ['offered', 'accepted', 'picked_up']}}, {'$setOnInsert': o.model_dump()}, upsert=True, return_document=True, projection={'_id': 0})
    return [Order(**doc)]


@api.get('/orders/history', response_model=list[Order])
async def history(p=Depends(player)):
    docs = await db.orders.find({'player_id': p['id'], 'status': 'delivered'}, {'_id': 0}).sort('created_at', -1).limit(30).to_list(30)
    return [Order(**doc) for doc in docs]


async def owned_order(oid, p):
    o = await db.orders.find_one({'id': oid, 'player_id': p['id']}, {'_id': 0})
    if not o:
        raise HTTPException(404, 'Order not found.')
    return o


@api.post('/orders/{oid}/accept', response_model=Order)
async def accept(oid: str, p=Depends(player)):
    if not p['online']:
        raise HTTPException(400, 'Go online to accept deliveries.')
    o = await owned_order(oid, p)
    if o['status'] != 'offered':
        raise HTTPException(409, 'This order is no longer available.')
    await db.orders.update_one({'id': oid, 'status': 'offered'}, {'$set': {'status': 'accepted'}})
    return Order(**{**o, 'status': 'accepted'})


@api.post('/orders/{oid}/decline', response_model=Order)
async def decline(oid: str, p=Depends(player)):
    o = await owned_order(oid, p)
    if o['status'] not in ['offered', 'accepted', 'picked_up']:
        raise HTTPException(409, 'This order is already closed.')
    status = 'declined' if o['status'] == 'offered' else 'cancelled'
    await db.orders.update_one({'id': oid}, {'$set': {'status': status}})
    return Order(**{**o, 'status': status})


@api.post('/orders/{oid}/pickup', response_model=Order)
async def pickup(oid: str, body: Position, p=Depends(player)):
    o = await owned_order(oid, p)
    if o['status'] != 'accepted':
        raise HTTPException(409, 'Accept this order before collecting it.')
    if math.hypot(body.x - o['pickup']['x'], body.y - o['pickup']['y']) > 62:
        raise HTTPException(400, 'Ride closer to the pickup marker.')
    await db.orders.update_one({'id': oid, 'status': 'accepted'}, {'$set': {'status': 'picked_up'}})
    return Order(**{**o, 'status': 'picked_up'})


@api.post('/orders/{oid}/deliver', response_model=DeliveryResult)
async def deliver(oid: str, body: Position, p=Depends(player)):
    o = await owned_order(oid, p)
    if o['status'] != 'picked_up':
        raise HTTPException(409, 'Collect the order before delivering it.')
    if math.hypot(body.x - o['dropoff']['x'], body.y - o['dropoff']['y']) > 62:
        raise HTTPException(400, 'Ride closer to your customer.')
    result = await db.orders.update_one({'id': oid, 'status': 'picked_up'}, {'$set': {'status': 'delivered'}})
    if not result.modified_count:
        raise HTTPException(409, 'This delivery has already been completed.')
    await db.players.update_one({'id': p['id']}, {'$inc': {'balance': o['reward'], 'earned': o['reward'], 'deliveries': 1, 'xp': o['xp']}})
    return DeliveryResult(order=Order(**{**o, 'status': 'delivered'}), profile=await profile_for(p['id']))


app.include_router(api)