import os
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient


# Module: shared API base URL and client fixtures for Chill Dash backend tests
load_dotenv(Path('/app/frontend/.env'))
load_dotenv(Path('/app/backend/.env'))
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL')


@pytest.fixture(scope='session')
def api_client():
    if not BASE_URL:
        pytest.skip('EXPO_PUBLIC_BACKEND_URL is missing from environment.')
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


def create_session(api_client):
    res = api_client.post(f'{BASE_URL}/api/sessions')
    assert res.status_code == 200
    data = res.json()
    assert data.get('token')
    assert data.get('profile', {}).get('id')
    return data


def complete_one_delivery(api_client, headers):
    # Advance ONLY this freshly-created test player's dispatch cooldown. The
    # cooldown itself is covered separately; avoid waiting45seconds per purchase.
    test_profile = api_client.get(f'{BASE_URL}/api/profile', headers=headers).json()
    with MongoClient(os.environ['MONGO_URL']) as mongo:
        mongo[os.environ['DB_NAME']].players.update_one(
            {'id': test_profile['id']}, {'$set': {'next_offer_at': 0}}
        )
    api_client.put(f'{BASE_URL}/api/profile/online', json={'online': True}, headers=headers)
    offer = api_client.get(f'{BASE_URL}/api/orders', headers=headers).json()[0]
    api_client.post(f"{BASE_URL}/api/orders/{offer['id']}/accept", headers=headers)
    api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/pickup",
        headers=headers,
        json={'x': offer['pickup']['x'], 'y': offer['pickup']['y']},
    )
    api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/deliver",
        headers=headers,
        json={'x': offer['dropoff']['x'], 'y': offer['dropoff']['y']},
    )


@pytest.fixture()
def auth_headers(api_client):
    session = create_session(api_client)
    return {'Authorization': f"Bearer {session['token']}"}


# Module: health/session/auth guardrails
def test_health_ok(api_client):
    res = api_client.get(f'{BASE_URL}/api/health')
    assert res.status_code == 200
    assert res.json().get('status') == 'ok'


def test_profile_requires_token(api_client):
    res = api_client.get(f'{BASE_URL}/api/profile')
    assert res.status_code == 401


def test_invalid_token_rejected(api_client):
    res = api_client.get(
        f'{BASE_URL}/api/profile',
        headers={'Authorization': 'Bearer invalid-token'},
    )
    assert res.status_code == 401


# Module: player/order isolation, transitions and online behavior
def test_two_sessions_are_isolated(api_client):
    s1 = create_session(api_client)
    s2 = create_session(api_client)
    h1 = {'Authorization': f"Bearer {s1['token']}"}
    h2 = {'Authorization': f"Bearer {s2['token']}"}

    api_client.put(f'{BASE_URL}/api/profile/online', json={'online': True}, headers=h1)
    api_client.put(f'{BASE_URL}/api/profile/online', json={'online': True}, headers=h2)
    o1 = api_client.get(f'{BASE_URL}/api/orders', headers=h1).json()[0]
    o2 = api_client.get(f'{BASE_URL}/api/orders', headers=h2).json()[0]

    assert o1['id'] != o2['id']
    other_accept = api_client.post(f"{BASE_URL}/api/orders/{o1['id']}/accept", headers=h2)
    assert other_accept.status_code == 404


def test_offline_returns_no_new_offers(auth_headers, api_client):
    api_client.put(f'{BASE_URL}/api/profile/online', json={'online': False}, headers=auth_headers)
    res = api_client.get(f'{BASE_URL}/api/orders', headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_accept_pickup_deliver_happy_path_and_persistence(auth_headers, api_client):
    # Go online and fetch first offer
    api_client.put(f'{BASE_URL}/api/profile/online', json={'online': True}, headers=auth_headers)
    offer_res = api_client.get(f'{BASE_URL}/api/orders', headers=auth_headers)
    assert offer_res.status_code == 200
    offer = offer_res.json()[0]
    assert offer['status'] == 'offered'

    # Accept
    accept = api_client.post(f"{BASE_URL}/api/orders/{offer['id']}/accept", headers=auth_headers)
    assert accept.status_code == 200
    accepted = accept.json()
    assert accepted['status'] == 'accepted'

    # Pickup near pickup point
    pickup = api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/pickup",
        headers=auth_headers,
        json={'x': offer['pickup']['x'], 'y': offer['pickup']['y']},
    )
    assert pickup.status_code == 200
    assert pickup.json()['status'] == 'picked_up'

    # Deliver near dropoff point
    before = api_client.get(f'{BASE_URL}/api/profile', headers=auth_headers).json()
    deliver = api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/deliver",
        headers=auth_headers,
        json={'x': offer['dropoff']['x'], 'y': offer['dropoff']['y']},
    )
    assert deliver.status_code == 200
    result = deliver.json()
    assert result['order']['status'] == 'delivered'
    assert result['order']['reward'] == 32
    assert result['order']['xp'] == 25

    after = api_client.get(f'{BASE_URL}/api/profile', headers=auth_headers)
    assert after.status_code == 200
    profile_after = after.json()
    assert profile_after['deliveries'] == before['deliveries'] + 1
    assert profile_after['balance'] == before['balance'] + 32
    assert profile_after['xp'] == before['xp'] + 25

    hist = api_client.get(f'{BASE_URL}/api/orders/history', headers=auth_headers)
    assert hist.status_code == 200
    assert any(x['id'] == offer['id'] and x['status'] == 'delivered' for x in hist.json())


