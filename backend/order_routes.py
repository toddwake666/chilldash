import math
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from game_models import DeliveryResult, Dispatch, Order, Position
from game_store import alive, db, expire_orders, get_record, locks, player, profile_for
from world_data import DROPOFFS, PICKUPS, dist, on_footpath, region, road_distance
from region_map import route_distance

router = APIRouter(prefix='/api')


async def dispatch_for(p):
    await expire_orders(p['id'])
    docs = await db.orders.find({'player_id': p['id'], 'status': {'$in': ['offered', 'accepted', 'picked_up']}}, {'_id': 0}).to_list(1)
    if docs:
        o = docs[0]
        if o.get('world_version') != 3:
            for field, places in [('pickup', PICKUPS), ('dropoff', DROPOFFS)]:
                match = next((v for v in places if v['name'] == o[field]['name']), None)
                if match:
                    o[field] = match
            o['world_version'] = 3
            if o['status'] == 'accepted' and not o.get('pickup_deadline'):
                o['pickup_deadline'] = time.time() + 90
            await db.orders.update_one({'id': o['id']}, {'$set': {k: o[k] for k in ['pickup', 'dropoff', 'world_version', 'pickup_deadline'] if k in o}})
        return Dispatch(orders=[Order(**o)], region=region(p['position']))
    area = region(p['position'])
    if not p['online'] or p.get('dead'):
        return Dispatch(message='You’re offline. Toggle online inside your phone when you’re ready.', region=area)
    wait = max(0, math.ceil(p.get('next_offer_at', 0) - time.time()))
    if wait:
        return Dispatch(message='No orders from this location right now. Visit other places while shops prepare new requests.', region=area, retry_after=wait)
    cooldowns = p.get('shop_cooldowns', {})
    nearby = [(i, place) for i, place in enumerate(PICKUPS) if dist(place, p['position']) < 430 and cooldowns.get(str(i), 0) <= time.time()]
    if not nearby:
        return Dispatch(message='No orders from this location. Visit the cafés and shops around the five towns.', region=area)
    i, pickup = min(nearby, key=lambda pair: dist(pair[1], p['position']))
    dropoff = DROPOFFS[i]
    # A later local request occasionally brings a rider through the forest to the other town.
    if p['deliveries'] > 0 and p['deliveries'] % 4 == 0:
        dropoff = DROPOFFS[4 if i < 4 else 0]
    seconds = max(65, min(180, int(road_distance(p['position'], pickup) / 45 + 65)))
    o = Order(id=str(uuid.uuid4()), player_id=p['id'], pickup=pickup, dropoff=dropoff,
              item=['Coffee & croissants', 'Two margherita pizzas', 'A fresh flower bouquet', 'Noodles for two', 'A box of cinnamon rolls', 'A warm lunch bowl', 'Match-day sandwiches', 'Tea and station snacks', 'Lunch for the visitor gate'][i],
              customer=['Maya', 'Leo', 'Sam', 'Alex', 'Robin', 'Jules', 'Arjun', 'Riya', 'Dev'][i], reward=25 + int(road_distance(pickup, dropoff) / 40),
              pickup_seconds=seconds, created_at=datetime.now(timezone.utc).isoformat())
    record = o.model_dump()
    record['world_version'] = 3
    await db.orders.insert_one(record)
    await db.players.update_one({'id': p['id']}, {'$set': {f'shop_cooldowns.{i}': time.time() + 180}})
    return Dispatch(orders=[o], region=area)


@router.get('/dispatch', response_model=Dispatch)
async def dispatch(p=Depends(player)):
    async with locks[p['id']]:
        return await dispatch_for(await get_record(p['id']))


@router.get('/orders', response_model=list[Order])
async def orders(p=Depends(player)):
    async with locks[p['id']]:
        return (await dispatch_for(await get_record(p['id']))).orders


