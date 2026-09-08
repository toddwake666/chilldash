import asyncio
import hashlib
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from game_models import Equipment, Online, Profile, Progress, Purchase, Session
from game_store import alive, client, db, get_record, locks, player, profile_for, spend
from order_routes import router as order_router
from survival_routes import router as survival_router


async def expiry_worker():
    while True:
        await db.orders.update_many({'status': 'accepted', 'pickup_deadline': {'$lte': time.time(), '$ne': None}}, {'$set': {'status': 'expired'}})
        await asyncio.sleep(2)


@asynccontextmanager
async def lifespan(_app):
    await db.players.create_index('token_hash', unique=True)
    await db.orders.create_index([('player_id', 1), ('status', 1)])
    task = asyncio.create_task(expiry_worker())
    yield
    task.cancel()
    client.close()


app = FastAPI(title='Chill Dash', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])
api = APIRouter(prefix='/api')


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
    async with locks[p['id']]:
        if not p.get('dead'):
            await db.players.update_one({'id': p['id']}, {'$set': body.model_dump()})
        return await profile_for(p['id'])


@api.put('/profile/equipment', response_model=Profile)
async def equipment(body: Equipment, p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        alive(p)
        if body.bike not in p['owned_bikes'] or body.gear not in p['owned_gear']:
            raise HTTPException(400, 'Unlock this item before equipping it.')
        if body.bike != p['bike'] and not p['at_garage']:
            raise HTTPException(400, 'Return to the garage to switch bikes.')
        if body.gear == 'raincoat' and not p['carrying_rainkit']:
            raise HTTPException(400, 'Pack your rain kit at the garage, or request it from your phone.')
        await db.players.update_one({'id': p['id']}, {'$set': body.model_dump()})
        return await profile_for(p['id'])


@api.post('/profile/purchase', response_model=Profile)
async def purchase(body: Purchase, p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        alive(p)
        cost = 180 if body.item == 'express' else 60
        field = 'owned_bikes' if body.item == 'express' else 'owned_gear'
        if body.item in p[field]:
            return Profile(**p)
        if not p['at_garage']:
            raise HTTPException(400, 'Shop for bikes at the garage. Your phone can deliver a rain kit.')
        values = {field: p[field] + [body.item]}
        if body.item == 'raincoat':
            values['carrying_rainkit'] = True
        await spend(p['id'], cost, values)
        return await profile_for(p['id'])


@api.put('/profile/online', response_model=Profile)
async def online(body: Online, p=Depends(player)):
    async with locks[p['id']]:
        alive(await get_record(p['id']))
        await db.players.update_one({'id': p['id']}, {'$set': body.model_dump()})
        if not body.online:
            await db.orders.update_many({'player_id': p['id'], 'status': 'offered'}, {'$set': {'status': 'declined'}})
        return await profile_for(p['id'])


app.include_router(api)
app.include_router(order_router)
app.include_router(survival_router)