def test_distance_validation_pickup(auth_headers, api_client):
    api_client.put(f'{BASE_URL}/api/profile/online', json={'online': True}, headers=auth_headers)
    offer = api_client.get(f'{BASE_URL}/api/orders', headers=auth_headers).json()[0]
    api_client.post(f"{BASE_URL}/api/orders/{offer['id']}/accept", headers=auth_headers)
    too_far = api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/pickup",
        headers=auth_headers,
        json={'x': 1000, 'y': 1000},
    )
    assert too_far.status_code == 400


def test_distance_validation_deliver(auth_headers, api_client):
    api_client.put(f'{BASE_URL}/api/profile/online', json={'online': True}, headers=auth_headers)
    offer = api_client.get(f'{BASE_URL}/api/orders', headers=auth_headers).json()[0]
    api_client.post(f"{BASE_URL}/api/orders/{offer['id']}/accept", headers=auth_headers)
    api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/pickup",
        headers=auth_headers,
        json={'x': offer['pickup']['x'], 'y': offer['pickup']['y']},
    )
    too_far = api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/deliver",
        headers=auth_headers,
        json={'x': 1000, 'y': 1000},
    )
    assert too_far.status_code == 400


def test_duplicate_reward_prevention(auth_headers, api_client):
    api_client.put(f'{BASE_URL}/api/profile/online', json={'online': True}, headers=auth_headers)
    offer = api_client.get(f'{BASE_URL}/api/orders', headers=auth_headers).json()[0]
    api_client.post(f"{BASE_URL}/api/orders/{offer['id']}/accept", headers=auth_headers)
    api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/pickup",
        headers=auth_headers,
        json={'x': offer['pickup']['x'], 'y': offer['pickup']['y']},
    )
    first = api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/deliver",
        headers=auth_headers,
        json={'x': offer['dropoff']['x'], 'y': offer['dropoff']['y']},
    )
    assert first.status_code == 200
    second = api_client.post(
        f"{BASE_URL}/api/orders/{offer['id']}/deliver",
        headers=auth_headers,
        json={'x': offer['dropoff']['x'], 'y': offer['dropoff']['y']},
    )
    assert second.status_code == 409


# Module: purchases/equipment consistency and persistence
def test_cannot_buy_without_balance(auth_headers, api_client):
    res = api_client.post(
        f'{BASE_URL}/api/profile/purchase',
        headers=auth_headers,
        json={'item': 'raincoat'},
    )
    assert res.status_code == 400


def test_can_buy_and_equip_after_earning(auth_headers, api_client):
    # Earn enough for raincoat (60 coins)
    complete_one_delivery(api_client, auth_headers)
    complete_one_delivery(api_client, auth_headers)

    buy_raincoat = api_client.post(
        f'{BASE_URL}/api/profile/purchase',
        headers=auth_headers,
        json={'item': 'raincoat'},
    )
    assert buy_raincoat.status_code == 200
    rain_profile = buy_raincoat.json()
    assert 'raincoat' in rain_profile['owned_gear']

    equip = api_client.put(
        f'{BASE_URL}/api/profile/equipment',
        headers=auth_headers,
        json={'bike': rain_profile['bike'], 'gear': 'raincoat'},
    )
    assert equip.status_code == 200
    assert equip.json()['gear'] == 'raincoat'


def test_purchase_idempotent_no_double_deduction(auth_headers, api_client):
    # Earn enough for raincoat and buy once
    complete_one_delivery(api_client, auth_headers)
    complete_one_delivery(api_client, auth_headers)

    p1 = api_client.get(f'{BASE_URL}/api/profile', headers=auth_headers).json()
    first = api_client.post(
        f'{BASE_URL}/api/profile/purchase',
        headers=auth_headers,
        json={'item': 'raincoat'},
    )
    assert first.status_code == 200
    p2 = api_client.get(f'{BASE_URL}/api/profile', headers=auth_headers).json()
    second = api_client.post(
        f'{BASE_URL}/api/profile/purchase',
        headers=auth_headers,
        json={'item': 'raincoat'},
    )
    assert second.status_code == 200
    p3 = api_client.get(f'{BASE_URL}/api/profile', headers=auth_headers).json()

    assert p2['balance'] == p1['balance'] - 60
    assert p3['balance'] == p2['balance']
