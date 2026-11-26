# The Exchange — Discussion Notes

Everything we decided before and during the Build round.

## Competition rules (from the event page)

- **Event:** The Exchange, CSE Dept, Ramaiah Institute of Technology, 26 Nov 2026, CSE Lab 1. Teams of 2–3. Prize pool 10K (5K / 3K / 2K).
- **Timeline:**
  - 9:40 problem statements released
  - 10:00–11:30 **Phase 1: Build It** (90 min), then submit the repo
  - 11:35 coordinators swap repos at random
  - 12:00–1:30 **Phase 2: Break It** (90 min), then submit findings and the refined repo
  - 2:00 results
- **Scoring:** 50 points per phase.
  - **Build:** functionality, UI/UX, creativity, productivity.
  - **Break:** understand the code, find bugs, edge cases and vulnerabilities, fix and optimise without breaking anything, extend with new features.
- **Rules that matter:**
  - AI tools allowed. Any language or framework.
  - Must run locally with no paid APIs, no external datasets and no complicated setup.
  - No copying an existing project 1:1. The organizers clarified that online assets such as character designs are OK.
  - **Sabotage means disqualification:** planting bugs, making code hard to run, or deleting functionality. Both versions of the code are reviewed.
  - In Break, the project's original purpose must be preserved. Bugs, fixes and features must be documented (coordinators give the format).
  - Short presentation at the desk between phases.

## Strategy

- No "make it hard to run" tricks. That's sabotage and costs Build points. Instead: **easy to run, hard to break.**
- Plain HTML5 canvas web app. No build step, no libraries, opens from `index.html`.
- Keep `FLAWS.md` up to date while building. Test every break point and fix it before submitting.
- Branches: `build` (Phase 1) and `break` (Phase 2). In Phase 2, Claude writes a detailed brief on the inherited project first.
- Art: drawn in code, or free CC0 packs (Kenney, OpenGameArt) with a credits file. **No ripped Nintendo or Mojang sprites, music or characters** (Claude's own limit). Mario-style look with blocky Minecraft-style mobs, using original designs.

## Ideas considered

| Idea | Verdict |
|---|---|
| **Mario × Minecraft** (Track I) | **Chosen.** On the list, 2D tiles, low risk, high polish possible. |
| GTA × Kart (own idea, allowed) | Too risky for the time. Would be top-down. Features discussed: cops ramming the leader, shooting tyres to reset a lap, sticky bombs, hidden shortcuts, WRONG WAY sign, mystery-box guns, a "contraband" pre-race inspection cheat (renamed from drugs for a faculty audience). Pinned. |
| Sandbox Gone Wild | Claude's first suggestion (most visual). Backup. |
| Haunted Algorithm, Space Invaders × Breakout | Backups. |

## Mario × Minecraft: feature spec

**Core (from the brief):** 2D platformer. Run, jump across platforms, avoid obstacles, reach the flag. Each mob behaves differently.

**Mobs:**
- **Zombie:** walks up to you and keeps attacking on contact, with a hit cooldown.
- **Creeper:** walks toward you and the fuse starts even if you're above it. **6-block blast radius** that **destroys platform tiles**, damages players, and also hurts other mobs.
- **Skeleton:** stands still and shoots arrows that deal **knockback**, even mid-jump.
- **Boss:** original white-eyed "ghost miner" (Herobrine-style). Teleports, summons mobs, has phases.

**Player gear:**
- **Sword:** earn coins and buy sword tiers (wood, stone, iron, diamond) in a **shop between levels**. Each tier adds damage and reach.
- **Shield:** rare pickups placed in hard-to-reach spots. Hold to block creeper blasts, zombie hits and arrows.
  - 100 HP. Arrow −34 (3 arrows always break it), zombie −15, creeper −60.
  - **Hard mode:** shields spawn pre-damaged by a random 5–40%.
- **Power-ups (original designs):** grow/extra hit, fire-throw, star invincibility.

**Players:** 2-player co-op. P1 uses WASD, P2 uses the arrow keys. Shared camera. Shared lives. A player who dies respawns next to their partner.

**Structure:** title screen with difficulty select (Easy / Normal / Hard), 2 levels, then a boss arena.

**Polish:** parallax sky, particles, screen shake on blasts, sound effects made in code, HUD (hearts, coins, shield bar, sword tier).
