import math
import time
from fastapi import APIRouter, Depends, HTTPException
from game_models import CarryAction, Collision, FoodAction, Profile, Recovery, RoadsideAction, ServiceAction, Tick, TickResult
from game_store import alive, db, die, get_record, locks, player, profile_for, spend
from order_routes import dispatch_for
from world_data import FOODS, GARAGE, MILESTONES, SERVICES, can_ride, dist

router = APIRouter(prefix='/api')


@router.get('/catalog')
async def catalog():
    return {'foods': FOODS, 'milestones': MILESTONES, 'services': SERVICES, 'recovery_cost': 15}


@router.post('/game/tick', response_model=TickResult)
async def tick(body: Tick, p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        values = {'position': body.position.model_dump(), 'minutes': body.minutes, 'weather': body.weather}
        if not can_ride(values['position']):
            raise HTTPException(400, 'Stay on the roads or footpaths.')
        if not p['dead'] and not p['at_garage']:
            elapsed = body.elapsed
            moving = min(elapsed, body.moving)
            traveled = min(body.distance, moving * 180)
            hunger = max(0, p['hunger'] - elapsed * .12)
            energy = max(0, min(100, p['energy'] - moving * .09 + (elapsed - moving) * .015))
            damage = (elapsed * .38 if hunger <= 10 else 0) + (elapsed * .24 if body.weather == 'rainy' and p['gear'] != 'raincoat' else 0)
            health = max(0, p['health'] - damage)
            bike = p['bike']
            values.update({'hunger': hunger, 'energy': energy, 'health': health})
            resource = 'air' if bike == 'bicycle' else 'fuel'
            values[f'bikes.{bike}.{resource}'] = max(0, p['bikes'][bike][resource] - traveled * (.008 if bike == 'bicycle' else .014))
        await db.players.update_one({'id': p['id']}, {'$set': values})
        if values.get('health', 100) <= 0:
            await die(p['id'])
        updated = await get_record(p['id'])
        return TickResult(profile=Profile(**updated), dispatch=await dispatch_for(updated))


@router.post('/game/collision', response_model=Profile)
async def collision(body: Collision, p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        alive(p)
        if p['at_garage'] or time.time() - p.get('last_collision', 0) < 3:
            return Profile(**p)
        strong = body.kind == 'traffic'
        bike = p['bike']
        health = max(0, p['health'] - (6 if strong else 2))
        values = {'health': health, 'energy': max(0, p['energy'] - (12 if strong else 5)),
                  f'bikes.{bike}.condition': max(0, p['bikes'][bike]['condition'] - (14 if strong else 5)), 'last_collision': time.time()}
        if bike == 'bicycle':
            values[f'bikes.{bike}.air'] = max(0, p['bikes'][bike]['air'] - (8 if strong else 3))
        await db.players.update_one({'id': p['id']}, {'$set': values})
        if health <= 0:
            await die(p['id'])
        return await profile_for(p['id'])


@router.post('/food/buy', response_model=Profile)
async def buy_food(body: FoodAction, p=Depends(player)):
    async with locks[p['id']]:
        alive(await get_record(p['id']))
        await spend(p['id'], FOODS[body.item]['price'], increments={f'food.{body.item}': 1})
        return await profile_for(p['id'])


@router.post('/food/eat', response_model=Profile)
async def eat(body: FoodAction, p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        alive(p)
        if p['food'].get(body.item, 0) < 1:
            raise HTTPException(400, 'Your bag is empty. Buy food or claim a milestone reward.')
        food = FOODS[body.item]
        await db.players.update_one({'id': p['id']}, {'$inc': {f'food.{body.item}': -1}, '$set': {key: min(100, p[key] + food[key]) for key in ['health', 'energy', 'hunger']}})
        return await profile_for(p['id'])


@router.post('/gear/carry', response_model=Profile)
async def carry(body: CarryAction, p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        alive(p)
        if not p['at_garage'] or 'raincoat' not in p['owned_gear']:
            raise HTTPException(400, 'Pack or leave your owned rain kit at the garage.')
        values = {'carrying_rainkit': body.carry}
        if not body.carry:
            values['gear'] = 'everyday'
        await db.players.update_one({'id': p['id']}, {'$set': values})
        return await profile_for(p['id'])


@router.post('/gear/remote', response_model=Profile)
async def remote_gear(p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        alive(p)
        if p['carrying_rainkit']:
            return Profile(**p)
        owned = 'raincoat' in p['owned_gear']
        cost = (0 if owned else 60) + (0 if p['at_garage'] else 10)
        await spend(p['id'], cost, {'carrying_rainkit': True, 'owned_gear': list(set(p['owned_gear'] + ['raincoat']))})
        return await profile_for(p['id'])


@router.post('/milestones/{count}/claim', response_model=Profile)
async def claim(count: int, p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        alive(p)
        milestone = next((m for m in MILESTONES if m['deliveries'] == count), None)
        if not milestone or p['deliveries'] < count:
            raise HTTPException(400, 'Keep delivering to reach this milestone.')
        if count in p['claimed_milestones']:
            return Profile(**p)
        increments = {'balance': milestone['coins'], **{f'food.{k}': v for k, v in milestone['food'].items()}}
        await db.players.update_one({'id': p['id'], 'claimed_milestones': {'$ne': count}}, {'$inc': increments, '$addToSet': {'claimed_milestones': count}})
        return await profile_for(p['id'])


def service_values(p, action, remote=False):
    bike, stats = p['bike'], p['bikes'][p['bike']]
    if action == 'rest':
        return 0, {'health': 100, 'energy': 100, 'hunger': max(40, p['hunger'])}
    key = {'repair': 'condition', 'refuel': 'fuel', 'pump': 'air'}[action]
    if (action == 'pump' and bike != 'bicycle') or (action == 'refuel' and bike == 'bicycle'):
        raise HTTPException(400, 'Bicycles use tire air; motorbikes use fuel.')
    if stats[key] >= 99.9:
        raise HTTPException(400, f'Your {key} is already full.')
    cost = math.ceil((100 - stats[key]) * .25) if action == 'repair' else 12 if action == 'refuel' else 4
    return max(2, cost) + (10 if remote else 0), {f'bikes.{bike}.{key}': 100}


@router.post('/services/use', response_model=Profile)
async def service(body: ServiceAction, p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        alive(p)
        place = next((s for s in SERVICES if s['id'] == body.service_id), None)
        if not place or dist(place, p['position']) > 40:
            raise HTTPException(400, 'Ride onto the footpath beside this service stop first.')
        if body.action == 'rest' and place['kind'] != 'garage' or body.action == 'repair' and place['kind'] != 'repair' or body.action in ['refuel', 'pump'] and place['kind'] != 'fuel':
            raise HTTPException(400, 'That service is not available here.')
        cost, values = service_values(p, body.action)
        await spend(p['id'], cost, values)
        return await profile_for(p['id'])


@router.post('/services/roadside', response_model=Profile)
async def roadside(body: RoadsideAction, p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        alive(p)
        cost, values = service_values(p, body.action, True)
        await spend(p['id'], cost, values)
        return await profile_for(p['id'])


@router.post('/garage/enter', response_model=Profile)
async def enter_garage(p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        alive(p)
        if not p['at_garage'] and dist(p['position'], GARAGE) > 45:
            raise HTTPException(400, 'Ride back to the garage doorway to rest. Your GPS can guide you.')
        await db.players.update_one({'id': p['id']}, {'$set': {'at_garage': True, 'online': False, 'health': 100, 'energy': 100, 'hunger': max(40, p['hunger']), 'position': GARAGE}})
        await db.orders.update_many({'player_id': p['id'], 'status': 'offered'}, {'$set': {'status': 'declined'}})
        return await profile_for(p['id'])


@router.post('/garage/leave', response_model=Profile)
async def leave_garage(p=Depends(player)):
    alive(p)
    await db.players.update_one({'id': p['id']}, {'$set': {'at_garage': False}})
    return await profile_for(p['id'])


@router.post('/recovery', response_model=Profile)
async def recover(body: Recovery, p=Depends(player)):
    async with locks[p['id']]:
        p = await get_record(p['id'])
        if not p['dead']:
            raise HTTPException(400, 'Your rider is still on the road.')
        if body.choice == 'pay':
            if p['balance'] < 15:
                raise HTTPException(400, 'Recovery costs 15 coins. You can restart from zero instead.')
            await db.players.update_one({'id': p['id']}, {'$inc': {'balance': -15}, '$set': {'dead': False, 'health': 100, 'energy': 100, 'hunger': 80, 'position': GARAGE, 'at_garage': True, 'online': False}})
        else:
            if not body.confirm_restart:
                raise HTTPException(400, 'Confirm restarting: coins, deliveries, food and upgrades will be reset.')
            fresh = Profile(id=p['id']).model_dump()
            await db.players.update_one({'id': p['id']}, {'$set': fresh, '$unset': {'shop_cooldowns': '', 'next_offer_at': '', 'last_collision': ''}})
            await db.orders.delete_many({'player_id': p['id']})
        await db.orders.update_many({'player_id': p['id'], 'status': {'$in': ['offered', 'accepted', 'picked_up']}}, {'$set': {'status': 'cancelled'}})
        return await profile_for(p['id'])