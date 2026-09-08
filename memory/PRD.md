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

## Survival & Two-Town Expansion — 2026-09-08

### User requirements and clarified choices
- Only the phone toggles online/offline. HUD next to time/weather shows status and opens instructions.
- Location-dependent intermittent delivery offers; quiet areas invite exploration. Pickup deadline begins on acceptance and auto-cancels if missed; no delivery deadline after collecting.
- Persistent health, hunger, energy, per-bike condition/fuel/tire air. Collisions hurt rider and vehicle. Starvation/rain drain health; food and garage rest recover it.
- Paid repair shops and fuel/air stations, slow pushing when empty/broken, paid roadside support.
- Phone food shop/inventory and claimable delivery milestones awarding coins/food.
- Pack/leave rain kit at garage; wear/take off on phone. Remote retrieval adds10coins; new kit costs60+10 on road.
- Death: pay15coins and respawn at garage keeping progression, or explicitly confirm restart from zero. Both cancel the active delivery. Insufficient coins disables paid recovery.
- Footpath-only pickup/dropoff, larger world with different houses in a second town, building-free forest and connecting road.

### Implemented
- Split API into game_models/game_store/order_routes/survival_routes/world_data with typed responses, legacy save migration, serialized player actions and background pickup expiry worker.
- Dispatch radius430, per-shop cooldown180seconds, post-decline35seconds/post-delivery45seconds quiet period. Offers stay in phone when already issued; no new forest offers. Pickup time recalculated from travel distance at accept, minimum65seconds.
- Heartbeat every3seconds, foreground outdoors survival ticks including phone/panels. Real-world pickup deadlines continue across menus/background. Survival does not advance while app is backgrounded.
- Hunger drains0.12/sec; hunger<=10 drains health0.38/sec. Unprotected rain drains health0.24/sec. Movement drains energy, fuel/air. Low health/energy/condition reduces speed.
- Traffic collision: condition-14,health-6,energy-12; walls: condition-5,health-2,energy-5.3second hit cooldown. Bicycle collisions also lower air.
- Fuel fill12coins; air4; repairs25% of missing condition rounded up(min2). Roadside adds10coins. Empty/broken rides push at23worldunits/sec.
- Starter bag2apples. Phone foods restore health/energy/hunger. Milestones at1/5/10/25/50deliveries with idempotent claims.
- Physical garage entry required at its doorway, no pause-menu teleport. Entry restores health/energy and minimum40hunger, not bike resources. Pause offers GPS home.
- World3280x1480: Sunnyvale plus Pinecrest with pitched-roof homes and shops. Whispering Pines forest contains scenery/pond/trees and Pine Trail at y680, no buildings. Actual rides through the full connection verified.
- Compact survival HUD, seven horizontally scrolling phone app chips, food/kit/care/milestone screens, station interaction sheets and non-dismissible recovery choice with explicit destructive confirmation.
- Pickups/dropoffs within35units and on a footpath; road-center attempts reject. GPS avoids unnecessary center-line detours when already sharing a street/footpath.
- Controls explicitly disabled during pending actions/overlays for input consistency and deterministic automation.

### Updated verification
- All27backend tests pass after updating5legacy expectations for footpaths/cooldowns (not weakening current rules).
- Full UI: physicalfootpathpickup→physicalfootpathdelivery→32coins/25XP→claim15coin/2applemilestone→buy/eatsandwich, all passed.
- UI forest trip: actualride from Sunnyvale through forest to Pinecrest and GPS to Pinecrest station passed.
- UI empty-air bicycle remained controllable in slowPUSHINGmode;14coinroadsideairandinsufficient-fundsfeedbackpassed.
- UI death: real rainy tick simulation reacheszero, backdrop cannot bypass recovery, pay15preservesdelivery/balance minus15, confirmedrestartresetscoins/deliveries/XP/food. Both paths passed.
- API supplemental: packedrainprotection, ownedkit10coinretrieval,newroadkit70coins, fuel12, repairs, bicycleair4/roadsideair14, starvationhealthloss/foodrestore, garagehealthrestore, duplicate-safe milestones.
-390x844 and360x740phone navigation/layout validated by testing agent; JS/Python lint and TypeScript pass.
- Remaining: physicalnativeiOS/Android device QA; tuning survival rates/economy from player feedback. No identified unresolved core-flow blocker.

### Prioritized next work (supersedes older backlog)
- P0: none identified from current checks.
- P1: native-device control/performance testing and balance tuning; optional clearer service destination marker legends.
- P2: more food/shops/order stories, ambient forest/city audio, achievements/cosmetics and eventual selected ad SDK integration.

