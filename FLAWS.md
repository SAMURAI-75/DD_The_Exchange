# FLAWS.md — break points considered, tested and fixed

Status key: ✅ fixed and tested · 🛡️ handled by design · ⚠️ known limitation

## Found while building (bugs we hit and fixed)

| # | Flaw | Fix | Status |
|---|---|---|---|
| 1 | A creeper blew up the ground at the spawn/checkpoint, so players respawned on rubble or over a hole | Added indestructible reinforced ground (`G`) at spawn (cols 0–8) and the checkpoint (±2 cols). Mobs and blocks are cleared above those pads. Respawn without a grounded partner always goes to the pad | ✅ |
| 2 | Respawning onto a partner who was mid-air or falling into a pit killed the respawned player again | Only respawn next to a partner who is **on the ground**; otherwise use the checkpoint pad | ✅ |
| 3 | Creepers were the same green as the background hills and nearly invisible | Changed hill colours and added a dark outline to creepers | ✅ |
| 4 | Boss phase 2 sometimes took over 8 s to summon its first minion | Summon timer resets to 2 s on each phase change | ✅ |
| 5 | Testing hook (`window.__bb`) exposed level-skip and explode functions | Removed before submission | ✅ |

## Break points tested

| # | Break point | How it's handled | Status |
|---|---|---|---|
| 6 | Creeper blast destroys the bedrock floor, making the level impossible | Bottom row and `X` bedrock are indestructible. Gaps are max 3 tiles and jump distance is ~4.7 tiles, so the flag is always reachable at ground level | ✅ tested |
| 7 | Creeper blast damage and the 6-block radius | Tested: 2 hearts inside half the radius, 1 heart at the edge, knockback away from the blast | ✅ tested |
| 8 | Shield durability: 3 arrows must break it | Tested sequence 100 → 66 → 32 → broken | ✅ tested |
| 9 | Hard mode pre-damaged shields | Spawn with a random 5–40% wear (`DIFF.hard.wear`) | 🛡️ |
| 10 | Picking up a worse shield replaces a better one | Keeps the better shield and leaves the pickup for your partner | 🛡️ |
| 11 | Arrow knockback while jumping | Tested: knocked back ~57 px mid-air. Input is locked for 0.28 s during knockback | ✅ tested |
| 12 | Falling into a pit | Player dies below the world. Mobs and items that fall out are removed | ✅ tested |
| 13 | Death and respawn costs a shared life | Tested: lives −1, respawn after 1.6 s with 2 s invulnerability | ✅ tested |
| 14 | Lives reach 0 with one player still alive | The dead player is OUT until the next level; game over only when everyone is dead | 🛡️ |
| 15 | Level clear → shop → next level → boss → win | Tested the full flow, including buying a sword, Mega Heart, and continuing | ✅ tested |
| 16 | Buying with not enough coins / a maxed sword / max hearts | Denied with a sound; coins never go negative | 🛡️ |
| 17 | Boss defeated while minions are alive | Minions and projectiles are cleared on boss death | ✅ tested |
| 18 | Hitting the boss while it's teleporting | Invulnerable during the fade (by design, so timing matters) | 🛡️ |
| 19 | Players in co-op walking off opposite sides of the screen | Both players are clamped to the camera view while both are alive | 🛡️ |
| 20 | Tab switch or window blur while keys are held (stuck movement) | All keys released and the game auto-pauses on blur/hidden | ✅ tested |
| 21 | Different monitor refresh rates (60/120/144 Hz) changing game speed | Fixed 60 Hz physics step with an accumulator; max 5 steps per frame (no spiral of death) | 🛡️ |
| 22 | Tunnelling through tiles at high speed | Fall speed capped at 900 px/s (15 px per step, under half a tile) | 🛡️ |
| 23 | Spawning inside a solid block after terrain changes | `unstick()` pushes the body up until free | 🛡️ |
| 24 | localStorage blocked (private mode) crashing the game | All storage reads and writes wrapped in try/catch with defaults | 🛡️ |
| 25 | Audio blocked by autoplay policy | Audio context created and resumed on first key/click; all sound calls are no-ops on failure | 🛡️ |
| 26 | One runtime error freezing the whole game | `update` and `render` wrapped in try/catch inside the loop, so it logs and keeps running | 🛡️ |
| 27 | Particle spam from chained explosions slowing the game | Particles capped at 700; only visible tile columns and mobs are drawn | 🛡️ |
| 28 | Arrow keys / Space scrolling the page | `preventDefault` on game keys | 🛡️ |
| 29 | Chain reactions: one creeper's blast should set off others | Nearby creepers get a short fuse (1.2 s) | 🛡️ |
| 30 | Creepers should explode even when you're above them | Fuse triggers if you're within 2 tiles horizontally and up to 6 tiles above | 🛡️ |
| 31 | Stomping a creeper | Starts a short 0.9 s fuse instead of killing it, so you have to run | 🛡️ |
| 32 | Same level layout every run (fair, testable) | Seeded RNG (`mulberry`) for level generation | 🛡️ |
| 33 | Window resize / small screens | Canvas scales to fit while keeping the aspect ratio, with pixelated rendering | 🛡️ |

