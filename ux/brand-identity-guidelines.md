# Deep Tactical Design System
Version: 1.0

Core Concept: "The Sweet Spot" — A seamless hybrid of an environment you enter and a tool you use.

## 1. Brand Philosophy & Tone
**Personality:** Authoritative, Cinematic, Focused, Elite.

**The Macro (The Environment):** The outer shell (backgrounds, navigation, top-level KPIs) acts as the "Arena." It uses deep space, subtle biological animations (breathing lights), and frosted glass to spark emotion.

**The Micro (The Tool):** The inner workstation (charts, trade logs, input forms) strips away the emotion. It acts as a clinical "Workstation," utilizing flat, matte surfaces, sharp borders, and high-contrast text.

## 2. Typography System
- **UI & Reading Font:** Inter (Sans-serif) + tabular-nums for general UI text.
- **Data & Metric Font:** Roboto Mono (Monospace) STRICTLY for financial data.

## 3. Color Palette
- **Deep Space Background:** `#000000` (Pure Black)
- **Tool Base Background:** `#09090B` (Zinc 950)
- **Macro Pulse (Emotion):** `#4ADE80` (Neon Emerald) + Glow Effect
- **Micro Win (Data):** `#10B981` (Crisp Emerald) - Flat, no glow.
- **Micro Loss (Data):** `#EF4444` (Sharp Crimson) - Flat, no glow.

## 4. Materials & Surfaces

### Surface A: Obsidian Glass (The Environment)
Used for Sidebars, Headers, Macro KPI Cards.
- **Background:** `rgba(10, 10, 12, 0.6)`
- **Blur:** `backdrop-blur: 24px`
- **Border:** `1px solid rgba(255, 255, 255, 0.04)`
- **Inner Highlight:** `inset 0 1px 0 0 rgba(255, 255, 255, 0.05)`

### Surface B: Matte Zinc (The Tool)
Used for Trade Logs, input forms, Chart containers.
- **Background:** `#18181B` (Zinc 900)
- **Border:** `1px solid #27272A` (Zinc 800)
