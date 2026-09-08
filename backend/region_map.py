"""Canonical regional geometry, shared with the mobile client through /api/catalog."""
import heapq
import math
import time

WIDTH, HEIGHT = 6300, 4500
ROADS = []


def point(x, y):
    return {'x': round(x, 2), 'y': round(y, 2)}


def smooth(points, steps=10):
    result = []
    for i in range(len(points) - 1):
        a, b, c, d = points[max(0, i - 1)], points[i], points[i + 1], points[min(len(points) - 1, i + 2)]
        for j in range(steps):
            t = j / steps
            result.append(point(*[.5 * (2*b[k] + (-a[k]+c[k])*t + (2*a[k]-5*b[k]+4*c[k]-d[k])*t*t + (-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t) for k in range(2)]))
    result.append(point(*points[-1]))
    return result


def road(identifier, coords, kind='street', curved=False, name=''):
    r = {'id': identifier, 'kind': kind, 'name': name, 'points': smooth(coords) if curved else [point(*p) for p in coords]}
    ROADS.append(r)
    return r


TOWNS = [
    {'id': 'sunnyvale', 'name': 'Sunnyvale', 'x': 520, 'y': 880, 'rx': 680, 'ry': 1080},
    {'id': 'pinecrest', 'name': 'Pinecrest', 'x': 2700, 'y': 900, 'rx': 680, 'ry': 1110},
    {'id': 'bongaon', 'name': 'Bongaon', 'x': 4840, 'y': 900, 'rx': 890, 'ry': 890},
    {'id': 'habra', 'name': 'Habra Town', 'x': 2740, 'y': 3080, 'rx': 930, 'ry': 880},
    {'id': 'petrapole', 'name': 'Petrapole', 'x': 5140, 'y': 3450, 'rx': 1010, 'ry': 970},
]
for town in TOWNS:
    town['outline'] = [point(town['x'] + math.cos(a) * town['rx'] * (1 + .06 * math.sin(a*5)), town['y'] + math.sin(a) * town['ry'] * (1 + .06 * math.cos(a*3))) for a in [i*math.tau/48 for i in range(49)]]

GRIDS = [
    ('sunnyvale', [120, 400, 680, 960], [120, 400, 680, 960, 1240]),
    ('pinecrest', [2280, 2560, 2840, 3120], [120, 400, 680, 960, 1240]),
    ('bongaon', [4200, 4490, 4840, 5150, 5450], [400, 740, 1080, 1420]),
    ('habra', [2280, 2560, 2840, 3280], [2380, 2720, 3380, 3720]),
    ('petrapole', [4440, 4780, 5120, 5460, 5840], [2720, 3100, 3460, 3820, 4180]),
]
BLOCKS = []
for name, cols, rows in GRIDS:
    for y in rows:
        for x1, x2 in zip(cols, cols[1:]):
            if name == 'bongaon' and y == 1080 and 4490 <= x1 < 5150:
                continue
            if name == 'petrapole' and y == 3460 and x1 >= 4780:
                continue
            if name == 'petrapole' and y == 3820 and x1 == 4440:
                continue
            road(f'{name}-h-{x1}-{y}', [(x1, y), (x2, y)])
    for x in cols:
        for y1, y2 in zip(rows, rows[1:]):
            if name == 'bongaon' and x == 4840 and y1 >= 740:
                continue
            if name == 'habra' and x == 2560 and y1 == 2720:
                continue
            if name == 'petrapole' and x in [5120, 5460] and y1 in [3100, 3460]:
                continue
            road(f'{name}-v-{x}-{y1}', [(x, y1), (x, y2)])
    for row_index, (y1, y2) in enumerate(zip(rows, rows[1:])):
        for col_index, (x1, x2) in enumerate(zip(cols, cols[1:])):
            if name == 'bongaon' and x1 in [4490, 4840] and y1 in [740, 1080]:
                continue
            if name == 'habra' and y1 == 2720:
                continue
            if name == 'petrapole' and ((x1 >= 4780 and y1 in [3100, 3460]) or (x1 == 4440 and y1 >= 3460)):
                continue
            BLOCKS.append({'id': f'{name}-{row_index}-{col_index}', 'town': name, 'x': x1 + 70, 'y': y1 + 75, 'width': x2-x1-140, 'height': y2-y1-150, 'index': row_index*(len(cols)-1)+col_index})

# Rounded outskirts and country roads replace the old rectangular town cutoffs.
road('sunnyvale-cinema-loop', [(120,1240),(100,1600),(200,1840),(580,1880),(920,1740),(960,1240)], curved=True, name='Picturehouse Avenue')
road('pinecrest-plaza-loop', [(2280,1240),(2230,1640),(2380,1940),(2780,1990),(3130,1840),(3120,1240)], curved=True, name='Diamond Boulevard')
road('pine-trail', [(960,680),(1130,680),(1300,550),(1530,590),(1710,810),(1960,820),(2160,680),(2280,680)], curved=True, name='Pine Trail')
road('sunnyvale-meadow-loop', [(120,120),(160,50),(580,45),(950,75),(1040,260),(960,400)], curved=True, name='Sunrise Bend')
road('pinecrest-east-loop', [(3120,120),(3260,260),(3260,700),(3290,1120),(3120,1240)], curved=True, name='Riverside Drive')
road('bongaon-riverwalk', [(4200,400),(4100,620),(4140,1100),(4200,1420),(4470,1580),(4890,1620),(5390,1520),(5450,1420)], curved=True, name='Stadium Ring Road')
road('bongaon-north-loop', [(4200,400),(4340,230),(4780,170),(5280,230),(5540,510),(5450,740)], curved=True, name='Bongaon Garden Road')
road('pine-habra', [(2840,1240),(3330,1670),(3240,2030),(2920,2200),(2840,2380)], curved=True, name='Habra Highway')
road('sunny-habra', [(960,1240),(1190,1550),(1650,1680),(1800,2080),(2070,2240),(2280,2380)], curved=True, name='Meadow Link')
road('habra-west-loop', [(2280,2380),(2040,2480),(1950,2810),(1970,3320),(2090,3710),(2280,3720)], curved=True, name='Station Ring Road')
road('habra-east-loop', [(3280,2380),(3450,2570),(3510,2790),(3500,3400),(3360,3820),(2840,3720)], curved=True, name='Habra East Road')
road('petrapole-ring', [(4440,2720),(4400,2470),(4850,2360),(5370,2480),(5850,2750),(6040,3290),(6060,3790),(5850,4290),(5090,4370),(4500,4270),(4440,4180)], curved=True, name='Petrapole Garden Ring')
road('bongaon-petrapole', [(5150,1420),(5650,1730),(5650,2140),(5320,2340),(5120,2720)], curved=True, name='Fairground Road')

RIVER = {'name': 'Ichhamati River', 'width': 270, 'points': smooth([(3600,-250),(3530,200),(3740,700),(3650,1200),(3860,1750),(3750,2260),(3920,2750),(3740,3290),(3910,3900),(3780,4720)], 20)}
BRIDGES = [
    {'id': 'ray-bridge', 'name': 'Ray Bridge', 'x': 3630, 'y': 400, 'start': 3330, 'end': 4040},
    {'id': 'revenuecat-bridge', 'name': 'Revenuecat Bridge', 'x': 3700, 'y': 1160, 'start': 3360, 'end': 4040},
    {'id': 'habra-bridge', 'name': 'Habra Bridge', 'x': 3910, 'y': 2720, 'start': 3490, 'end': 4230},
]
road('ray-approach-west', [(3120,400),(3330,400)], name='Ray Bridge approach')
road('ray-approach-east', [(4040,400),(4200,400)])
road('revenuecat-west', [(3120,960),(3270,1020),(3360,1160)], curved=True)
road('revenuecat-east', [(4040,1160),(4140,1150),(4200,1080)], curved=True)
road('habra-bridge-west', [(3280,2720),(3490,2720)])
road('habra-bridge-east', [(4230,2720),(4440,2720)])
for b in BRIDGES:
    road(b['id'], [(b['start'],b['y']), (b['end'],b['y'])], kind='bridge', name=b['name'])

LANDMARKS = [
    {'id':'sunnyvale-cinema','name':'Sunnyvale Picturehouse','kind':'cinema','town':'Sunnyvale','x':180,'y':1330,'width':680,'height':420,'entrance':point(500,1288),'description':'A multi-block cinema with a glowing marquee, poster walls and a rooftop ad screen.'},
    {'id':'diamond-plaza','name':'Diamond Plaza','kind':'mall','town':'Pinecrest','x':2350,'y':1330,'width':700,'height':500,'entrance':point(2720,1288),'description':'A shopping complex with glass atriums, a plaza fountain and wraparound ad displays.'},
    {'id':'bongaon-stadium','name':'Bongaon Football Stadium','kind':'stadium','town':'Bongaon','x':4550,'y':820,'width':530,'height':510,'entrance':point(4770,788),'description':'Grandstands, a football pitch and floodlights on the far bank of Ichhamati River.'},
    {'id':'habra-station','name':'Habra Railway Station','kind':'station','town':'Habra Town','x':2390,'y':2850,'width':355,'height':385,'entrance':point(2792,2890),'description':'Two platforms, regular trains and railway gates that stop all road traffic.'},
    {'id':'petrapole-park','name':'Petrapole Amusement Park','kind':'park','town':'Petrapole','x':4850,'y':3170,'width':915,'height':560,'entrance':point(5290,3148),'description':'A colorful fairground with a turning Ferris wheel, carousel and winding coaster.'},
    {'id':'petrapole-barracks','name':'Petrapole Army Barracks','kind':'barracks','town':'Petrapole','x':4500,'y':3530,'width':215,'height':570,'entrance':point(4488,3630),'description':'A fenced compound with barracks, a parade ground, sentry posts and a flag.'},
]
RAILWAY = {'name':'Habra Railway','y':3050,'start':1800,'end':3700,'cycle':60,'close_at':8,'open_at':36,'train_at':12,'train_until':36,'train_speed':105,'train_length':480,
           'gates':[{'id':'habra-west-gate','name':'Habra West Rail Gate','x':2280,'y':3050}, {'id':'habra-central-gate','name':'Habra Central Rail Gate','x':2840,'y':3050}, {'id':'habra-east-gate','name':'Habra East Rail Gate','x':3280,'y':3050}]}
# Ring roads crossing the railway also need gates, not hidden bypasses.
for road_id, name in [('habra-west-loop','Meadow'),('habra-east-loop','Riverside')]:
    route = next(r for r in ROADS if r['id'] == road_id)
    for a,b in zip(route['points'],route['points'][1:]):
        if (a['y']-3050)*(b['y']-3050) <= 0 and a['y'] != b['y']:
            x = a['x']+(3050-a['y'])*(b['x']-a['x'])/(b['y']-a['y'])
            RAILWAY['gates'].append({'id':f'habra-{name.lower()}-gate','name':f'{name} Rail Gate','x':round(x,2),'y':3050})
            break


def segment_projection(p, a, b):
    dx, dy = b['x']-a['x'], b['y']-a['y']
    t = max(0, min(1, ((p['x']-a['x'])*dx+(p['y']-a['y'])*dy)/(dx*dx+dy*dy or 1)))
    q = point(a['x']+t*dx, a['y']+t*dy)
    return math.hypot(p['x']-q['x'],p['y']-q['y']), q


SEGMENTS = [(a,b,r['kind']) for r in ROADS for a,b in zip(r['points'],r['points'][1:])]


def river_distance(p):
    return min(segment_projection(p,a,b)[0] for a,b in zip(RIVER['points'],RIVER['points'][1:]))


def nearest_road(p):
    d, q, kind = min(((*segment_projection(p,a,b),kind) for a,b,kind in SEGMENTS), key=lambda item:item[0])
    return d, q, kind


def can_ride(p):
    if not (45 < p['x'] < WIDTH-45 and 45 < p['y'] < HEIGHT-45):
        return False
    d, _, kind = nearest_road(p)
    if d > 59:
        return False
    if kind != 'bridge' and 3320 < p['x'] < 4230 and river_distance(p) < RIVER['width']/2+6:
        return False
    return True


def on_footpath(p):
    d, _, _ = nearest_road(p)
    return 39 <= d <= 59 and can_ride(p)


def region(p):
    for b in BRIDGES:
        if b['start'] <= p['x'] <= b['end'] and abs(p['y']-b['y']) < 65:
            return b['name']
    nearest = min(TOWNS, key=lambda t: ((p['x']-t['x'])/t['rx'])**2+((p['y']-t['y'])/t['ry'])**2)
    score = ((p['x']-nearest['x'])/nearest['rx'])**2+((p['y']-nearest['y'])/nearest['ry'])**2
    return nearest['name'] if score < 1.18 else 'Whispering Pines' if p['x'] < 2250 and p['y'] < 1450 else 'Countryside'


def railway_state(now=None):
    phase = (time.time() if now is None else now) % RAILWAY['cycle']
    closed = RAILWAY['close_at'] <= phase < RAILWAY['open_at']
    return {'phase':phase,'closed':closed,'wait_seconds':math.ceil(RAILWAY['open_at']-phase) if closed else 0,
            'train_visible':RAILWAY['train_at'] <= phase < RAILWAY['train_until'], 'train_x':1600+(phase-RAILWAY['train_at'])*RAILWAY['train_speed']}


def gate_blocks(a, b, now=None):
    if not railway_state(now)['closed']:
        return False
    for gate in RAILWAY['gates']:
        if abs(a['y']-gate['y']) < 101:
            continue  # Never trap a rider already between the barriers.
        if abs(b['x']-gate['x']) < 90 and ((a['y'] <= gate['y']-101 and b['y'] > gate['y']-101) or (a['y'] >= gate['y']+101 and b['y'] < gate['y']+101)):
            return True
    return False


GRAPH = {}
for a,b,_ in SEGMENTS:
    ka,kb = (a['x'],a['y']),(b['x'],b['y'])
    weight = math.hypot(a['x']-b['x'],a['y']-b['y'])
    GRAPH.setdefault(ka,[]).append((kb,weight))
    GRAPH.setdefault(kb,[]).append((ka,weight))


def route_distance(a,b):
    sa = min(SEGMENTS,key=lambda s:segment_projection(a,s[0],s[1])[0])
    sb = min(SEGMENTS,key=lambda s:segment_projection(b,s[0],s[1])[0])
    qa,qb = segment_projection(a,sa[0],sa[1])[1],segment_projection(b,sb[0],sb[1])[1]
    if sa == sb:
        return math.dist((a['x'],a['y']),(qa['x'],qa['y'])) + math.dist((qa['x'],qa['y']),(qb['x'],qb['y'])) + math.dist((b['x'],b['y']),(qb['x'],qb['y']))
    targets = {(p['x'],p['y']):math.dist((p['x'],p['y']),(qb['x'],qb['y'])) for p in sb[:2]}
    heap, seen = [], {}
    for p in sa[:2]:
        key=(p['x'],p['y']); cost=math.dist(key,(qa['x'],qa['y']))
        heapq.heappush(heap,(cost,key))
    best = float('inf')
    while heap:
        cost,key=heapq.heappop(heap)
        if cost >= seen.get(key,float('inf')):
            continue
        seen[key]=cost
        if key in targets:
            best=min(best,cost+targets[key])
        if cost > best:
            break
        for neighbor,weight in GRAPH.get(key,[]):
            heapq.heappush(heap,(cost+weight,neighbor))
    return best + math.dist((a['x'],a['y']),(qa['x'],qa['y'])) + math.dist((b['x'],b['y']),(qb['x'],qb['y']))


WORLD = {'version':3,'width':WIDTH,'height':HEIGHT,'towns':TOWNS,'roads':ROADS,'blocks':BLOCKS,'river':RIVER,'bridges':BRIDGES,'landmarks':LANDMARKS,'railway':RAILWAY}