## Round 2 of building: new features and the bugs found while testing

| # | Flaw | Fix | Status |
|---|---|---|---|
| 39 | **Platforms 4 blocks up were impossible to reach** (jump only reached ~3.5 blocks), reported by playtester | Jump raised from 650 to 760 px/s. Measured jump height is now 4.52 blocks; the tallest required step is 4 | ✅ tested |
| 40 | Mushroom only added a heart; it should make you bigger | Mushroom grows you (bigger hitbox and sprite). A hit while big shrinks you instead of costing a heart | ✅ tested |
| 41 | Growing under a low ceiling would trap you inside blocks | If there's no headroom, growth waits until there is (`wantBig`) | 🛡️ |
| 42 | Ghast fireballs need a counter | Swing your sword at one to send it back (it turns blue). Tested: it reverses and can kill ghasts | ✅ tested |
| 43 | Falling into a Nether lava pit should kill instantly (not after falling off-screen) | Feet below ground level in the Nether = lava death, with an ember burst. Mobs too | ✅ tested |
| 44 | The dragon could be unkillable because crystals heal it | Crystals sit on 4-block pillars (reachable with the new jump). Sword, gun, fireball or bomb destroys them, and the HUD shows how many are healing it | ✅ tested |
| 45 | The dragon could fly out of the arena or into the floor | Position clamped inside the walls and above the floor | 🛡️ |
| 46 | Dragon/boss death left minions and projectiles behind | Everything is cleared when the boss dies, then the win screen shows | ✅ tested |
| 47 | Crazy Mode horde spawning on top of players or on the safe pads | Spawns only off-screen, at least 4 blocks from any player, never on the spawn/checkpoint pads, never over pits | 🛡️ |
| 48 | Crazy Mode horde too thin at first (about 7 mobs) | Spawn every 0.2 s with up to 4 placement attempts, capped at 15 near the camera | ✅ tested |
| 49 | Sticky bombs: should stick to mobs and surfaces | They stick to the first mob or surface they touch and explode after 1.6 s (3-block blast that also lights creepers) | ✅ tested |
| 50 | Bombs and reflected fireballs hurting the thrower's targets correctly | Player-owned shots (`mine`) only damage mobs. Blasts can still hurt players nearby (stand clear!) | 🛡️ design choice |
| 51 | Sword also deleted the player's own bullets and bombs | Swords only deflect enemy projectiles | ✅ |
| 52 | Music keeps playing on game over or while muted | Music scheduler stops when muted or on game over, and switches track by map/state | 🛡️ |
| 53 | Best times mixed up between maps and modes | Stored per map and per mode (`bb_best_<map>_<mode>`) | 🛡️ |
| 54 | Test-only hook (`window.__bb`) left in the build | Removed before commit | ✅ |
| 55 | Game auto-pauses when the tab is hidden (looked like "stuck" during testing) | Intended. The game resumes with P/Esc | 🛡️ |

## Known limitations (honest list)

| # | Limitation | Status |
|---|---|---|
| 34 | No touch/gamepad controls; keyboard only | ⚠️ |
| 35 | The shield blocks from all directions (simpler, and more forgiving for players) | ⚠️ design choice |
| 36 | Boss orbs pass through blocks on purpose (ghost) | ⚠️ design choice |
| 37 | ? block contents are random each run, not seeded | ⚠️ |
| 38 | The Nether and the End have one level each (the End is a boss arena) | ⚠️ scope |
| 56 | Music is simple generated chiptune, with no volume slider (M mutes everything) | ⚠️ |
