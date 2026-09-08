import math
import os
import sys
from collections import defaultdict, deque
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

sys.path.append(str(Path(__file__).resolve().parents[1]))
from region_map import WORLD, gate_blocks, railway_state


# Module: world-v3 endpoint contract and map geometry checks
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
    body = res.json()
    return body['token'], body['profile']['id']


def _segments(world):
    for road in world['roads']:
        points = road['points']
        for i in range(len(points) - 1):
            yield points[i], points[i + 1]


def _nearest_distance(point, world):
    best = float('inf')
    for a, b in _segments(world):
        dx, dy = b['x'] - a['x'], b['y'] - a['y']
        t = max(0.0, min(1.0, ((point['x'] - a['x']) * dx + (point['y'] - a['y']) * dy) / ((dx * dx + dy * dy) or 1.0)))
        qx, qy = a['x'] + t * dx, a['y'] + t * dy
        best = min(best, math.hypot(point['x'] - qx, point['y'] - qy))
    return best


def _graph(world):
    g = defaultdict(set)
    for a, b in _segments(world):
        ka, kb = (a['x'], a['y']), (b['x'], b['y'])
        g[ka].add(kb)
        g[kb].add(ka)
    return g


def _is_connected(world):
    g = _graph(world)
    nodes = list(g.keys())
    if not nodes:
        return False
    q, seen = deque([nodes[0]]), {nodes[0]}
    while q:
        n = q.popleft()
        for nb in g[n]:
            if nb not in seen:
                seen.add(nb)
                q.append(nb)
    return len(seen) == len(nodes)


def test_world_endpoint_contains_v3_with_five_towns(api_client):
    res = api_client.get(f'{BASE_URL}/api/world')
    assert res.status_code == 200
    body = res.json()
    world = body['world']
    assert world['version'] == 3
    assert (world['width'], world['height']) == (6300, 4500)
    assert [t['name'] for t in world['towns']] == ['Sunnyvale', 'Pinecrest', 'Bongaon', 'Habra Town', 'Petrapole']


def test_world_has_exactly_three_named_bridges_and_winding_river(api_client):
    world = api_client.get(f'{BASE_URL}/api/world').json()['world']
    assert len(world['bridges']) == 3
    assert [b['name'] for b in world['bridges']] == ['Ray Bridge', 'Revenuecat Bridge', 'Habra Bridge']
    river = world['river']
    assert river['name'] == 'Ichhamati River'
    assert len(river['points']) >= 150
    # Curvature sanity check: winding river should not be collinear.
    xs = [p['x'] for p in river['points']]
    ys = [p['y'] for p in river['points']]
    assert max(xs) - min(xs) > 300
    assert max(ys) - min(ys) > 3000


def test_catalog_world_matches_world_endpoint(api_client):
    world_body = api_client.get(f'{BASE_URL}/api/world').json()['world']
    catalog_body = api_client.get(f'{BASE_URL}/api/catalog').json()['world']
    assert catalog_body['version'] == 3
    assert catalog_body['width'] == world_body['width']
    assert catalog_body['height'] == world_body['height']
    assert [b['name'] for b in catalog_body['bridges']] == [b['name'] for b in world_body['bridges']]


def test_world_has_required_landmarks_and_large_cinema_plaza(api_client):
    world = api_client.get(f'{BASE_URL}/api/world').json()['world']
    landmarks = {l['id']: l for l in world['landmarks']}
    assert len(landmarks) == 6
    for key in ['sunnyvale-cinema', 'diamond-plaza', 'bongaon-stadium', 'habra-station', 'petrapole-park', 'petrapole-barracks']:
        assert key in landmarks
    assert landmarks['sunnyvale-cinema']['width'] >= 650 and landmarks['sunnyvale-cinema']['height'] >= 400
    assert landmarks['diamond-plaza']['width'] >= 680 and landmarks['diamond-plaza']['height'] >= 480


