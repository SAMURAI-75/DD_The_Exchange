# Block Bros: Creeper Kingdom

A 2D platformer where you fight blocky mobs instead of the usual enemies. Made for **The Exchange** (Track I: Remix the Classic, "Mario × Minecraft").

## Run it

No install and no build step. Pick one:
- Double-click `index.html`, **or**
- `python3 -m http.server 8000`, then open http://localhost:8000

Works offline. All art and sound are generated in code (`game.js`).

## Controls

| | Player 1 (Red) | Player 2 (Green) |
|---|---|---|
| Move | A / D | ← / → |
| Jump | W or Space | ↑ |
| Sword | F | Enter (or /) |
| Shield (hold) | S | ↓ |
| Fireball (with Fire power) | G | Right Shift (or .) |

P / Esc to pause · M to mute · on the title screen: 1 / 2 players, ← / → difficulty, Enter to start.

## Features

- **Zombies** chase you and keep attacking.
- **Creepers** chase you, start their fuse even if you're above them, and blow up a **6-block radius**. The blast destroys platforms, hurts other mobs, and sets off nearby creepers.
- **Skeletons** stand still and shoot arrows that **knock you back**, even mid-jump. Swing your sword to deflect arrows.
- **Sword shop** between levels: Wood → Stone → Iron → Diamond, bought with coins.
- **Rare shields** in hard-to-reach spots. Hold to block. 100 durability: arrows −34 (3 break it), zombies −15, creepers −60. On **Hard**, shields spawn pre-damaged (5–40%).
- **Power-ups** from ? blocks: Mushroom (+1 max heart), Fire flower (fireballs), Star (invincible, kills on touch).
- **Stomp** mobs from above. Stomping a creeper lights its fuse, so run!
- **2-player co-op** on one keyboard: shared lives, respawn next to your partner.
- **Boss: the Ghost Miner** teleports, fires orbs, and summons mobs, over 3 phases.
- Easy / Normal / Hard, checkpoint with indestructible pads, best time saved.

## Files

- `index.html`: page and canvas
- `game.js`: the whole game
- `FLAWS.md`: every break point we considered, tested and fixed
- `DISCUSSION.md`: planning notes
