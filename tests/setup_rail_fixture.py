import json
import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from pymongo import MongoClient


def main() -> int:
    load_dotenv('/app/frontend/.env')
    load_dotenv('/app/backend/.env')

    base_url = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    if not base_url or not mongo_url or not db_name:
        raise RuntimeError('Missing EXPO_PUBLIC_BACKEND_URL or Mongo env vars')

    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})

    res = session.post(f'{base_url}/api/sessions', timeout=20)
    res.raise_for_status()
    body = res.json()
    token = body['token']
    profile = body['profile']
    pid = profile['id']

    client = MongoClient(mongo_url)
    try:
        db = client[db_name]
        db.players.update_one(
            {'id': pid},
            {
                '$set': {
                    'position': {'x': 2840, 'y': 2880},
                    'at_garage': False,
                    'world_version': 3,
                    'minutes': 660,
                    'weather': 'sunny',
                    'health': 100,
                    'hunger': 100,
                    'energy': 100,
                    'bike': 'scooter',
                    'gear': 'everyday',
                    'bikes.scooter.condition': 100,
                    'bikes.scooter.fuel': 100,
                    'bikes.scooter.air': 100,
                    'bikes.bicycle.condition': 100,
                    'bikes.bicycle.fuel': 100,
                    'bikes.bicycle.air': 100,
                }
            },
        )
    finally:
        client.close()

    out = {
        'base_url': base_url,
        'token': token,
        'profile_id': pid,
        'storage_key': 'chill-dash-session',
    }
    out_path = Path('/tmp/rail_fixture_session.json')
    out_path.write_text(json.dumps(out), encoding='utf-8')
    print(str(out_path))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
