# Expansion verification — 2026-09-08

Testing-agent report iteration2 was initially partial:22/27backend tests passed,5legacy assumptions obsolete; frontend pickup verified but one arrival script stopped a few units outside its threshold.

## Corrections
- Legacy tests now use returned footpath coordinates, and purchase tests fast-forward only their isolated test rider's global dispatch cooldown. No production cooldown was removed.
- Interaction radius is35units and still strictly requires a footpath; nearby GPS avoids a redundant center-line detour.
- Controls now expose disabled/actionability state while an action or overlay is active.

## Final results
- `pytest -q backend/tests/test_delivery_game_api.py backend/tests/test_survival_expansion_v2.py`: **27 passed in11.91s**.
- TypeScript noEmit:passed. JS/Python lint:passed.
- PhysicalUIride to caféfootpath, collect beforedeadline, ride to customerfootpath,deliver reward32coins/25XP:passed.
- Post-delivery quietdispatch, milestone1claim(+15coins,+2apples), purchase/eatsandwich:passed.
- Actual ride x400→1513 through forest→2440Pinecrest, serviceGPSnavigation:passed. No forestbuildings.
- FinalUIempty-airbicycle test: actualhelddirection moved rider inPUSHINGmode at6km/h; phoneCareoffered14coinroadsideairandshowedclearinsufficient-fundsmessage. Passed.
- RecoveryUI using real tick requests on an isolatedbrowser save:zerohealthshowsnon-dismissiblechoice;pay15restoreshealthandpreservesdelivery;seconddeath→restartconfirmation→startercoins/deliveries/XP/food:passed.
- AdditionalcurlAPIvalidation on newlycreated isolated servicefixture: milestoneduplicate-safe;60coinhomekit/10coinremoteownedretrieval/70coinnewroadkit;rainprotection;12coinfuel;collisioncondition/energy/healthloss;repaircostdeduction;airdepletionto0;4coinpump;14coinroadsidepump;garagehealth/energyrestore;starvationandfoodrestoration.

## Limits
- iOS/Android physical-device performance not tested in this container.
- Isolated test fixture balances/states were prepared only for their own newlycreated UUIDs; production game APIs are real and expose no balance-setting/debug endpoint.
- Existing ad placeholders intentionally remain; no external ad service added in this expansion.