## Phone-first HUD refinement — 2026-09-08
- User clarified: only show health and fuel while riding; tap either for detailed stats. Bicycle shows tire air in place of fuel.
- Removed the five-bar ride panel and its balance/level footer. Replaced with two44pt-high, icon-and-percentage controls in a compact row; no on-road stat bars.
- Tapping either opens Phone→Care with all five detailed stats. Energy/hunger/condition remain fully functional but no longer take permanent map space.
- Removed the full-width survival warning banner. Critical indicators use small attention dots and one-time transition toasts; no repeated fixed panel.
- Care stats are now a noninteractive detail card, not a self-linking button.
- Verified390x844and360x740:44ptHUDheight, no energy/hunger/condition bars on road, each health/fuel button opens the complete Carecard, no horizontaloverflow. TypeScriptandtargetedJS lintpassed. No backend or save-schema changes.

## Five-Town Regional Expansion — 2026-09-08

### User request and explicit choices
- Natural regional shape: irregular town edges, curved roads and a winding river instead of square town cutoffs. Preserve existing Sunnyvale and Pinecrest names and compact health/fuel HUD.
- Bongaon on the far side of Ichhamati River with a football stadium.
- Habra Town with railway tracks, platforms, trains and gates that physically stop rider and traffic until the train clears.
- Three bridges: Ray Bridge, Revenuecat Bridge, Habra Bridge.
- Petrapole with an amusement park and army barracks.
- Multi-block Sunnyvale cinema and Pinecrest Diamond Plaza mall with prominent in-world ad displays; more bikes in traffic.

### Implemented
- Canonical world geometry in `backend/region_map.py`, provided through `/api/world` and `/api/catalog`; frontend `region.ts` consumes the same polylines, landmarks, river and signals for rendering, collision and graph-based GPS routing.
-6300×4500region with166road segments/polylines, connected graph, rounded outskirts/country lanes, winding Ichhamati River and exactly3named rideable bridges. Water outside bridge roads is not rideable.
- Existing town cores/save coordinates preserved. Worldv3 migration snaps only invalid old positions to the nearest valid road without resetting health, money, inventory or progression.
- Landmarks: Sunnyvale Picturehouse(680×420), Diamond Plaza(700×500), Bongaon Football Stadium, Habra Railway Station/two platforms, Petrapole Amusement Park/animated Ferris wheel/coaster, and fenced Petrapole Army Barracks.
- Cinema rooftop screen/poster wall and Diamond Plaza LED/ribbon displays retain literalPLACEFORADS text; live ad SDK remains outside scope.
-74AIvehicles(40bikes,34cars) with distinct sprites, curved routes, following distances, gate queues and rider-aware waiting behavior.
- Habra five rail gates:3mainstreet crossings plus both curved ring-road crossings.60second cycle; close atphase8, trainactivephase12through35, gatesopen36 aftertrainclears. Renderedtrain/platforms/gatearms/lights and contextualwaitmessage.
- Rider and AI physically stop at barriers. Rider blockedstate latches untilclear, no collision penalties whilewaiting in closedgateapproachzone, plus2.5secondlocalclearancegrace afteraqueuedrider’sgateopens. Normalroadcollisionrulesresumeafterward.
- New town services and real delivery offers: Ichhamati Café→Bongaonstadium; PlatformChai→Habragardenhomes; FairgroundSnacks→Petrapolebarracks. Regionalpickupbudgetsuseactualgraphdistance andallowrailgatewaiting.
- PhoneGPS listsalllandmarks, threebridges, railgates, services and actual route destinations; no destinationteleport. CompactHUD/phone-onlyonlinecontrol/survival systems retained.

### Verification and limitations
- Full backend suite37/37passed10.92s. Focusedrail retest10/10passed. JS/PythonlintandTypeScriptpassed.
- Mobile-web390×844/360×740: organicregionalGPS, namedlandmark/bridge/gaterows, compactHUD/Care, actualridefromgaragetocinemadistrict.
- CriticalrailUI: blockedaty2948(northof2949barrier), blockedstateremainsafterrelease, nohealthlosswhilewaiting,7queuedAIvehicles, trainvisiblephase26.58, reopenallowscrossingandclearsblock. Report`test_reports/iteration_4.json`.
- SupplementalAPI deliveriesinall3newtownscompleted: Bongaon45coins,Habra45,Petrapole61.
- Addedshortpost-openlocalgracefollowingretest’soptionaltraffic-proximityobservation. Ordinarycollisionselsewhereareintentionalgameplay.
- Landmarks are exterior world destinations, not separate playable football/theme-park mini-games. No live ads added. PhysicaliOS/AndroidperformanceQAremainsnext.

### Prioritized next work
- P0: no identified unresolved core-flow blocker.
- P1: playerfeedbackonregionaltravel-time/fuelbalance; native-deviceperformanceandcontrolprofiling.
- P2: landmark-specificmissions, train/city/riverambientaudio and optional venueinteriors/mini-games.