### **Starfallen Storyline & Mechanics Expansion: Goal Sheet (Revised)**

**Overall Goal:** Implement a robust looting, crafting, weapon/armor upgrade systems, and player status effects to expand gameplay and narrative.

---

**Phase 1: Core Inventory & Material System**
*   **Goal:** Implement a basic inventory for the player to store materials.
*   **Tasks:**
    *   Add an `inventory` object to the player's game state.
    *   Modify `endBattle` function to add a random material drop.
    *   Implement a new command: `inventory` to display the player's current materials.

---

**Phase 2: Basic Weapon & Armor Definitions, Equipping**
*   **Goal:** Define different weapon and armor types and allow the player to equip them.
*   **Tasks:**
    *   Create `weapons` data structure (type, attack, perk, tier).
    *   Create `armor` data structure (type, defense, resistances, perks, tier).
    *   Add `currentWeapon` and `currentArmor` properties to the `player` state.
    *   Implement commands: `equip [item_name]` (for both weapons and armor), `weapons`, `armor` (to list available items).
    *   Modify `handleBattleCommand` to use equipped weapon's `attack` and armor's `defense`.

---

**Phase 3: Expanded Looting & Material Gathering**
*   **Goal:** Introduce more variety in material drops and new ways to find them.
*   **Tasks:**
    *   Expand the material drop tables for enemies (more diverse materials, varying quantities).
    *   Implement a `search` command for locations, allowing players to find materials in their environment.

---

**Phase 4: Crafting System (Weapons & Armor)**
*   **Goal:** Implement a basic crafting mechanism for both weapons and armor.
*   **Tasks:**
    *   Define `recipes` for crafting new weapons, armor, or upgrades.
    *   Implement a `craft [item_name]` command.
    *   Implement logic to consume materials and add the crafted item to inventory.

---

**Phase 5: Upgrades & Tiers (Weapons & Armor)**
*   **Goal:** Implement a system for improving weapons and armor through upgrades and managing their tiers.
*   **Tasks:**
    *   Define upgrade paths for weapons and armor.
    *   Implement an `upgrade [item_name]` command.
    *   Implement logic to consume materials and enhance item stats/perks.

---

**Phase 6: Player Effects & Status Ailments**
*   **Goal:** Introduce dynamic player effects based on environmental factors or combat.
*   **Tasks:**
    *   Add `statusEffects` object to `player` state (e.g., `{ corrosion: { active: false, severity: 0 } }`).
    *   Implement game logic to apply/remove status effects.
    *   Modify `processCommand` and `handleBattleCommand` to account for active status effects (e.g., reduced max health for corrosion, skipped turn for frozen).
    *   Integrate armor resistances to mitigate effects.

---

**Phase 7: Storyline Integration & Expansion**
*   **Goal:** Weave these new mechanics into the game's narrative.
*   **Tasks:**
    *   Introduce quests or objectives that require specific materials, crafted items, or upgraded weapons.
    *   Expand location descriptions to hint at materials, crafting opportunities, or new challenges.
    *   Introduce new enemies and boss encounters that drop unique loot.

---