def test_world_road_graph_is_connected_and_landmarks_are_road_reachable(api_client):
    world = api_client.get(f'{BASE_URL}/api/world').json()['world']
    assert _is_connected(world)
    # Town hubs are not guaranteed to sit on asphalt centerlines; verify each town has road presence.
    road_points = [p for r in world['roads'] for p in r['points']]
    for town in world['towns']:
        assert any(
            ((p['x'] - town['x']) / town['rx']) ** 2 + ((p['y'] - town['y']) / town['ry']) ** 2 < 1.0
            for p in road_points
        )
    for landmark in world['landmarks']:
        assert _nearest_distance(landmark['entrance'], world) <= 60


# Module: railgate state windows and crossing block behavior
def test_railway_phase_windows_match_spec():
    before = railway_state(now=7.99)
    closed = railway_state(now=8.0)
    train_start = railway_state(now=12.0)
    train_end = railway_state(now=35.99)
    open_again = railway_state(now=36.0)

    assert before['closed'] is False
    assert closed['closed'] is True
    assert closed['train_visible'] is False
    assert train_start['train_visible'] is True
    assert train_end['train_visible'] is True
    assert open_again['closed'] is False
    assert open_again['train_visible'] is False


def test_gate_blocks_all_crossings_when_closed_and_opens_afterward():
    gates = WORLD['railway']['gates']
    assert len(gates) >= 5  # includes three main gates + ring-road gates
    for gate in gates:
        a = {'x': gate['x'], 'y': gate['y'] - 220}
        b = {'x': gate['x'], 'y': gate['y'] - 80}
        assert gate_blocks(a, b, now=10.0) is True
        assert gate_blocks(a, b, now=40.0) is False


def test_world_railway_endpoint_contract(api_client):
    res = api_client.get(f'{BASE_URL}/api/world/railway')
    assert res.status_code == 200
    body = res.json()
    assert 'phase' in body and 'closed' in body and 'train_visible' in body
    gate_ids = [g['id'] for g in body['gates']]
    assert 'habra-central-gate' in gate_ids
    assert any('meadow' in gid for gid in gate_ids)
    assert any('riverside' in gid for gid in gate_ids)


# Module: legacy save migration for world_version=3
def test_legacy_profile_migrates_only_position_and_world_version(api_client, mongo_db):
    token, pid = _new_session(api_client)
    headers = {'Authorization': f'Bearer {token}'}

    mongo_db.players.update_one(
        {'id': pid},
        {
            '$set': {
                'world_version': 2,
                'position': {'x': 5000, 'y': 5000},
                'balance': 123,
                'deliveries': 9,
                'xp': 77,
                'food': {'apple': 6, 'sandwich': 1, 'meal': 1},
                'owned_gear': ['everyday', 'raincoat'],
                'at_garage': False,
            }
        },
    )

    profile = api_client.get(f'{BASE_URL}/api/profile', headers=headers)
    assert profile.status_code == 200
    data = profile.json()
    assert data['world_version'] == 3
    # Invalid legacy coordinates should snap onto valid map roads.
    assert data['position'] != {'x': 5000, 'y': 5000}
    # Core progression should remain intact.
    assert data['balance'] == 123
    assert data['deliveries'] == 9
    assert data['xp'] == 77
    assert data['food']['apple'] == 6
    assert 'raincoat' in data['owned_gear']

    mongo_db.orders.delete_many({'player_id': pid})
    mongo_db.players.delete_one({'id': pid})


def test_profile_progress_accepts_new_world_bounds(api_client):
    token, _pid = _new_session(api_client)
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    within = api_client.put(
        f'{BASE_URL}/api/profile/progress',
        headers=headers,
        json={'position': {'x': 6270, 'y': 4470}, 'minutes': 600, 'weather': 'sunny'},
    )
    assert within.status_code == 200
    body = within.json()
    assert body['position']['x'] == 6270
    assert body['position']['y'] == 4470

    outside = api_client.put(
        f'{BASE_URL}/api/profile/progress',
        headers=headers,
        json={'position': {'x': 6271, 'y': 4471}, 'minutes': 601, 'weather': 'sunny'},
    )
    assert outside.status_code == 422
