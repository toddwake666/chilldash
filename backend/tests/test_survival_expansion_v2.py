import os
import time
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient


# Module: environment + shared API setup for public preview testing
load_dotenv(Path('/app/frontend/.env'))
load_dotenv(Path('/app/backend/.env'))
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')


@pytest.fixture(scope='session')
def api_client():
    if not BASE_URL:
        pytest.skip('EXPO_PUBLIC_BACKEND_URL is missing from environment.')
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


@pytest.fixture(scope='session')
def mongo_db():
    if not MONGO_URL or not DB_NAME:
        pytest.skip('MONGO_URL or DB_NAME missing from backend/.env')
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    client.close()


def _new_session(api_client):
    res = api_client.post(f'{BASE_URL}/api/sessions')
    assert res.status_code == 200
    data = res.json()
    assert data.get('token') and data.get('profile', {}).get('id')
    return data['token'], data['profile']['id']


@pytest.fixture()
def identity(api_client, mongo_db):
    token, pid = _new_session(api_client)
    headers = {'Authorization': f'Bearer {token}'}
    yield {'headers': headers, 'id': pid}
    mongo_db.orders.delete_many({'player_id': pid})
    mongo_db.players.delete_one({'id': pid})


def _json(response):
    assert response.headers.get('content-type', '').startswith('application/json')
    return response.json()


def _go_online_and_get_offer(api_client, headers):
    online = api_client.put(f'{BASE_URL}/api/profile/online', headers=headers, json={'online': True})
    assert online.status_code == 200
    offers = api_client.get(f'{BASE_URL}/api/orders', headers=headers)
    assert offers.status_code == 200
    data = offers.json()
    assert len(data) == 1
    return data[0]


# Module: dispatch / orders / pickup-deadline behavior
def test_dispatch_message_and_phone_status_flow(identity, api_client):
    headers = identity['headers']
    offline = api_client.get(f'{BASE_URL}/api/dispatch', headers=headers)
    assert offline.status_code == 200
    offline_body = _json(offline)
    assert 'offline' in offline_body['message'].lower()
    assert offline_body['orders'] == []

    online = api_client.put(f'{BASE_URL}/api/profile/online', headers=headers, json={'online': True})
    assert online.status_code == 200
    offers = api_client.get(f'{BASE_URL}/api/orders', headers=headers)
    assert offers.status_code == 200
    first = offers.json()[0]
    assert first['status'] == 'offered'
    assert first['reward'] == 32
    assert first['xp'] == 25


def test_no_offers_in_forest_region(identity, api_client):
    headers = identity['headers']
    online = api_client.put(f'{BASE_URL}/api/profile/online', headers=headers, json={'online': True})
    assert online.status_code == 200
    save = api_client.put(
        f'{BASE_URL}/api/profile/progress',
        headers=headers,
        json={'position': {'x': 1500, 'y': 680}, 'minutes': 600, 'weather': 'sunny'},
    )
    assert save.status_code == 200
    dispatch = api_client.get(f'{BASE_URL}/api/dispatch', headers=headers)
    assert dispatch.status_code == 200
    body = dispatch.json()
    assert body['orders'] == []
    assert 'no orders' in body['message'].lower()


def test_pickup_requires_footpath_not_road(identity, api_client):
    headers = identity['headers']
    offer = _go_online_and_get_offer(api_client, headers)
    accept = api_client.post(f"{BASE_URL}/api/orders/{offer['id']}/accept", headers=headers)
    assert accept.status_code == 200

    wrong = api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/pickup",
        headers=headers,
        json={'x': 370, 'y': 580},
    )
    assert wrong.status_code == 400
    assert 'footpath' in wrong.json()['detail'].lower()


def test_pickup_expiry_worker_auto_cancels_and_pickup_rejects(identity, api_client, mongo_db):
    headers = identity['headers']
    pid = identity['id']
    offer = _go_online_and_get_offer(api_client, headers)
    accept = api_client.post(f"{BASE_URL}/api/orders/{offer['id']}/accept", headers=headers)
    assert accept.status_code == 200

    mongo_db.orders.update_one(
        {'id': offer['id'], 'player_id': pid},
        {'$set': {'pickup_deadline': time.time() - 2, 'status': 'accepted'}},
    )
    time.sleep(3)

    pickup = api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/pickup",
        headers=headers,
        json={'x': offer['pickup']['x'], 'y': offer['pickup']['y']},
    )
    assert pickup.status_code == 409
    assert 'automatically cancelled' in pickup.json()['detail'].lower()


