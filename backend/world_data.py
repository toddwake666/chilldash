import math
from region_map import can_ride, on_footpath, region, route_distance

COLS = [120, 400, 680, 960]
ROWS = [120, 400, 680, 960, 1240]
TOWN_OFFSET = 2160
GARAGE = {'x': 352, 'y': 750}
FOODS = {
    'apple': {'name': 'Crisp apple', 'price': 6, 'hunger': 22, 'energy': 10, 'health': 8},
    'sandwich': {'name': 'Picnic sandwich', 'price': 12, 'hunger': 48, 'energy': 28, 'health': 18},
    'meal': {'name': 'Warm lunch bowl', 'price': 20, 'hunger': 85, 'energy': 50, 'health': 35},
}
MILESTONES = [
    {'deliveries': 1, 'name': 'First smile', 'coins': 15, 'food': {'apple': 2}},
    {'deliveries': 5, 'name': 'Finding your rhythm', 'coins': 35, 'food': {'sandwich': 2}},
    {'deliveries': 10, 'name': 'Neighborhood favorite', 'coins': 70, 'food': {'meal': 2}},
    {'deliveries': 25, 'name': 'Two-town legend', 'coins': 150, 'food': {'meal': 4}},
    {'deliveries': 50, 'name': 'The long way home', 'coins': 300, 'food': {'meal': 6}},
]
SERVICES = [
    {'id': 'garage', 'name': 'Your garage', 'kind': 'garage', 'x': 352, 'y': 750, 'address': 'Palm Street · Sunnyvale'},
    {'id': 'sunny-fuel', 'name': 'Sunshine Fuel & Air', 'kind': 'fuel', 'x': 728, 'y': 1090, 'address': 'Garden Avenue · Sunnyvale'},
    {'id': 'sunny-repair', 'name': 'Milo’s Bike Workshop', 'kind': 'repair', 'x': 912, 'y': 860, 'address': 'Sunset Road · Sunnyvale'},
    {'id': 'pine-fuel', 'name': 'Pinecrest Fuel & Air', 'kind': 'fuel', 'x': 2512, 'y': 580, 'address': 'Pine Lane · Pinecrest'},
    {'id': 'pine-repair', 'name': 'The Spoke House', 'kind': 'repair', 'x': 2888, 'y': 870, 'address': 'Cedar Way · Pinecrest'},
    {'id': 'bongaon-fuel', 'name': 'Bongaon Fuel & Air', 'kind': 'fuel', 'x': 4248, 'y': 1260, 'address': 'Stadium Ring · Bongaon'},
    {'id': 'bongaon-repair', 'name': 'Riverbank Motors', 'kind': 'repair', 'x': 5402, 'y': 590, 'address': 'Garden Road · Bongaon'},
    {'id': 'habra-fuel', 'name': 'Habra Fuel & Air', 'kind': 'fuel', 'x': 2888, 'y': 3560, 'address': 'Station Road · Habra Town'},
    {'id': 'habra-repair', 'name': 'Railtown Cycle Works', 'kind': 'repair', 'x': 2232, 'y': 2560, 'address': 'West Road · Habra Town'},
    {'id': 'petrapole-fuel', 'name': 'Petrapole Fuel & Air', 'kind': 'fuel', 'x': 5888, 'y': 3990, 'address': 'Garden Ring · Petrapole'},
    {'id': 'petrapole-repair', 'name': 'Fairground Bike Care', 'kind': 'repair', 'x': 4828, 'y': 3990, 'address': 'Fairground Road · Petrapole'},
]
PICKUPS = [
    {'name': 'Sunny Side Café', 'address': '12 Palm Street', 'x': 352, 'y': 580},
    {'name': 'Slice of Heaven', 'address': '24 Market Lane', 'x': 560, 'y': 352},
    {'name': 'Bloom & Go', 'address': '8 Garden Avenue', 'x': 632, 'y': 870},
    {'name': 'Corner Noodles', 'address': '36 Sunset Road', 'x': 850, 'y': 632},
    {'name': 'Pine & Pastry', 'address': '4 Pine Lane', 'x': 2512, 'y': 270},
    {'name': 'Cedar Kitchen', 'address': '16 Cedar Way', 'x': 2740, 'y': 632},
    {'name': 'Ichhamati Café', 'address': 'Riverbank Lane · Bongaon', 'x': 4248, 'y': 580},
    {'name': 'Platform Chai', 'address': 'Station approach · Habra Town', 'x': 2792, 'y': 2890},
    {'name': 'Fairground Snacks', 'address': 'Park entrance · Petrapole', 'x': 5290, 'y': 3148},
]
DROPOFFS = [
    {'name': 'Maple Apartments', 'address': '7 Maple Walk', 'x': 590, 'y': 632},
    {'name': 'Sunset Studios', 'address': '18 Sunset Road', 'x': 912, 'y': 540},
    {'name': 'Palm House', 'address': '3 Palm Street', 'x': 352, 'y': 1060},
    {'name': 'Seaside Offices', 'address': '2 Ocean Drive', 'x': 820, 'y': 168},
    {'name': 'Willow Cottage', 'address': '9 Willow Crescent', 'x': 3000, 'y': 912},
    {'name': 'Cedar Terrace', 'address': '22 Cedar Way', 'x': 2328, 'y': 1080},
    {'name': 'Bongaon Football Stadium', 'address': 'Stadium north entrance', 'x': 4770, 'y': 788},
    {'name': 'Habra Garden Homes', 'address': 'South Station Road', 'x': 3060, 'y': 3428},
    {'name': 'Petrapole Army Barracks', 'address': 'Visitor gate · Petrapole', 'x': 4488, 'y': 3630},
]


def dist(a, b):
    return math.hypot(a['x'] - b['x'], a['y'] - b['y'])


def road_distance(a, b):
    if region(a) == region(b) and region(a) in ['Sunnyvale', 'Pinecrest']:
        return abs(a['x'] - b['x']) + abs(a['y'] - b['y'])
    return route_distance(a, b)