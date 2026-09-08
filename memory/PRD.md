# Chill Dash — Delivery Life Simulator

## Original problem and user choices
Build a mobile 2D delivery-boy life simulator. The boy has a phone, accepts orders, picks up and delivers them. A chill open city with traffic and weather. The game starts in his garage/apartment, where he picks his bike and gear. Warm sunny streets, comic-book bright.

Explicit choices: on-screen directional controls for free riding; many building-wall, banner and hoarding slots labelled **PLACE FOR ADS**; future ad integration requested (not part of this iteration); small GPS with directions; day/night cycle; online/offline mode.

## Architecture
- Expo / React Native native mobile app, also testable through Expo web preview. Installed SDK57 is source of truth.
- FastAPI REST API at environment-provided backend URL with `/api` prefix. MongoDB via MONGO_URL/DB_NAME.
- Anonymous per-device save tokens, hashed server-side; secure token storage uses the supplied storage abstraction.
- GameContext handles sessions, progression, orders, equipment, overlays and saving. City simulation handles directional motion, collision, traffic, weather and time. Memoized React Native SVG world art; garage illustration generated and hosted on managed object storage.
- Theme in `frontend/src/theme.ts`; custom Fredoka/Nunito fonts loaded using expo-font. Vector icons prewarmed at root.
- No real device GPS permission: GPS is the fictional in-game map. No external monetization SDK or payment processing in this scope.

## Personas
- Casual players wanting a relaxing, untimed city ride and delivery loop.
- Progression-minded players earning game coins to improve their bike and gear.
- App owner preparing future ad placements within the game environment.

## Core requirements (static)
1. Garage-first launch with bike and gear selection.
2. Actual player-controlled 2D free riding on streets, traffic and collision.
3. Phone offers → accept/decline → ride to pickup → collect → GPS to customer → handoff/reward.
4. Earnings, experience, purchases, chosen equipment and save position persist.
5. GPS route/minimap, online/offline, moving traffic, changing time/weather.
6. Multiple city ad placeholders with the exact requested text.
7. Safe-area aware controls, readable mobile layouts, no browser-only UI elements.

## Implemented — 2026-09-08
- Illustrated warm comic garage, two starting rides and an earnable Express scooter, everyday/rain-ready gear.
- 1120x1360 world with 12 city blocks, park/fountain, shops/apartments, crosswalks, moving cars/pedestrians, trees, benches, billboards and rider sprites.
- Hold-arrow or drag-center joystick movement, building boundaries, gentle traffic slowdown, camera-follow.
- Full persisted delivery loop with server-side state and proximity checks, coin/XP reward and wallet journal.
- Online/offline toggle; accepted deliveries stay completable offline; decline/cancel supported.
- In-game smartphone Orders/GPS/Wallet screens, live route, destination markers and interact actions.
- Day-night cycle (12 real minutes per game day), manual time/weather choices, automatic weather changes, rainy road slowdown and raincoat benefit.
- Bike and gear purchases with balance validation; visual rider changes per vehicle/kit.
- Save every12 seconds plus lifecycle/action saves, pause and return to garage, help, toast/error/retry states.
- Fixed theme compatibility, browser manifest fallback and persistent gesture mounting. Made phone dismissal immediate to avoid fading overlay intercepting a new ride input.

## Verification
- Backend pytest: 12/12 passed (`backend/tests/test_delivery_game_api.py`). Includes sessions, isolation, state transitions, proximity, duplicate reward protection, offline offers, purchases and idempotency.
- JS/Python lint and TypeScript compile passed before final polish.
- External preview at390x844 verified garage, phone, continuous riding, accept → collect → deliver at real ridden coordinates,32coins/25XP reward, wallet/history and rainy night controls.
- Final360x740 pass verified bicycle selection and matching sprite, gear-shop insufficient-balance feedback, offline phone state, going online, declining to a different order, phone GPS layout, offline clearing unaccepted offers, pause/garage return and no horizontal overflow.
- Additional curl validation: accepted order can be picked up/delivered after going offline;32coins/25XP rewarded and no new offers generated.
- Initial testing-agent report `test_reports/iteration_1.json` was frontend-partial due to selector/fading-modal timing. Main-agent self-test subsequently completed the full flow successfully. No confirmed unresolved core-flow errors.
- Final results and limitations recorded in `test_reports/self_verification.md`.

## Prioritized backlog
### P0
- None identified in verified core gameplay.
### P1
- Physical iOS/Android device playtesting and performance profiling; Expo web automated tests do not replace device QA.
- Confirm actual ad-network requirements and supported monetization SDK before wiring the existing placements. RevenueCat entitlement/subscription integration is distinct from serving display ads.
- Expand order variety, neighborhoods, character interactions and apartment activities.
### P2
- Music and game audio, additional avatar cosmetics, longer progression and achievements.
- Optional account-linked cross-device saves.
- Stronger server-authoritative movement/economy if online leaderboards or valuable rewards are introduced.

## Next tasks
1. User playtest and feedback on ride feel, art and city size.
2. Native device control/performance pass.
3. Decide future ad provider/placement behavior before live monetization integration.