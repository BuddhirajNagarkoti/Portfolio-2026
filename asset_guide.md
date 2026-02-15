# 🏔️ Brains' Nepal Scroll Adventure: Asset Dimension Guide

This guide provides the precise technical dimensions and design requirements for all environmental assets in the game. Use these as your blueprint when creating or updating SVGs.

---

## 🖥️ 1. Technical Baseline
*   **Target Resolution:** `1920 x 1080` (Full HD)
*   **Coordinate System:** 
    *   `X=0, Y=0`: Top Left Corner
    *   **Ground Surface (Y):** `880px`
    *   **"Sky" Height:** `880px` (Top of viewport to surface)
    *   **"Dirt" Depth:** `200px` (Surface to bottom of viewport)

---

## 🎨 2. Environment & Background Dimensions

### 🌌 Full-Screen Backgrounds (`sky`, `underground_bg`)
*   **Dimensions:** `1920 x 1080`
*   **Requirement:** Seamless horizontal loop (Left edge must match Right edge).
*   **Usage:** These are drawn with parallax scrolling.

### 🧱 Tiling Surface Textures (`land`, `underground_land`, `road`)
*   **Recommended Dimensions:** `512 x 512` or `1024 x 1024`
*   **Requirement:** Seamless horizontal **and** vertical tiling.
*   **Visual Guide:**
    *   **Top 10-20%:** Surface details (Grass, pebbles, road paint).
    *   **Lower 80%:** Soil or stone texture.

---

## 🎒 3. Interactive & Object Dimensions

| Asset Name | Width (PX) | Height (PX) | Anchor Point/Notes |
| :--- | :--- | :--- | :--- |
| **Player (Brains)** | 100 | 90 | Centered horizontally. |
| **Teleport Pipe** | 140 | 200 | Bottom-aligned to ground. |
| **Hot Air Balloon** | 200 | 280 | Basket centered on X. |
| **Dragon** | 480 | 320 | Massive landmark. |
| **End Goal Flag** | 160 | 200 | Bottom-aligned. |
| **Collectibles** | 48-52 | 48-52 | Centered. |
| **Bushes/Flowers** | 100-200 | 60-100 | Varies by design. |
| **Clouds** | 160 | 100 | Soft horizontal edges. |

---

## 🛠️ 4. Designer Tips

1.  **Safety Margin:** Keep important visual information at least 40px away from the top and bottom edges of specific objects (like pipes or goals).
2.  **SVG Precision:** Draw your SVGs on an artboard that matches their target size above. This ensures sharp pixel-aligned rendering.
3.  **The "Ground Line":** When designing a full-level mockup, always mark your ground at **Y: 880**. This is where your platforms and character will live.
4.  **Shadows:** Use subtle gradients or lower opacity colors within the SVG instead of heavy CSS shadows to maintain better performance.

---

*Last Updated: February 2026*
