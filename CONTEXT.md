# Dishcover

A web-first app that generates recipes from the ingredients a user already has, with a nutrition-first niche: users set macro targets before generation and get a full macro + micronutrient breakdown after.

## Language

### Generation inputs

**Captured Ingredients**:
The ingredients the user provides for one specific generation (typed or scanned). They are the stars of the dish — the recipe is built around them.
_Avoid_: Fridge items, session ingredients

**Pantry**:
Staples the user always has at home (oil, salt, rice…). A standing list, managed separately; the generator may draw on it freely without the user re-entering anything.
_Avoid_: Inventory, stock

**Scan**:
Capturing ingredients by photographing the fridge/pantry; a vision model turns the photo into Captured Ingredients the user can review and edit.
_Avoid_: Photo import, image upload

**Avoid List**:
Foods the user dislikes or won't eat. Nothing on it may appear in any generated recipe.
_Avoid_: Dislikes, blacklist, exclusions

**Dietary Preference**:
A standing diet filter chosen in settings (vegan, gluten-free, ketogenic…). Applies to every generation until changed.
_Avoid_: Diet, restriction

**Equipment**:
The cooking appliances the user owns (oven, air fryer…). Recipes may only require equipment the user has.
_Avoid_: Appliances, tools

**Meal Settings**:
The per-generation knobs mimicked from Crumb: guest count, time budget, and cuisine.
_Avoid_: Recipe options

**Allow Other Ingredients**:
A per-generation toggle. Off: recipes use only Captured Ingredients + Pantry. On: the generator may introduce ingredients the user would need to buy.
_Avoid_: Shopping mode, strict mode

**Generator**:
What turns a Generation Request into a Recipe, honoring the standing rules: nothing from the Avoid List, Dietary Preferences strictly, only owned Equipment, Macro Targets softly. Recipes come from the Generator; the app never edits them by hand.
_Avoid_: AI, the model, engine

**Generation Request**:
The complete payload for one generation: the user's per-generation choices (Captured Ingredients, Macro Target, Meal Settings, Allow Other Ingredients) combined with their standing inputs (Pantry, Dietary Preferences, Avoid List, Equipment). Standing inputs join every Generation Request automatically; the user never re-enters them.
_Avoid_: Payload, request body

### Nutrition

**Macro Target**:
A per-meal goal for protein, carbohydrates, and/or fat that guides recipe generation. Always a soft target: generation aims close and reports actual vs. target; it never refuses because a target is unreachable.
_Avoid_: Macro constraint, macro limit, macro requirement

**Macro Preset**:
A named, tappable shorthand for a common Macro Target (e.g. High Protein, Balanced, Low Carb). Selecting one fills in gram values the user can then edit — presets are entry points, not fixed modes.
_Avoid_: Diet mode, plan

**Nutrition Breakdown**:
The per-serving report attached to every generated recipe: calories, the three macros (vs. Macro Target when one was set), and a fixed label-style micronutrient panel — fiber, sugar, saturated fat, sodium, potassium, calcium, iron, vitamin C, vitamin D. Values are estimates and are labeled as such.
_Avoid_: Nutrition facts (implies regulated label accuracy), macro report

### Recipes

**Cooking Mode**:
A full-screen, one-step-per-screen player for following a recipe hands-on: segmented progress, per-step timers, next/back. Distinct from merely reading the recipe's steps list.
_Avoid_: Step mode, player

### Presentation

**Riso**:
Dishcover's art direction: a risograph food-zine look — spot inks on paper, mono type, stamps, stickers, and seeded dish-art illustrations. Defined by the Ink Kit token sheet; supersedes the earlier switchable-themes plan (ADR-0004).
_Avoid_: Theme (for the overall direction), retro style

**Theme**:
A named visual token set. Riso is the primary theme; Midnight's tokens are reserved for Cooking Mode. User-switchable themes are out of scope unless Riso ink-swap variants arrive later (ADR-0004).
_Avoid_: Team, skin, profile