def test_pickup_clears_deadline_and_delivery_has_no_expiry(identity, api_client):
    headers = identity['headers']
    offer = _go_online_and_get_offer(api_client, headers)
    accept = api_client.post(f"{BASE_URL}/api/orders/{offer['id']}/accept", headers=headers)
    assert accept.status_code == 200
    accepted = accept.json()
    assert accepted['pickup_deadline'] is not None

    pickup = api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/pickup",
        headers=headers,
        json={'x': offer['pickup']['x'], 'y': offer['pickup']['y']},
    )
    assert pickup.status_code == 200
    picked = pickup.json()
    assert picked['status'] == 'picked_up'
    assert picked['pickup_deadline'] is None

    time.sleep(2)
    deliver = api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/deliver",
        headers=headers,
        json={'x': offer['dropoff']['x'], 'y': offer['dropoff']['y']},
    )
    assert deliver.status_code == 200
    assert deliver.json()['order']['status'] == 'delivered'


# Module: survival ticks / food / collisions / services
def test_hunger_and_rain_drain_health_outside_garage(identity, api_client):
    headers = identity['headers']
    leave = api_client.post(f'{BASE_URL}/api/garage/leave', headers=headers)
    assert leave.status_code == 200

    before = api_client.get(f'{BASE_URL}/api/profile', headers=headers).json()
    tick = api_client.post(
        f'{BASE_URL}/api/game/tick',
        headers=headers,
        json={
            'position': {'x': 400, 'y': 750},
            'minutes': before['minutes'] + 1,
            'weather': 'rainy',
            'elapsed': 20,
            'moving': 0,
            'distance': 0,
        },
    )
    assert tick.status_code == 200
    profile = tick.json()['profile']
    assert profile['hunger'] < before['hunger']
    assert profile['health'] < before['health']


def test_garage_tick_does_not_reduce_survival_stats(identity, api_client):
    headers = identity['headers']
    before = api_client.get(f'{BASE_URL}/api/profile', headers=headers).json()
    tick = api_client.post(
        f'{BASE_URL}/api/game/tick',
        headers=headers,
        json={
            'position': {'x': 400, 'y': 750},
            'minutes': before['minutes'] + 1,
            'weather': 'rainy',
            'elapsed': 20,
            'moving': 10,
            'distance': 500,
        },
    )
    assert tick.status_code == 200
    profile = tick.json()['profile']
    assert profile['hunger'] == before['hunger']
    assert profile['health'] == before['health']


def test_food_buy_and_eat_changes_inventory_and_vitals(identity, api_client, mongo_db):
    headers = identity['headers']
    pid = identity['id']
    mongo_db.players.update_one({'id': pid}, {'$set': {'balance': 40, 'health': 55, 'energy': 40, 'hunger': 35}})

    buy = api_client.post(f'{BASE_URL}/api/food/buy', headers=headers, json={'item': 'apple'})
    assert buy.status_code == 200
    after_buy = buy.json()
    assert after_buy['food']['apple'] >= 3
    assert after_buy['balance'] == 34

    eat = api_client.post(f'{BASE_URL}/api/food/eat', headers=headers, json={'item': 'apple'})
    assert eat.status_code == 200
    after_eat = eat.json()
    assert after_eat['food']['apple'] == after_buy['food']['apple'] - 1
    assert after_eat['hunger'] > after_buy['hunger']
    assert after_eat['energy'] > after_buy['energy']
    assert after_eat['health'] > after_buy['health']


def test_collision_cooldown_enforced(identity, api_client):
    headers = identity['headers']
    leave = api_client.post(f'{BASE_URL}/api/garage/leave', headers=headers)
    assert leave.status_code == 200
    first = api_client.post(f'{BASE_URL}/api/game/collision', headers=headers, json={'kind': 'traffic'})
    assert first.status_code == 200
    one = first.json()
    second = api_client.post(f'{BASE_URL}/api/game/collision', headers=headers, json={'kind': 'traffic'})
    assert second.status_code == 200
    two = second.json()
    assert two['health'] == one['health']
    assert two['bikes'][two['bike']]['condition'] == one['bikes'][one['bike']]['condition']


