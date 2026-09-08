import asyncio
import hashlib
import os
import time
from collections import defaultdict
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

from game_models import Profile
from region_map import can_ride, nearest_road

load_dotenv(Path(__file__).parent / '.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
locks = defaultdict(asyncio.Lock)


async def get_record(pid):
    return await db.players.find_one({'id': pid}, {'_id': 0})


async def player(authorization: str = Header(default='')):
    token = authorization.removeprefix('Bearer ').strip()
    record = await db.players.find_one({'token_hash': hashlib.sha256(token.encode()).hexdigest()}, {'_id': 0})
    if not record:
        raise HTTPException(401, 'Your save could not be opened. Please reconnect.')
    if record.get('schema_version') != 2:
        # Add survival state without replacing any existing economy or inventory.
        defaults = Profile(id=record['id']).model_dump()
        additions = {k: v for k, v in defaults.items() if k not in record}
        additions['carrying_rainkit'] = record.get('gear') == 'raincoat'
        additions['schema_version'] = 2
        await db.players.update_one({'id': record['id']}, {'$set': additions})
        record.update(additions)
    if record.get('world_version') != 3:
        values = {'world_version': 3}
        if not can_ride(record['position']):
            values['position'] = nearest_road(record['position'])[1]
        await db.players.update_one({'id': record['id']}, {'$set': values})
        record.update(values)
    return record


async def profile_for(pid):
    return Profile(**await get_record(pid))


def alive(p):
    if p.get('dead') or p.get('health', 100) <= 0:
        raise HTTPException(409, 'Your rider needs recovery. Choose an option at the garage.')


async def spend(pid, cost, values=None, increments=None):
    update = {'$inc': {'balance': -cost, **(increments or {})}}
    if values:
        update['$set'] = values
    result = await db.players.update_one({'id': pid, 'balance': {'$gte': cost}, 'dead': False}, update)
    if not result.matched_count:
        raise HTTPException(400, f'You need {cost} coins for this. Earn more with deliveries or claim a milestone.')


async def expire_orders(pid):
    now = time.time()
    await db.orders.update_many({'player_id': pid, 'status': 'accepted', 'pickup_deadline': {'$lte': now, '$ne': None}}, {'$set': {'status': 'expired', 'active': False}})


async def die(pid):
    await db.players.update_one({'id': pid}, {'$set': {'health': 0, 'dead': True, 'online': False}})
    await db.orders.update_many({'player_id': pid, 'status': {'$in': ['offered', 'accepted', 'picked_up']}}, {'$set': {'status': 'cancelled', 'active': False}})