# Block Bros: Creeper Kingdom

## README.md Format

### Team Name
- Ding Ding

### Track Number & Name
- Track I: Remix the Classic

### Problem Statement Name
- Mario x Minecraft

### Idea
- A 2D platformer in the style of Super Mario where the enemies are Minecraft mobs, each with its own behaviour: zombies chase and keep attacking, creepers walk up and explode (even when you're above them) and blow holes in platforms, and skeletons shoot arrows that knock you back.
- You run, jump, stomp and fight your way to the flag with a sword you upgrade using coins, rare shields that break after enough hits, and Mario-style power-ups.
- Three worlds to pick from (Overworld, Nether, The End) with bosses, keys and locked doors, 1–2 player co-op with split screen and teamwork puzzles, a 2-player drag race scored on points, and a chaotic CRAZY mode.

### How to Run
- **Prerequisites:** any modern web browser (Chrome, Edge, Firefox or Safari). Optional: Python 3, only if you prefer to serve the files locally. No internet, accounts or paid APIs needed.
- **Installation steps:** none. There are no dependencies and no build step. Clone the repo:
  ```bash
  git clone https://github.com/SAMURAI-75/DD_The_Exchange.git
  cd DD_The_Exchange
  ```
- **Exact commands to run the project locally:**
  - Option 1: open the file directly
    ```bash
    open index.html
    ```
    (On Windows: `start index.html`; on Linux: `xdg-open index.html`; or just double-click `index.html`.)
  - Option 2: serve it locally
    ```bash
    python3 -m http.server 8000
    ```
    Then open http://localhost:8000 in your browser.
- Press **Enter** on the title screen, pick a world, mode and number of players, press **Enter**, then design your character(s) and press **Space** to play. Press **L** on the title screen to continue a saved run.

---

## More details

Works offline. Progress is saved in your browser: the home screen lists every level you've played with your best time, best points and number of plays. All art, sound effects and the music (original chiptune, one track per world) are generated in code (`game.js`).

### Controls

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

### Character customizer

Before every game or race, each player picks a name, a preset and customizes hat, colours, shorts, outfit (overalls / dress / jacket / tank), skin, hair, race trail and race number (inspired by Mini Militia's avatar customization). Each player edits with their own keys; press their sword key on NAME to type. All characters are original designs.

### Game types

- **Co-op**: play through every level of the world together (or solo).
- **Drag race** (2 players): both race the same level in split screen with their own lives, keys and checkpoints. **Points**: coin 10 · kill 100 · key 200 · power-up 50 · finish 1st +1000 / 2nd +500 · time bonus · death −250. The race ends as soon as the first player crosses the flag, and a results screen shows the winner, their time and both players' points.

### Worlds

| World | Difficulty | Inspired by | What's there |
|---|---|---|---|
| Overworld | ★☆☆ Easy | Super Mario Bros. World 1-1 × Minecraft Overworld | Green Hills, Creeper Country, Mineshaft Caves + the Ghost Miner boss |
| The Nether | ★★☆ Medium | Mario lava castles × Minecraft Nether | Lava Lakes + Nether Fortress. Lava pits, ghasts (swing to send fireballs back), blazes |
| The End | ★★★ Hard | Mario boss battles × Minecraft The End | End Islands over the void with **endermen** (stand next to one for 5 s and it teleports you back), then the Ender Dragon (smash the 3 crystals that heal it) |

Every level has **key rooms**: grab the key inside to unlock the door further on. Blocks destroyed by blasts **grow back after 15 seconds**.

### Modes

Easy · Normal · Hard (shields spawn damaged) · **CRAZY** (inspired by GTA-style chaos): automatic gun, sticky bombs, 9 lives and a horde of up to 15 mobs spawning nonstop.

### Features

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

### Files

- `index.html`: page and canvas
- `game.js`: the whole game
- `FLAWS.md`: every break point we considered, tested and fixed
- `DISCUSSION.md`: planning notes
