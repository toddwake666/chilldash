from typing import Literal
from pydantic import BaseModel, Field


class Position(BaseModel):
    x: float = Field(ge=30, le=3250)
    y: float = Field(ge=30, le=1450)


class BikeState(BaseModel):
    condition: float = 100
    fuel: float = 100
    air: float = 100


class Profile(BaseModel):
    id: str
    name: str = 'Rookie rider'
    balance: int = 0
    earned: int = 0
    deliveries: int = 0
    xp: int = 0
    bike: str = 'scooter'
    gear: str = 'everyday'
    owned_bikes: list[str] = Field(default_factory=lambda: ['scooter', 'bicycle'])
    owned_gear: list[str] = Field(default_factory=lambda: ['everyday'])
    online: bool = False
    position: Position = Field(default_factory=lambda: Position(x=400, y=750))
    minutes: float = 540
    weather: Literal['sunny', 'cloudy', 'rainy'] = 'sunny'
    health: float = 100
    energy: float = 100
    hunger: float = 100
    bikes: dict[str, BikeState] = Field(default_factory=lambda: {b: BikeState() for b in ['scooter', 'bicycle', 'express']})
    food: dict[str, int] = Field(default_factory=lambda: {'apple': 2, 'sandwich': 0, 'meal': 0})
    carrying_rainkit: bool = False
    claimed_milestones: list[int] = Field(default_factory=list)
    dead: bool = False
    at_garage: bool = True
    schema_version: int = 2


class Session(BaseModel):
    token: str
    profile: Profile


class Progress(BaseModel):
    position: Position
    minutes: float = Field(ge=0, lt=1440)
    weather: Literal['sunny', 'cloudy', 'rainy']


class Tick(Progress):
    elapsed: float = Field(default=0, ge=0, le=30)
    moving: float = Field(default=0, ge=0, le=30)
    distance: float = Field(default=0, ge=0, le=6500)


class Equipment(BaseModel):
    bike: Literal['scooter', 'bicycle', 'express']
    gear: Literal['everyday', 'raincoat']


class Purchase(BaseModel):
    item: Literal['express', 'raincoat']


class Online(BaseModel):
    online: bool


class Place(Position):
    name: str
    address: str


class Order(BaseModel):
    id: str
    player_id: str
    pickup: Place
    dropoff: Place
    item: str
    customer: str
    reward: int
    xp: int = 25
    status: Literal['offered', 'accepted', 'picked_up', 'delivered', 'declined', 'cancelled', 'expired'] = 'offered'
    created_at: str
    pickup_deadline: float | None = None
    pickup_seconds: int = 90


class DeliveryResult(BaseModel):
    order: Order
    profile: Profile


class Dispatch(BaseModel):
    orders: list[Order] = Field(default_factory=list)
    message: str = ''
    region: str = ''
    retry_after: int = 0


class TickResult(BaseModel):
    profile: Profile
    dispatch: Dispatch


class FoodAction(BaseModel):
    item: Literal['apple', 'sandwich', 'meal']


class CarryAction(BaseModel):
    carry: bool


class Collision(BaseModel):
    kind: Literal['traffic', 'wall']


class ServiceAction(BaseModel):
    service_id: str
    action: Literal['repair', 'refuel', 'pump', 'rest']


class RoadsideAction(BaseModel):
    action: Literal['repair', 'refuel', 'pump']


class Recovery(BaseModel):
    choice: Literal['pay', 'restart']
    confirm_restart: bool = False