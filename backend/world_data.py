import math

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
]
PICKUPS = [
    {'name': 'Sunny Side Café', 'address': '12 Palm Street', 'x': 352, 'y': 580},
    {'name': 'Slice of Heaven', 'address': '24 Market Lane', 'x': 560, 'y': 352},
    {'name': 'Bloom & Go', 'address': '8 Garden Avenue', 'x': 632, 'y': 870},
    {'name': 'Corner Noodles', 'address': '36 Sunset Road', 'x': 850, 'y': 632},
    {'name': 'Pine & Pastry', 'address': '4 Pine Lane', 'x': 2512, 'y': 270},
    {'name': 'Cedar Kitchen', 'address': '16 Cedar Way', 'x': 2740, 'y': 632},
]
DROPOFFS = [
    {'name': 'Maple Apartments', 'address': '7 Maple Walk', 'x': 590, 'y': 632},
    {'name': 'Sunset Studios', 'address': '18 Sunset Road', 'x': 912, 'y': 540},
    {'name': 'Palm House', 'address': '3 Palm Street', 'x': 352, 'y': 1060},
    {'name': 'Seaside Offices', 'address': '2 Ocean Drive', 'x': 820, 'y': 168},
    {'name': 'Willow Cottage', 'address': '9 Willow Crescent', 'x': 3000, 'y': 912},
    {'name': 'Cedar Terrace', 'address': '22 Cedar Way', 'x': 2328, 'y': 1080},
]


def dist(a, b):
    return math.hypot(a['x'] - b['x'], a['y'] - b['y'])


def region(p):
    return 'Sunnyvale' if p['x'] < 1060 else 'Pinecrest' if p['x'] > 2220 else 'Whispering Pines'


def road_distance(a, b):
    if region(a) != region(b):
        return abs(a['y'] - 680) + abs(a['x'] - b['x']) + abs(b['y'] - 680)
    return abs(a['x'] - b['x']) + abs(a['y'] - b['y'])


def on_footpath(p):
    offset = 2160 if p['x'] > 2160 else 0
    dx = min(abs(p['x'] - (x + offset)) for x in COLS)
    dy = min(abs(p['y'] - y) for y in ROWS)
    return (39 <= dx <= 59 and dy > 37) or (39 <= dy <= 59 and dx > 37)


def can_ride(p):
    x, y = p['x'], p['y']
    if not (55 < x < 3225 and 55 < y < 1305):
        return False
    if 1015 < x < 2225:
        return abs(y - 680) < 58
    offset = 2160 if x > 2160 else 0
    return min(abs(x - (c + offset)) for c in COLS) < 59 or min(abs(y - r) for r in ROWS) < 59