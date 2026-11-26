# Block Bros: Creeper Kingdom

A 2D platformer where you fight blocky mobs instead of the usual enemies. Made for **The Exchange** (Track I: Remix the Classic, "Mario × Minecraft").

## Run it

No install and no build step. Pick one:
- Double-click `index.html`, **or**
- `python3 -m http.server 8000`, then open http://localhost:8000

Works offline. All art, sound effects and the music (original chiptune, one track per world) are generated in code (`game.js`).

## Controls

| | Player 1 (WASD) | Player 2 (Arrows) |
|---|---|---|
| Move | A / D | ← / → |
| Jump | W or Space | ↑ |
| Crouch (duck missiles) | S | ↓ |
| Sword | F | Enter |
| Shield (hold) | Q | / |
| Fireball (Fire power) / Gun (Crazy) | G | Right Shift |
| Sticky bomb (Crazy only) | E | ' (quote) |

P / Esc to pause · M to mute. On the **world select screen**: ← / → world, ↑ / ↓ mode, 1 / 2 players, **R** co-op / drag race, **C** swap which player uses WASD vs arrows (saved), Enter to start.

## Game types

- **Co-op**: play through every level of the world together (or solo).
- **Drag race** (2 players): both race the same level in split screen with their own lives, keys and checkpoints. **Points**: coin 10 · kill 100 · key 200 · power-up 50 · finish 1st +1000 / 2nd +500 · time bonus · death −250. The race ends 30 s after the first finisher.

## Worlds

| World | Difficulty | Inspired by | What's there |
|---|---|---|---|
| Overworld | ★☆☆ Easy | Super Mario Bros. World 1-1 × Minecraft Overworld | Green Hills, Creeper Country, Mineshaft Caves + the Ghost Miner boss |
| The Nether | ★★☆ Medium | Mario lava castles × Minecraft Nether | Lava Lakes + Nether Fortress. Lava pits, ghasts (swing to send fireballs back), blazes |
| The End | ★★★ Hard | Mario boss battles × Minecraft The End | End Islands over the void with **endermen** (stand next to one for 5 s and it teleports you back), then the Ender Dragon (smash the 3 crystals that heal it) |

Every level has **key rooms**: grab the key inside to unlock the door further on. Blocks destroyed by blasts **grow back after 15 seconds**.

## Modes

Easy · Normal · Hard (shields spawn damaged) · **CRAZY** (inspired by GTA-style chaos): automatic gun, sticky bombs, 9 lives and a horde of up to 15 mobs spawning nonstop.

## Features

- **Zombies** chase you and keep attacking.
- **Creepers** chase you, start their fuse even if you're above them, and blow up a **6-block radius**. The blast destroys platforms, hurts other mobs, and sets off nearby creepers.
- **Skeletons** stand still and shoot arrows that **knock you back**, even mid-jump. Swing your sword to deflect arrows.
- **Sword shop** between levels: Wood → Stone → Iron → Diamond, bought with coins.
- **Rare shields** in hard-to-reach spots. Hold to block. 100 durability: arrows −34 (3 break it), zombies −15, creepers −60. On **Hard**, shields spawn pre-damaged (5–40%).
- **Power-ups** from ? blocks: Mushroom (grow big; a hit shrinks you instead of costing a heart), Fire flower (fireballs), Star (invincible, kills on touch).
- **Missile cannons** fire at head height: crouch to dodge, stomp or slash them.
- **Stomp** mobs from above. Stomping a creeper lights its fuse, so run!
- **2-player co-op** on one keyboard: shared lives, respawn next to your partner, **split screen** when you drift apart, **team gates** (stand on both plates together / hit both levers within 1 second) and **team boost** (land on your partner's head while holding jump).
- **Boss: the Ghost Miner** teleports, fires orbs, and summons mobs, over 3 phases.
- Easy / Normal / Hard, checkpoint with indestructible pads, best time saved.

## Files

- `index.html`: page and canvas
- `game.js`: the whole game
- `FLAWS.md`: every break point we considered, tested and fixed
- `DISCUSSION.md`: planning notes