@router.get('/orders/history', response_model=list[Order])
async def history(p=Depends(player)):
    docs = await db.orders.find({'player_id': p['id'], 'status': 'delivered'}, {'_id': 0}).sort('created_at', -1).limit(30).to_list(30)
    return [Order(**doc) for doc in docs]


async def owned_order(oid, p):
    await expire_orders(p['id'])
    o = await db.orders.find_one({'id': oid, 'player_id': p['id']}, {'_id': 0})
    if not o:
        raise HTTPException(404, 'Order not found.')
    if o['status'] == 'expired':
        raise HTTPException(409, 'Pickup time ran out. This order was automatically cancelled.')
    return o


@router.post('/orders/{oid}/accept', response_model=Order)
async def accept(oid: str, p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        alive(p)
        if not p['online']:
            raise HTTPException(400, 'Go online inside your phone to accept deliveries.')
        o = await owned_order(oid, p)
        if o['status'] != 'offered':
            raise HTTPException(409, 'This order is no longer available.')
        # Budget is recalculated at acceptance, including slower bicycle/pushing travel.
        seconds = max(o.get('pickup_seconds', 65), int(route_distance(p['position'], o['pickup']) / 22 + 65))
        if (p['position']['y'] - 3050) * (o['pickup']['y'] - 3050) < 0:
            seconds += 35  # A full closed-gate interval is part of the pickup allowance.
        changes = {'status': 'accepted', 'pickup_deadline': time.time() + seconds, 'pickup_seconds': seconds}
        await db.orders.update_one({'id': oid}, {'$set': changes})
        return Order(**{**o, **changes})


@router.post('/orders/{oid}/decline', response_model=Order)
async def decline(oid: str, p=Depends(player)):
    async with locks[p['id']]:
        o = await owned_order(oid, p)
        if o['status'] not in ['offered', 'accepted', 'picked_up']:
            raise HTTPException(409, 'This order is already closed.')
        status = 'declined' if o['status'] == 'offered' else 'cancelled'
        await db.orders.update_one({'id': oid}, {'$set': {'status': status}})
        await db.players.update_one({'id': p['id']}, {'$set': {'next_offer_at': time.time() + 35}})
        return Order(**{**o, 'status': status})


def arrival(body, target):
    if dist(body.model_dump(), target) > 35 or not on_footpath(body.model_dump()):
        raise HTTPException(400, 'Pull onto the footpath beside the doorway to interact.')


@router.post('/orders/{oid}/pickup', response_model=Order)
async def pickup(oid: str, body: Position, p=Depends(player)):
    async with locks[p['id']]:
        alive(await get_record(p['id']))
        o = await owned_order(oid, p)
        if o['status'] != 'accepted':
            raise HTTPException(409, 'Accept this order before collecting it.')
        arrival(body, o['pickup'])
        await db.orders.update_one({'id': oid}, {'$set': {'status': 'picked_up', 'pickup_deadline': None}})
        return Order(**{**o, 'status': 'picked_up', 'pickup_deadline': None})


@router.post('/orders/{oid}/deliver', response_model=DeliveryResult)
async def deliver(oid: str, body: Position, p=Depends(player)):
    async with locks[p['id']]:
        alive(await get_record(p['id']))
        o = await owned_order(oid, p)
        if o['status'] != 'picked_up':
            raise HTTPException(409, 'Collect the order before delivering it.')
        arrival(body, o['dropoff'])
        result = await db.orders.update_one({'id': oid, 'status': 'picked_up'}, {'$set': {'status': 'delivered'}})
        if not result.modified_count:
            raise HTTPException(409, 'This delivery is already completed.')
        await db.players.update_one({'id': p['id']}, {'$inc': {'balance': o['reward'], 'earned': o['reward'], 'deliveries': 1, 'xp': o['xp']}, '$set': {'next_offer_at': time.time() + 45}})
        return DeliveryResult(order=Order(**{**o, 'status': 'delivered'}), profile=await profile_for(p['id']))