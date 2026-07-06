# Dishcover — Product Spec

Generate recipes from what you already have, with nutrition as the differentiator: set a Macro Target before generating, get an honest Nutrition Breakdown after. UX deliberately mimics Crumb (see `reference/` screenshots IMG_2291–2301); terminology per [CONTEXT.md](../CONTEXT.md).

## Positioning

- **Like Crumb**: pantry staples, avoid list, equipment, guests/time/cuisine chips, capture-first flow, cooking mode, warm playful visual feel.
- **Unlike Crumb**: Macro Targets steer generation; every recipe carries a per-serving macro + micronutrient panel; 4 switchable Themes.

## Audience & posture

Personal + friends during the 30-day challenge. Public URL, not promoted. No auth; all data device-local (ADR-0002). Web-first, mobile-perfect; PWA installable; native iOS via Capacitor is a post-MVP stretch.

## Screens

### 1. Home
- Header: Dishcover logo, settings gear.
- "Manage my Pantry" card → Pantry screen.
- **My Recipes** grid: 2-up cards (placeholder art, title, favorite heart). Newest first. Empty state invites first generation.
- **FAB (+)** expands to two actions (Crumb has three; Dictate is deferred): **Scan my fridge**, **Type ingredients**. Both land on New Recipe with capture pre-focused.
- No onboarding checklist in MVP (deferred).

### 2. New Recipe
- **Meal Settings** chip row (mimics Crumb): Guests (1–8, default 2) · Time (Fast <20m / Medium 20–45m / Long 45m+) · Cuisine (Any, Asian, Italian, Mediterranean, Latin, American, Nordic, African, European, Middle Eastern).
- **Macro Target** section (the Dishcover addition): preset chips — **Balanced · High Protein · Low Carb · Keto-ish · Custom · None** (default None). Selecting a preset reveals three editable gram fields (protein / carbs / fat), pre-filled per preset and scaled to guest count. All targets are soft (see CONTEXT.md).
- **Ingredients**: Type (autocomplete + suggestion chips) and Scan (camera/photo upload → review-and-edit chip list; nothing enters the request unreviewed).
- **Allow Other Ingredients** toggle (default off).
- **Create my recipe** CTA — disabled until ≥1 Captured Ingredient.

### 3. Generating
Full-screen themed loading state (rotating food-pun lines). Target p50 < 15s. On failure: friendly retry, error taxonomy per GENERATION-CONTRACT.md.

### 4. Recipe Detail
- Hero: styled placeholder art (theme-aware illustration/gradient — no AI images in MVP), tag chip, title, time · kcal · difficulty, description, favorite heart, delete.
- **Tabs: Ingredients · Steps · Nutrition** (third tab is new vs Crumb).
- Ingredients tab: servings stepper (−/+, "FOR n") live-rescales quantities; rows as `300 g — Chicken breast`. Items introduced via Allow Other Ingredients are marked "to buy".
- Steps tab: numbered step cards with per-step durations.
- **Nutrition tab**: per-serving panel — calories; protein/carbs/fat each with target-vs-actual bar when a Macro Target was set; micronutrients (fiber, sugar, saturated fat, sodium, potassium, calcium, iron, vitamin C, vitamin D); "Estimated values" badge (ADR-0001). Rescales with the servings stepper.
- **Start cooking** CTA → Cooking Mode.

### 5. Cooking Mode
Full-screen player, always Midnight-dark regardless of Theme (matches Crumb's dark cook screens): segmented progress bar, step title + body, built-in countdown timer when the step has one, Next/Back, close. Screen wake-lock where supported.

### 6. Pantry
"What do you always have at home?" — add-ingredient input + suggestion chips (olive oil, salt, pepper, butter, garlic, onions, flour, sugar, eggs, milk, rice, pasta, soy sauce, vinegar, lemon, tomato paste), current items removable.

### 7. Settings
- **Theme picker**: Hearth (default) · Midnight · Market · Playful, with live preview swatches.
- **Dietary Preferences** chips: vegan, vegetarian, pescatarian, gluten-free, dairy-free, nut-free, ketogenic, diabetic-friendly, low sodium.
- **Avoid List**: free-entry chips.
- **Equipment** chips: stove, oven, microwave, air fryer, blender, rice cooker, slow cooker, pressure cooker, grill.
- Units: metric only in MVP (g/ml, °C); imperial toggle deferred.

## MVP scope line

**In**: Home, New Recipe (Type + Scan capture), Macro Targets/Presets, generation via LLM proxy, Recipe Detail with Nutrition tab, servings stepper, recipe library + favorites, Cooking Mode, Pantry, Settings (themes, dietary, avoid, equipment), 4 Themes, PWA manifest, device-local persistence.

**Deferred**: Dictate capture, onboarding checklist, AI recipe images, USDA nutrition pipeline (schema-ready per ADR-0001), unit conversion, auth/sync, native iOS (Capacitor), public-launch hardening.

## Non-functional

- Mobile-first (design at 390px), fully usable to 1440px desktop (centered app column ~640px; library may go 3-up).
- Lighthouse mobile ≥ 90 performance / ≥ 95 accessibility on Home and Recipe Detail.
- Theme switch is instant (CSS variables), persisted, respects `prefers-reduced-motion`.
- Proxy: per-IP rate limit + hard daily spend cap (ADR-0002).