def test_roadside_refuel_cost_and_insufficient_funds(identity, api_client, mongo_db):
    headers = identity['headers']
    pid = identity['id']
    mongo_db.players.update_one({'id': pid}, {'$set': {'bike': 'scooter', 'balance': 21, 'bikes.scooter.fuel': 0}})
    fail = api_client.post(f'{BASE_URL}/api/services/roadside', headers=headers, json={'action': 'refuel'})
    assert fail.status_code == 400
    assert 'need 22 coins' in fail.json()['detail'].lower()

    mongo_db.players.update_one({'id': pid}, {'$set': {'balance': 22}})
    ok = api_client.post(f'{BASE_URL}/api/services/roadside', headers=headers, json={'action': 'refuel'})
    assert ok.status_code == 200
    body = ok.json()
    assert body['balance'] == 0
    assert body['bikes']['scooter']['fuel'] == 100


def test_service_requires_nearby_and_valid_action(identity, api_client, mongo_db):
    headers = identity['headers']
    pid = identity['id']
    mongo_db.players.update_one({'id': pid}, {'$set': {'balance': 100, 'bike': 'scooter', 'position': {'x': 400, 'y': 750}, 'at_garage': False}})

    far = api_client.post(
        f'{BASE_URL}/api/services/use',
        headers=headers,
        json={'service_id': 'sunny-fuel', 'action': 'refuel'},
    )
    assert far.status_code == 400
    assert 'footpath beside this service stop' in far.json()['detail'].lower()

    mongo_db.players.update_one({'id': pid}, {'$set': {'position': {'x': 728, 'y': 1090}}})
    wrong = api_client.post(
        f'{BASE_URL}/api/services/use',
        headers=headers,
        json={'service_id': 'sunny-fuel', 'action': 'repair'},
    )
    assert wrong.status_code == 400
    assert 'not available here' in wrong.json()['detail'].lower()


# Module: death / recovery / restart semantics
def test_recovery_rejected_when_alive(identity, api_client):
    headers = identity['headers']
    res = api_client.post(f'{BASE_URL}/api/recovery', headers=headers, json={'choice': 'pay'})
    assert res.status_code == 400
    assert 'still on the road' in res.json()['detail'].lower()


def test_death_blocks_food_and_pay_recovery_cancels_active_order(identity, api_client, mongo_db):
    headers = identity['headers']
    pid = identity['id']
    offer = _go_online_and_get_offer(api_client, headers)
    api_client.post(f"{BASE_URL}/api/orders/{offer['id']}/accept", headers=headers)
    mongo_db.players.update_one({'id': pid}, {'$set': {'dead': True, 'health': 0, 'balance': 40}})

    eat = api_client.post(f'{BASE_URL}/api/food/eat', headers=headers, json={'item': 'apple'})
    assert eat.status_code == 409

    recover = api_client.post(f'{BASE_URL}/api/recovery', headers=headers, json={'choice': 'pay'})
    assert recover.status_code == 200
    body = recover.json()
    assert body['dead'] is False
    assert body['balance'] == 25
    assert body['at_garage'] is True

    order_doc = mongo_db.orders.find_one({'id': offer['id'], 'player_id': pid}, {'_id': 0})
    assert order_doc['status'] == 'cancelled'


def test_restart_recovery_resets_progress(identity, api_client, mongo_db):
    headers = identity['headers']
    pid = identity['id']
    mongo_db.players.update_one(
        {'id': pid},
        {'$set': {'dead': True, 'health': 0, 'balance': 99, 'deliveries': 3, 'xp': 77, 'owned_gear': ['everyday', 'raincoat'], 'food.apple': 5}},
    )
    bad = api_client.post(f'{BASE_URL}/api/recovery', headers=headers, json={'choice': 'restart', 'confirm_restart': False})
    assert bad.status_code == 400

    ok = api_client.post(f'{BASE_URL}/api/recovery', headers=headers, json={'choice': 'restart', 'confirm_restart': True})
    assert ok.status_code == 200
    profile = ok.json()
    assert profile['balance'] == 0
    assert profile['deliveries'] == 0
    assert profile['xp'] == 0
    assert profile['food']['apple'] == 2
    assert profile['owned_gear'] == ['everyday']


# Module: contract checks / serialization
def test_invalid_api_payload_and_serialization_shapes(identity, api_client):
    headers = identity['headers']

    bad_tick = api_client.post(
        f'{BASE_URL}/api/game/tick',
        headers=headers,
        json={'position': {'x': 400, 'y': 750}, 'minutes': 550, 'weather': 'snowy', 'elapsed': 1, 'moving': 0, 'distance': 0},
    )
    assert bad_tick.status_code == 422

    profile = api_client.get(f'{BASE_URL}/api/profile', headers=headers)
    assert profile.status_code == 200
    body = profile.json()
    assert '_id' not in body
    assert isinstance(body['bikes'], dict)
    assert isinstance(body['food'], dict)
    assert isinstance(body['claimed_milestones'], list)
