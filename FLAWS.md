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

## Round 3 of building: co-op, rooms and keys

| # | Flaw | Fix | Status |
|---|---|---|---|
| 57 | **Co-op players were pulled along when walking opposite ways** (screen-edge clamp), reported by playtester | Removed the clamp. Added **split screen** that switches on when players are more than 720 px apart and merges below 540 px (hysteresis, so no flicker). Each half follows its player | ✅ tested |
| 58 | Mobs and projectiles were culled using the single camera (broke in split view) | Activation, culling and horde spawning use the union of both views (`viewL`/`viewR`) | ✅ |
| 59 | Split screen in a one-screen boss arena is pointless | Only splits when the level is wider than 1.2 screens | 🛡️ |
| 60 | 2P needed real teamwork | **Team gates**: pressure plates (both must stand at once, one plate up on a ledge) and **timed levers** (both hit within 1 s; spaced so one player can't do both). Plus a **team boost**: land on your partner while holding jump for a 9-block jump | ✅ tested |
| 61 | Team gate soft-lock if your partner is out of lives | Gates auto-unlock when fewer than 2 players are still in the game | 🛡️ |
| 62 | Creepers could destroy the pressure-plate ledge | Gate areas use indestructible reinforced ground | 🛡️ |
| 63 | Levels felt short | Levels now 230/270 (Overworld) and 250 (Nether) blocks long | ✅ |
| 64 | **Keys and locked doors**: a key room could dead-end the path | Rooms are corridors (open at both ends) and the key sits on the floor on the main path, so it can't be missed or lost | ✅ tested |
| 65 | Door without a key | Stays shut and shows "LOCKED! FIND THE KEY" (rate-limited message). With a key it opens and uses the key | ✅ tested |
| 66 | Difficulty selection "didn't work" | The playtester was on a stale tab of the old build; the new world screen uses ↑/↓ for mode (tested). Hard-refresh to update | ✅ tested |
| 67 | Unwalkable terrain check | Automated scan of all levels: no 5-high walls on the path except the climbable finale staircase; max pit 3 blocks (jump covers about 5) | ✅ tested |

## Round 4 of building: regrowing blocks and 3 new levels

| # | Flaw | Fix | Status |
|---|---|---|---|
| 68 | **Big blasts left levels unplayable** (huge holes in platforms), reported by playtester | Every destroyed block **grows back after 15 s**, flickering in over the last 3 s as a warning. Tested: 17 tiles destroyed, all back at 16 s | ✅ tested |
| 69 | A block regrowing inside a player or mob would trap them | Regrowth waits (rechecks every 0.5 s) while any player, mob or item overlaps the spot. Tested: held a player in the hole for 16 s, the block stayed empty, then regrew after they left | ✅ tested |
| 70 | Destroyed ? blocks regrowing would give infinite items | They regrow as used (empty) blocks | 🛡️ |
| 71 | Gates, doors and key-room logic must not regrow | Only blocks broken by blasts/bumps regrow; opened gates and doors stay open | 🛡️ |
| 72 | 3 new levels must be completable | Mineshaft Caves (Overworld 3), Nether Fortress (Nether 2), End Islands (End 1): each has a flag, 2 keys + 2 doors, max pit 3 blocks. Tested world progression Overworld 1 → 2 → Caves → Boss with the shop between | ✅ tested |

## Round 5 of building: race mode, crouch, missiles, endermen, settings

| # | Flaw | Fix | Status |
|---|---|---|---|
| 73 | **Drag race** needed per-player rules: separate lives, checkpoints, keys and points | In race mode each player has their own lives, checkpoint, keys and score. Always split screen (P1 left / P2 right). No team gates or partner respawn. Tested: both finish, places 1st/2nd, results screen | ✅ tested |
| 74 | Race could hang if one player never finishes | When the first player crosses the flag, a 30 s countdown starts; the race also ends if everyone has finished or is out | 🛡️ |
| 75 | Finished racer still targeted by mobs / taking damage | Finished players are excluded from targeting, damage and the alive checks | 🛡️ |
| 76 | Points must credit the right player | Kills are credited to whoever landed the hit (sword, stomp, star, bullet, bomb, fireball, returned ghast fireball). Tested: sword kill +100 | ✅ tested |
| 77 | **Crouch** conflicted with the shield on S / ↓ | Shield moved to Q (P1) and / (P2); S / ↓ is crouch. Crouching shrinks the hitbox (18 px), slows you, blocks jumping, and you stay down under low ceilings | ✅ tested |
| 78 | **Missiles** from cannons: crouch must actually dodge | Tested with a real cannon shot: standing = HIT, crouching = missed (an earlier 0.01 px overlap bug was fixed) | ✅ tested |
| 79 | Missiles flying forever / through walls | They burst on any solid block (incl. doors and gates) or after 9 s; you can stomp them or cut them with a sword | 🛡️ |
| 80 | **Endermen** teleport after 5 s next to you | A circular purple progress ring fills over the player; it drains when you step away. Tested: teleported at exactly 5.0 s to column 110 (first half of the 240-wide level), landing on solid ground | ✅ tested |
| 81 | Teleport into a pit, wall or locked door | Teleport spot must have solid ground with 2 free blocks above, and is never a door or gate column | 🛡️ |
| 82 | Hitting an enderman | It teleports 4–7 blocks away (tested: moved 168 px) | ✅ tested |
| 83 | **Control settings**: swap WASD / arrows | Press C on the world screen; saved in localStorage. The title-screen controls guide updates to match | ✅ tested |
| 84 | Menu didn't explain controls | Title screen now has a full controls table: move, jump, crouch, sword, shield, fire/gun, bomb, with hints | ✅ |

## Round 6: sound bug

| # | Flaw | Fix | Status |
|---|---|---|---|
| 87 | **Sound overlapping, and still playing with SOUND OFF**, reported by playtester. Cause: several copies of the game open at once (old tabs, test pane); muting one didn't silence the others, and queued notes kept playing for a moment | All audio now goes through one **master gain**: M sets it to 0 instantly, cutting notes already queued. The audio context is **suspended whenever the tab is hidden or loses focus**, so background copies are silent, and it resumes on the next key press. The music scheduler also stops while hidden. Tested: M toggles and persists, no errors | ✅ tested |
| 88 | Heavy action (gun + explosions + horde) stacking dozens of sounds into noise | At most 24 sounds play at once; extra sound requests are dropped | 🛡️ |

## Round 7: race ending

| # | Flaw | Fix | Status |
|---|---|---|---|
| 89 | **Drag race seemed frozen after the first player finished**, reported by playtester. The winner's half of the screen stood still during a 30 s wait for the other player | The race now **ends 1.5 s after the first player crosses the flag** and shows a results screen: winner (first across the flag), finish time, and both players' points. Keys are released so nothing carries over. Tested: no errors, results screen shown, the other player could still move until the end | ✅ tested |

## Round 8: saved progress

| # | Flaw | Fix | Status |
|---|---|---|---|
| 90 | Progress was lost on refresh | Saved in the browser (localStorage). **Per-level records**: plays, clears, best time, best points, difficulty. **Continue**: the run is saved at the start of every level (world, level, mode, players, coins, sword, lives, scores); press **L** on the title to resume. Tested: clear → records written → title → L resumes level 2 with score kept | ✅ tested |
| 91 | Corrupted or hand-edited saved data could crash the title screen | Every saved value is type-checked (`num()`); bad entries show as "--", and an invalid save is ignored. Tested with garbage JSON: no errors | ✅ tested |
| 92 | A finished or failed run left a stale "continue" | The save is cleared on win and on game over; race mode is never saved | 🛡️ |
| 93 | localStorage blocked (private mode) | All reads and writes are wrapped in try/catch; the game still runs, just without saving | 🛡️ |

## Known limitations (honest list)

| # | Limitation | Status |
|---|---|---|
| 34 | No touch/gamepad controls; keyboard only | ⚠️ |
| 85 | Big (mushroom) players are too tall to fully duck under missiles | ⚠️ design choice |
| 86 | Race mode uses the first level of the chosen world only | ⚠️ scope |
| 35 | The shield blocks from all directions (simpler, and more forgiving for players) | ⚠️ design choice |
| 36 | Boss orbs pass through blocks on purpose (ghost) | ⚠️ design choice |
| 37 | ? block contents are random each run, not seeded | ⚠️ |
| 38 | The End has one normal level before the dragon arena | ⚠️ scope |
| 56 | Music is simple generated chiptune, with no volume slider (M mutes everything) | ⚠️ |
