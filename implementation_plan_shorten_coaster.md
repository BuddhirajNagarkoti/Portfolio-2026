# Implementation Plan: Shorten Roller Coaster to X=35,000

## Objective
Reduce the duration and length of the Roller Coaster section by moving the end point (Portal) from `X=50,000` to `X=35,000`. The "AI World" content itself (spawn point, collectibles, knowledge bits) remains at its current location (`X > 51,000`) and will not be touched. The player will simply teleport across the larger gap.

## Proposed Changes in `game.js`

### 1. Constants & Configuration
-   **Update `PORTAL_X`**: Change the constant value from `50000` to `35000`.
    -   *Location*: Top of file, near line 16.

### 2. Render Logic (`render()` function)
-   **Update AI Background Fade**: Change `aiWorldAlpha` calculation to start fading in at `35000` (the new portal location) instead of `50000`.
    -   *Line*: ~1472.
-   **Update Track Drawing Loops**:
    -   Change the hardcoded limit `50000` to `35000` (or use `PORTAL_X` variable) in the `Draw Roller Coaster Track (Procedural)` section.
    -   *Lines*: ~1796, ~1831 (Portal drawing coordinates).
-   **Update Land Zones**:
    -   Change the end coordinate of the "Barahi Adventure" land zone from `50000` to `35000` so the ground stops exactly at the portal.
    -   *Line*: ~1715 inside `zones` array.

### 3. Collision & Physics Logic
-   **Roller Coaster Slowdown**: Update the cinematic slowdown check `if (p.x > 49000)` to `if (p.x > 34000)` to trigger the slowdown correctly before the new portal location.
    -   *Line*: ~525 inside `updatePlayer`.
-   **Input Locking**: Update the "Restriction" logic that prevents scrolling past the end. Change `else if (px < 50000)` to `else if (px < 35000)` for the level name display logic if necessary (though strictly display name might just need the limit adjusted).

## Verification Steps
1.  **Playtest**: Use the `game.player.x = 34000` console command to jump near the new end point.
2.  **Visual Check**: Verify the track ends at the portal at 35,000.
3.  **Transition Check**: Verify entering the portal at 35,000 successfully teleports the player to 52,500 (AI World start) without any errors or visual glitches.
4.  **Land Check**: Ensure the Barahi land stops at the portal and doesn't extend into the empty void.
