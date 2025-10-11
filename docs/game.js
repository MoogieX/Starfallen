console.log("THIS IS A TEST");
let gameOutput, userInput, bgMusic, sfx;

function playMusic() {
    if (bgMusic) {
        bgMusic.play().catch(error => console.log("ERROR 404 NOT FOUND:", error));
    }
}

function pauseMusic() {
    bgMusic.pause();
}

function playSoundEffect() {
    if (sfx) {
        sfx.currentTime = 0;
        sfx.play().catch(error => console.log("SFX autoplay prevented:", error));
    }
}

let battleActive = false;
let currentEnemy = null;
let enemyQueue = [];
let battleRewards = { xp: 0, items: {} };
let awaitingInteractionChoice = false; // New state variable
let awaitingInteractionSelection = false; // New state variable for selecting from options
let currentInteractionOptions = []; // To store the options presented

const possible_attributes = {
    weapon: [
        { name: "of Haste", type: "stat_change", stat: "speed", value: 5 },
        { name: "of Power", type: "stat_change", stat: "attack", value: 3 },
        { name: "of Precision", type: "crit_chance", value: 0.05 },
        { name: "of Sharpshooting", type: "hit_chance", value: 0.10 }, // New attribute
        { name: "of Clumsiness", type: "stat_change", stat: "speed", value: -3 }, // Negative attribute
        { name: "of Frailty", type: "stat_change", stat: "attack", value: -2 } // Negative attribute
    ],
    armor: [
        { name: "of Resilience", type: "stat_change", stat: "defense", value: 3 },
        { name: "of Fortitude", type: "stat_change", stat: "maxHealth", value: 10 },
        { name: "of Deflection", type: "damage_reduction", value: 0.05 },
        { name: "of Heaviness", type: "stat_change", stat: "speed", value: -2 }, // Negative attribute
        { name: "of Brittleness", type: "stat_change", stat: "defense", value: -2 } // Negative attribute
    ]
};

let player = {
    health: 100,
    maxHealth: 100,
    attack: 15,
    defense: 5,
    xp: 0,
    level: 1,
    currentLocation: "bridge", // Player starts on the bridge
    materials: {},
    equipment: [
        { baseId: "laser_pistol", name: "Laser Pistol", tier: 1, attributes: [], perkData: {} },
        { baseId: "flak_jacket", name: "Flak Jacket", tier: 1, attributes: [], perkData: {} }
    ],
    questItems: [],
    currentWeapon: null, // This will hold the equipped weapon object
    currentArmor: null, // This will hold the equipped armor object
    securityAccessLevel: 0,
    quests: { corruptedAndroidDefeated: false }
};

function getXpToNextLevel(level) {
    return Math.floor(100 * (level * 1.5)); // Example: 100, 250, 450, 700...
}

function isPlayerInLocation(locationId) {
    return player.currentLocation === locationId;
}

const randomEncounterChance = 0.3; // 30% chance of a random encounter after moving

const locations = {
    "bridge": {
        name: "Starship Bridge",
        description: "You are on the command bridge of the starship 'Voyager'. The main viewscreen shows a complex starsystem. Over the control pannels, you can see the stars outside... Exits: north (Engineering), east (Crew Quarters), south (Cargo Bay), west (Medbay).",
        exits: {
            n: "engineering",
            e: "crew_quarters",
            s: "cargo_bay",
            w: "medbay"
        },
        searchable_materials: [
            { item: "wiring", chance: 0.4, min: 1, max: 2 }
        ],
        enemiesInLocation: ["scout_drone"]
    },
    "engineering": {
        name: "Engineering Deck",
        description: "The heart of the ship, where a nuclear reactor stands tall with exposed circuitry scattered around the room. Exits: south (Bridge).",
        exits: {
            s: "bridge"
        },
        searchable_materials: [
            { item: "scrap_metal", chance: 0.6, min: 1, max: 3 },
            { item: "microchips", chance: 0.2, min: 1, max: 1 },
            { item: "gunpowder", chance: 0.4, min: 1, max: 2 },
            { item: "pipe", chance: 0.5, min: 1, max: 2 } // New searchable material
        ],
        enemiesInLocation: ["scout_drone", "combat_android"]
    },
    "crew_quarters": {
        name: "Crew Quarters",
        description: "A long hallway of personal chambers, the name plates faded but it feels like something was lost here... Exits: west (Bridge).",
        exits: {
            w: "bridge"
        },
        searchable_materials: [
            { item: "wiring", chance: 0.3, min: 1, max: 1 },
            { item: "cloth", chance: 0.5, min: 1, max: 2 } // New searchable material
        ],
        enemiesInLocation: []
    },
    "cargo_bay": {
        name: "Cargo Bay",
        description: "Rows of storage crates and containers line shelves, though there isn't much of note here. There is the door to the shuttle bay to the south. Exits: north (Bridge), south (Shuttle Bay).",
        exits: {
            n: "bridge",
            s: "shuttle_bay"
        },
        searchable_materials: [
            { item: "scrap_metal", chance: 0.8, min: 2, max: 4 },
            { item: "gunpowder", chance: 0.3, min: 1, max: 2 },
            { item: "pipe", chance: 0.6, min: 1, max: 3 } // New searchable material
        ],
        enemiesInLocation: []
    },
    "medbay": {
        name: "Medbay",
        description: "White walls and tile floors, empty hospital beds stand in line on the walls, but no one is here... Exits: east (Bridge).",
        exits: {
            e: "bridge"
        },
        searchable_materials: [
            { item: "microchips", chance: 0.1, min: 1, max: 1 },
            { item: "wiring", chance: 0.3, min: 1, max: 1 },
            { item: "cloth", chance: 0.5, min: 1, max: 3 } // New searchable material
        ],
        enemiesInLocation: []
    },,
    "shuttle_bay": {
        name: "Shuttle Bay",
        description: "The main shuttle 'Pioneer' sits ready for launch, although it probably wouldn't be smart to launch just yet. Exits: north (Cargo Bay).",
        exits: {
            n: "cargo_bay"
        },
        searchable_materials: [
            { item: "scrap_metal", chance: 0.7, min: 1, max: 2 },
            { item: "wiring", chance: 0.5, min: 1, max: 2 }
        ],
        enemiesInLocation: []
    }
};

const enemies = {
    "scout_drone": {
        name: "Scout Drone",
        health: 30,
        maxHealth: 30,
        attack: 10,
        defense: 2,
        xpValue: 20,
        description: "A small drone, built for flight and exploration.",
        drops: [
            { item: "scrap_metal", chance: 0.8, min: 1, max: 3 },
            { item: "wiring", chance: 0.3, min: 1, max: 1 },
            { item: "microchips", chance: 0.5, min: 1, max: 1 },
        ]
    },
    "combat_android": {
        name: "Combat Android",
        health: 60,
        maxHealth: 60,
        attack: 20,
        defense: 10,
        xpValue: 50,
        description: "An android much like yourself, although following some unknown corporation",
        drops: [
            { item: "scrap_metal", chance: 0.9, min: 2, max: 5 },
            { item: "wiring", chance: 0.6, min: 1, max: 2 },
            { item: "microchips", chance: 0.4, min: 1, max: 1 },
            { item: "plasma_canister", chance: 0.2, min: 1, max: 1 } // New drop
        ]
    },
    "scavenger": {
        name: "Scavenger",
        health: 40,
        maxHealth: 40,
        attack: 12,
        defense: 3,
        xpValue: 30,
        description: "A sharp-sighted mechanical beast, looking for organic and metalic parts",
        drops: [
            { item: "scrap_metal", chance: 0.7, min: 1, max: 2 },
            { item: "gunpowder", chance: 0.3, min: 1, max: 1 },
            { item: "cloth", chance: 0.5, min: 1, max: 1 },
            { item: "pipe", chance: 0.4, min: 1, max: 1 },
            { item: "microchips", chance: 0.3, min: 1, max: 1 },
        ]
    },
    "broken_android": {
        name: "Broken android",
        health: 80,
        maxHealth: 80,
        attack: 25,
        defense: 8,
        xpValue: 70,
        description: "A being of broken wires and circuits, violent and confused",
        drops: [
            { item: "scrap_metal", chance: 1.0, min: 3, max: 7 },
            { item: "wiring", chance: 0.8, min: 2, max: 3 },
            { item: "microchips", chance: 0.6, min: 1, max: 2 },
            { item: "plasma_canister", chance: 0.3, min: 1, max: 2 } // New drop
        ]
    },
    "corrupted_android": {
        name: "Corrupted Android",
        health: 100,
        maxHealth: 100,
        attack: 30,
        defense: 15,
        xpValue: 100,
        description: "A heavily damaged android, its systems corrupted and hostile. It guards something important.",
        drops: [
            { item: "scrap_metal", chance: 1.0, min: 5, max: 10 },
            { item: "wiring", chance: 0.8, min: 3, max: 5 },
            { item: "microchips", chance: 0.6, min: 2, max: 3 },
            { item: "plasma_canister", chance: 0.5, min: 1, max: 3 } // New drop
        ]
    }
};

const materials = {
    "scrap_metal": {
        name: "Scrap Metal",
        description: "A piece of twisted, generic metal. Useful for basic crafting."
    },
    "wiring": {
        name: "Wiring",
        description: "A bundle of copper and plastic wires. Essential for electronics."
    },
    "microchips": {
        name: "Microchips",
        description: "A small, complex electronic component."
    },
    "plasma_canister": {
        name: "Plasma Canister",
        description: "A pressurized canister containing highly volatile plasma energy."
    },
    "gunpowder": {
        name: "Gunpowder",
        description: "A compound used in explosives."
    },
    "cloth": {
        name: "Cloth",
        description: "A piece of woven fabric, useful for various purposes."
    },
    "pipe": {
        name: "Pipe",
        description: "A sturdy metal pipe, useful for crafting."
    }
};

const weapons = {
    "laser_pistol": {
        name: "Laser Pistol",
        type: "weapon",
        tiers: [
            { tier: 1, attack: 5, materials: [{ id: "scrap_metal", quantity: 10 }, { id: "wiring", quantity: 5 }] },
            { tier: 2, attack: 9, materials: [{ id: "scrap_metal", quantity: 25 }, { id: "microchips", quantity: 5 }] },
            { tier: 3, attack: 14, materials: [] }
        ]
    },
    "combat_knife": {
        name: "Combat Knife",
        type: "weapon",
        perk: "bleed",
        tiers: [
            { tier: 1, attack: 3, materials: [{ id: "scrap_metal", quantity: 15 }] },
            { tier: 2, attack: 5, materials: [{ id: "scrap_metal", quantity: 30 }] },
            { tier: 3, attack: 8, materials: [] }
        ]
    },
    "plasma_pistol": {
        name: "Plasma Pistol",
        type: "weapon",
        perk: "plasma_burn",
        tiers: [
            { tier: 1, attack: 8, materials: [{ id: "scrap_metal", quantity: 15 }, { id: "wiring", quantity: 10 }, { id: "plasma_canister", quantity: 1 }] }, // Base Plasma Pistol
            { tier: 2, name: "Plasma Rifle", attack: 15, materials: [{ id: "microchips", quantity: 5 }, { id: "plasma_canister", quantity: 2 }] }, // Upgrade to Plasma Rifle
            { tier: 3, name: "Sniper Rifle", attack: 22, attributes: [{ name: "of Sharpshooting", type: "hit_chance", value: 0.10 }], materials: [{ id: "microchips", quantity: 15 }, { id: "plasma_canister", quantity: 3 }] } // Upgrade to Sniper Rifle
        ]
    },
    "taser": {
        name: "Taser",
        type: "weapon",
        perk: "electric_stun",
        tiers: [
            { tier: 1, attack: 0, stunDuration: 1, cooldown: 4, materials: [{ id: "scrap_metal", quantity: 10 }, { id: "wiring", quantity: 15 }, { id: "microchips", quantity: 5 }] }, // Base Taser
            { tier: 2, name: "Stun Gun", attack: 0, stunDuration: 2, cooldown: 4, materials: [{ id: "scrap_metal", quantity: 15 }, { id: "microchips", quantity: 10 }] }, // Upgrade to Stun Gun
            { tier: 3, name: "Phaser", attack: 0, stunDuration: 3, cooldown: 4, materials: [{ id: "microchips", quantity: 15 }, { id: "plasma_canister", quantity: 1 }] } // Upgrade to Phaser
        ]
    },
    "bow_knife": {
        name: "Bow Knife",
        type: "weapon",
        perk: "slash", // New perk for descriptive purposes
        tiers: [
            { tier: 1, attack: 7, materials: [{ id: "scrap_metal", quantity: 8 }, { id: "wiring", quantity: 3 }] }
        ]
    },
    "switchblade": {
        name: "Switchblade",
        type: "weapon",
        perk: "slash",
        tiers: [
            { tier: 1, attack: 10, materials: [{ id: "scrap_metal", quantity: 12 }, { id: "microchips", quantity: 2 }] }
        ]
    },
    "katana": {
        name: "Katana",
        type: "weapon",
        perk: "slash",
        tiers: [
            { tier: 1, attack: 25, materials: [{ id: "scrap_metal", quantity: 30 }, { id: "wiring", quantity: 10 }, { id: "pipe", quantity: 5 }] }
        ]
    },
    "longsword": {
        name: "Longsword",
        type: "weapon",
        perk: "slash",
        tiers: [
            { tier: 1, attack: 20, materials: [{ id: "scrap_metal", quantity: 25 }, { id: "pipe", quantity: 4 }] }
        ]
    }
};

const consumables = {
    "basic_repairkit": {
        name: "Basic repairkit",
        type: "consumable",
        health_restore: 25,
        description: "A basic repair kit for minor injuries."
    },
    "repair_kit": {
        name: "Repair Kit",
        type: "consumable",
        health_restore: 9999, // Effectively full health
        description: "A comprehensive kit to fully repair your systems."
    },
    "grenade": {
        name: "Grenade",
        type: "consumable",
        damage: 30,
        description: "A small explosive device that deals area damage."
    },
    "molotov": {
        name: "Molotov",
        type: "consumable",
        perk: "fire_burn",
        damagePerTurn: 15,
        duration: 2,
        description: "A crude incendiary device that deals fire damage over time."
    },
    "pipe_bomb": {
        name: "Pipe Bomb",
        type: "consumable",
        damage: 50,
        description: "A makeshift explosive device that deals heavy area damage."
    }
};

const armor = {
    "flak_jacket": {
        name: "Flak Jacket",
        type: "armor",
        tiers: [
            { tier: 1, defense: 5, materials: [{ id: "scrap_metal", quantity: 20 }] },
            { tier: 2, defense: 9, materials: [] }
        ]
    },
    "plating_vest": {
        name: "Plating Vest",
        type: "armor",
        resistances: ["corrosion"],
        tiers: [
            { tier: 1, defense: 8, materials: [{ id: "scrap_metal", quantity: 40 }, { id: "wiring", quantity: 10 }] },
            { tier: 2, defense: 14, materials: [] }
        ]
    },
    "scrap_armor": {
        name: "Scrap Armor",
        type: "armor",
        tiers: [
            { tier: 1, defense: 3, materials: [{ id: "scrap_metal", quantity: 5 }] },
            { tier: 2, defense: 5, materials: [] }
        ]
    },
    "plasma_shield": {
        name: "Plasma Shield",
        type: "armor",
        resistances: ["plasma"],
        tiers: [
            { tier: 1, defense: 7, materials: [{ id: "scrap_metal", quantity: 25 }, { id: "microchips", quantity: 10 }] },
            { tier: 2, defense: 12, materials: [] }
        ]
    }
};

const recipes = {
    "basic_medkit": {
        name: "Basic Repairkit",
        result: { id: "basic_repairkit", type: "consumable", health_restore: 25 },
        ingredients: [
            { id: "microchips", quantity: 1 },
            { id: "wiring", quantity: 2 }
        ]
    },
    "scrap_armor": {
        name: "Scrap Armor",
        result: { id: "scrap_armor", type: "armor", defense: 3 },
        ingredients: [
            { id: "scrap_metal", quantity: 5 },
            { id: "wiring", quantity: 1 }
        ]
    },
    "repair_kit": {
        name: "Repair Kit",
        result: { id: "repair_kit", type: "consumable", health_restore: 9999 },
        ingredients: [
            { id: "scrap_metal", quantity: 3 },
            { id: "wiring", quantity: 3 }
        ]
    },
    "combat_knife": {
        name: "Combat Knife",
        result: { id: "combat_knife", type: "weapon", defense: 3 }, // Defense is not used for weapons, but keeping the structure consistent
        ingredients: [
            { id: "scrap_metal", quantity: 10 },
            { id: "wiring", quantity: 5 }
        ]
    },
    "plasma_pistol": {
        name: "Plasma Pistol",
        result: { id: "plasma_pistol", type: "weapon", defense: 8 }, // Defense is not used for weapons
        ingredients: [
            { id: "scrap_metal", quantity: 15 },
            { id: "wiring", quantity: 10 },
            { id: "plasma_canister", quantity: 1 }
        ]
    },
    "laser_pistol": {
        name: "Laser Pistol",
        result: { id: "laser_pistol", type: "weapon", defense: 5 }, // Defense is not used for weapons
        ingredients: [
            { id: "scrap_metal", quantity: 15 },
            { id: "microchips", quantity: 5 },
            { id: "wiring", quantity: 10 }
        ]
    },
    "plasma_shield": {
        name: "Plasma Shield",
        result: { id: "plasma_shield", type: "armor", defense: 7 },
        ingredients: [
            { id: "scrap_metal", quantity: 25 },
            { id: "microchips", quantity: 10 }
        ]
    },
    "grenade": {
        name: "Grenade",
        result: { id: "grenade", type: "consumable", damage: 30 },
        ingredients: [
            { id: "scrap_metal", quantity: 5 },
            { id: "gunpowder", quantity: 2 }
        ]
    },
    "molotov": {
        name: "Molotov",
        result: { id: "molotov", type: "consumable", damagePerTurn: 15, duration: 2 },
        ingredients: [
            { id: "cloth", quantity: 1 },
            { id: "plasma_canister", quantity: 1 } // Using plasma canister for fuel
        ]
    },
    "pipe_bomb": {
        name: "Pipe Bomb",
        result: { id: "pipe_bomb", type: "consumable", damage: 50 },
        ingredients: [
            { id: "pipe", quantity: 1 },
            { id: "gunpowder", quantity: 3 }
        ]
    },
    "bow_knife": {
        name: "Bow Knife",
        result: { id: "bow_knife", type: "weapon", attack: 7 },
        ingredients: [
            { id: "scrap_metal", quantity: 8 },
            { id: "wiring", quantity: 3 }
        ]
    },
    "switchblade": {
        name: "Switchblade",
        result: { id: "switchblade", type: "weapon", attack: 10 },
        ingredients: [
            { id: "scrap_metal", quantity: 12 },
            { id: "microchips", quantity: 2 }
        ]
    },
    "katana": {
        name: "Katana",
        result: { id: "katana", type: "weapon", attack: 25 },
        ingredients: [
            { id: "scrap_metal", quantity: 30 },
            { id: "wiring", quantity: 10 },
            { id: "pipe", quantity: 5 }
        ]
    },
    "longsword": {
        name: "Longsword",
        result: { id: "longsword", type: "weapon", attack: 20 },
        ingredients: [
            { id: "scrap_metal", quantity: 25 },
            { id: "pipe", quantity: 4 }
        ]
    }
};

const medicalLogs = [
    "Log Entry 001: Patient: Cpt. Eva Rostova. Note: Patient refuses mandatory neural wellness scan for the third cycle. Cites 'superstition'. Physical health remains excellent, but recommend monitoring for signs of command-related stress.",
    "Log Entry 002: Patient: J. \"Hex\" Corbin, Engineering. Note: Treated for minor plasma burns to right hand. Patient was 'hot-wiring a nutrient paste dispenser for extra flavor'. Standard dermal regenerator applied. Advised against unauthorized equipment modification. Again.",
    "Log Entry 003: Patient: Security Chief A. Singh. Note: Laceration to forearm sustained during ###### training simulation. Patient insists it was 'just a scratch' and requested synth-staples over a dermal regenerator to 'save it for someone who needs it'. Request denied."
];

function checkRandomEncounter() {
    const currentLocation = locations[player.currentLocation];
    let potentialEnemies = [...currentLocation.enemiesInLocation]; // Make a copy

    // Add Corrupted Android to Cargo Bay encounters if not defeated
    if (player.currentLocation === 'cargo_bay' && !player.quests.corruptedAndroidDefeated) {
        potentialEnemies.push('corrupted_android');
    }

    if (potentialEnemies && potentialEnemies.length > 0 && Math.random() < randomEncounterChance) {
        let encounterGroup = [];
        
        // 20% chance of a pair if possible
        if (potentialEnemies.length >= 2 && Math.random() < 0.20) {
            printToOutput("WARNING... MUlIPLE THREATS DETECTED", "text-danger");
            // Shuffle array and pick two
            const shuffled = [...potentialEnemies].sort(() => 0.5 - Math.random());
            encounterGroup = shuffled.slice(0, 2);
        } else {
            // Otherwise, just one random enemy
            const randomEnemyKey = potentialEnemies[Math.floor(Math.random() * potentialEnemies.length)];
            encounterGroup.push(randomEnemyKey);
        }
        
        startEncounter(encounterGroup);
        return true;
    }
    return false;
}


function printToOutput(message, className) {
    const span = document.createElement('span');
    span.textContent = message + '\n';
    if (className) {
        span.className = className;
    }
    gameOutput.appendChild(span);
    gameOutput.scrollTop = gameOutput.scrollHeight;
}

function handleInput(event) {
    if (event.key === 'Enter') {
        const command = userInput.value.trim();
        printToOutput(`> ${command}`, 'text-system');
        userInput.value = ''; // Clear input
        
        processCommand(command);
    }
}

function handleMovement(command) {
    const direction = command.toLowerCase();
    const validExits = locations[player.currentLocation].exits;

    if (validExits[direction]) {
        player.currentLocation = validExits[direction];
        displayLocation(); // Show the new location
        return true;
    }
    return false;
}

function processCommand(command) {
    console.log("Processing command:", command);
    console.log("battleActive:", battleActive);
    console.log("awaitingInteractionChoice:", awaitingInteractionChoice);
    console.log("awaitingInteractionSelection:", awaitingInteractionSelection);

    if (battleActive) {
        handleBattleCommand(command);
        return;
    }

    if (awaitingInteractionChoice) {
        console.log("AWAITING USER INPUT...");
        if (command.toLowerCase() === 'yes') {
            awaitingInteractionChoice = false;
            handleRoomInteractionYes();
            return;
        } else if (command.toLowerCase() === 'no') {
            awaitingInteractionChoice = false;
            printToOutput("You decide not to interact with the room for now.", 'text-system');
            return;
        } else {
            printToOutput("ERROR INVALID OUTPUT, PLEASE USE 'yes' or 'no'.", 'text-danger');
            return;
        }
    }

    if (awaitingInteractionSelection) {
        console.log("AWAITING USER INPUT...");
        const selection = parseInt(command);
        if (!isNaN(selection) && selection >= 1 && selection <= currentInteractionOptions.length) {
            const chosenOption = currentInteractionOptions[selection - 1];
            console.log("Chosen option:", chosenOption);
            awaitingInteractionSelection = false; // Reset state
            currentInteractionOptions = []; // Clear options
            processCommand(chosenOption); // Execute the chosen command
            return;
        } else {
            printToOutput("ERROR, INVALID COMMAND.", 'text-danger');
            return;
        }
    }

    if (handleMovement(command)) {
        checkRandomEncounter();
        return;
    }

    const [commandWord, ...args] = command.toLowerCase().split(' ');

    switch (commandWord) {
        case 'look':
            displayLocation();
            printToOutput(`SYSTEM STATUS: ${player.health}/${player.maxHealth}`, 'text-system');
            break;
        case 'help':
            printToOutput("Available commands: look, inventory, equip [item], craft, use [item], repair, drop [item], weapons, armor, status, [directions like n, s, e, w].", 'text-system');
            break;
        case 'music':
            if (args[0] === 'on') {
                playMusic();
                printToOutput("Background music turned on.", 'text-system');
            } else if (args[0] === 'off') {
                pauseMusic();
                printToOutput("Background music turned off.", 'text-system');
            } else {
                printToOutput("Use 'music on' or 'music off'.", 'text-danger');
            }
            break;

        case 'search':
            const currentSearchLocation = locations[player.currentLocation];
            if (currentSearchLocation.searchable_materials && currentSearchLocation.searchable_materials.length > 0) {
                printToOutput("You search the area...", 'text-system');
                let foundSomething = false;
                currentSearchLocation.searchable_materials.forEach(drop => {
                    if (Math.random() < drop.chance) {
                        foundSomething = true;
                        const itemData = materials[drop.item] || consumables[drop.item];
                        const equipmentData = weapons[drop.item] || armor[drop.item];

                        if (itemData) { // It's a stackable material/consumable
                            const quantity = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
                            if (player.materials[drop.item]) {
                                player.materials[drop.item] += quantity;
                            } else {
                                player.materials[drop.item] = quantity;
                            }
                            printToOutput(`Found ${quantity}x ${itemData.name}!`, 'text-item');
                        } else if (equipmentData) { // It's a unique weapon/armor
                             const newItem = {
                                baseId: drop.item,
                                name: equipmentData.name,
                                tier: 1,
                                attributes: []
                            };
                            // No attributes on searched items for now, to make battle drops more special
                            player.equipment.push(newItem);
                            printToOutput(`Found a ${newItem.name}!`, 'text-item');
                        }
                    }
                });
                if (!foundSomething) {
                    printToOutput("You found nothing of interest.", 'text-system');
                }
            } else {
                printToOutput("There's nothing to search here.", 'text-system');
            }
            break;
        case 'inventory':
        case 'i':
            printToOutput("--- EQUIPMENT ---", 'text-system');
            if (player.equipment.length === 0) {
                printToOutput("No equipment.", 'text-system');
            } else {
                player.equipment.forEach((item, index) => {
                    printToOutput(`[${index}] ${item.name}`, 'text-item');
                });
            }

            printToOutput("--- MATERIALS ---", 'text-system');
            const materialKeys = Object.keys(player.materials);
            if (materialKeys.length === 0) {
                printToOutput("No materials.", 'text-system');
            } else {
                for (const itemKey of materialKeys) {
                    const quantity = player.materials[itemKey];
                    const item = materials[itemKey] || consumables[itemKey];
                    if (item) {
                        printToOutput(`${item.name} (x${quantity})`, 'text-item');
                    }
                }
            }
            break;
        case 'equip':
            if (args.length > 0) {
                const index = parseInt(args[0]);
                if (!isNaN(index) && index >= 0 && index < player.equipment.length) {
                    const itemToEquip = player.equipment[index];
                    
                    if (weapons[itemToEquip.baseId]) { // It's a weapon
                        player.currentWeapon = itemToEquip;
                        printToOutput(`Equipped ${itemToEquip.name}.`, 'text-system');
                    } else if (armor[itemToEquip.baseId]) { // It's an armor
                        player.currentArmor = itemToEquip;
                        printToOutput(`Equipped ${itemToEquip.name}.`, 'text-system');
                    } else {
                        printToOutput("ERROR, NOT ACCEPTED", 'text-danger');
                    }
                } else {
                    printToOutput("ERROR NOT ACCEPTED, PLEASE TRY SOMETHING ELSE.", 'text-danger');
                }
            } else {
                printToOutput("What do you want to equip?", 'text-danger');
            }
            break;
        case 'craft':
            if (args.length === 0) {
                // No arguments, so show the recipe list
                printToOutput("--- CRAFTING RECIPES ---", 'text-system');
                if (Object.keys(recipes).length === 0) {
                    printToOutput("No recipes available.", 'text-system');
                } else {
                    for (const recipeId in recipes) {
                        const recipe = recipes[recipeId];
                        printToOutput(`${recipe.name} (craft ${recipeId}):`, 'text-item');
                        recipe.ingredients.forEach(ingredient => {
                            const materialName = materials[ingredient.id] ? materials[ingredient.id].name : ingredient.id;
                            printToOutput(`  - ${materialName} (x${ingredient.quantity})`, 'text-dialogue');
                        });
                    }
                }
            } else {
                // Arguments exist, so try to craft the item
                const recipeId = args[0];
                const recipe = recipes[recipeId];

                if (recipe) {
                    let canCraft = true;
                    // Check if player has enough materials
                    for (const ingredient of recipe.ingredients) {
                        if (!player.materials[ingredient.id] || player.materials[ingredient.id] < ingredient.quantity) {
                            canCraft = false;
                            const materialName = materials[ingredient.id] ? materials[ingredient.id].name : ingredient.id;
                            printToOutput(`You need ${ingredient.quantity}x ${materialName} to craft ${recipe.name}.`, 'text-danger');
                            break;
                        }
                    }

                    if (canCraft) {
                        // Consume ingredients
                        for (const ingredient of recipe.ingredients) {
                            player.materials[ingredient.id] -= ingredient.quantity;
                            if (player.materials[ingredient.id] === 0) {
                                delete player.materials[ingredient.id];
                            }
                        }

                        // Add crafted item
                        const resultId = recipe.result.id;
                        const resultType = recipe.result.type;

                        if (resultType === 'armor' || resultType === 'weapon') {
                            const equipmentData = weapons[resultId] || armor[resultId];
                            const newItem = {
                                baseId: resultId,
                                name: equipmentData.name,
                                tier: 1,
                                attributes: [],
                                perkData: {} // Initialize perkData for crafted items
                            };

                            // Apply random attribute with lower chance of negative for crafted items
                            if (Math.random() < 0.25) { // 25% chance for an attribute
                                const attrs = equipmentData.type === 'weapon' ? possible_attributes.weapon : possible_attributes.armor;
                                let randomAttr;
                                if (Math.random() < 0.75) { // 75% chance for positive attribute
                                    const positiveAttrs = attrs.filter(attr => attr.value > 0 || attr.type === 'crit_chance' || attr.type === 'hit_chance');
                                    randomAttr = positiveAttrs[Math.floor(Math.random() * positiveAttrs.length)];
                                } else { // 25% chance for negative attribute
                                    const negativeAttrs = attrs.filter(attr => attr.value < 0);
                                    randomAttr = negativeAttrs[Math.floor(Math.random() * negativeAttrs.length)];
                                }
                                if (randomAttr) {
                                    newItem.attributes.push(randomAttr);
                                    newItem.name += ` ${randomAttr.name}`;
                                }
                            }
                            if (equipmentData.perk === 'electric_stun') {
                                newItem.currentCooldown = 0;
                            }
                            player.equipment.push(newItem);
                            printToOutput(`You crafted a ${newItem.name}!`, 'text-item');
                        } else { // It's a material or consumable
                            if (player.materials[resultId]) {
                                player.materials[resultId]++;
                            } else {
                                player.materials[resultId] = 1;
                            }
                            const itemData = materials[resultId] || consumables[resultId];
                            printToOutput(`You crafted a ${itemData.name}!`, 'text-item');
                        }
                    }
                } else {
                    printToOutput(`Unknown recipe: '${recipeId}'.`, 'text-danger');
                }
            }
            break;


        case 'use':
            if (args.length > 0) {
                const itemToUse = args[0];
                if (player.materials[itemToUse] && player.materials[itemToUse] > 0) {
                    const item = consumables[itemToUse];
                    if (item && item.type === 'consumable') {
                        if (item.health_restore) {
                            player.health = Math.min(player.maxHealth, player.health + item.health_restore);
                            printToOutput(`You used ${item.name} and restored ${item.health_restore} health. Current health: ${player.health}/${player.maxHealth}`, 'text-system');
                            
                            player.materials[itemToUse]--;
                            if (player.materials[itemToUse] === 0) {
                                delete player.materials[itemToUse];
                            }
                        } else if (item.damage) { // Handle grenade damage
                            if (battleActive && enemyQueue.length > 0 || currentEnemy) {
                                printToOutput(`You used a ${item.name}!`, 'text-system');
                                player.materials[itemToUse]--;
                                if (player.materials[itemToUse] === 0) {
                                    delete player.materials[itemToUse];
                                }

                                // Damage current enemy
                                if (currentEnemy) {
                                    currentEnemy.health -= item.damage;
                                    printToOutput(`The ${currentEnemy.name} takes ${item.damage} damage!`, 'text-system');
                                    if (currentEnemy.health <= 0) {
                                        handleEnemyDefeated();
                                    }
                                }

                                // Damage other enemies in queue (AoE)
                                enemyQueue.forEach(enemyId => {
                                    const enemyInQueue = enemies[enemyId];
                                    if (enemyInQueue) {
                                        enemyInQueue.health -= item.damage;
                                        printToOutput(`A ${enemyInQueue.name} in the queue takes ${item.damage} damage!`, 'text-system');
                                        // Note: Defeating enemies in queue this way won't trigger handleEnemyDefeated immediately
                                        // This might need more complex logic if we want to remove them from queue immediately
                                    }
                                });

                            } else if (item.perk === 'fire_burn') { // Handle molotov fire_burn
                                if (battleActive && (enemyQueue.length > 0 || currentEnemy)) {
                                    printToOutput(`You used a ${item.name}!`, 'text-system');
                                    player.materials[itemToUse]--;
                                    if (player.materials[itemToUse] === 0) {
                                        delete player.materials[itemToUse];
                                    }

                                    const fireBurnEffect = { type: 'fire_burn', duration: item.duration, damagePerTurn: item.damagePerTurn };

                                    // Apply to current enemy
                                    if (currentEnemy) {
                                        if (!currentEnemy.statusEffects) {
                                            currentEnemy.statusEffects = [];
                                        }
                                        currentEnemy.statusEffects.push(fireBurnEffect);
                                        printToOutput(`The ${currentEnemy.name} is engulfed in flames!`, 'text-danger');
                                    }

                                    // Apply to other enemies in queue (AoE)
                                    enemyQueue.forEach(enemyId => {
                                        const enemyInQueue = enemies[enemyId];
                                        if (enemyInQueue) {
                                            if (!enemyInQueue.statusEffects) {
                                                enemyInQueue.statusEffects = [];
                                            }
                                            enemyInQueue.statusEffects.push(fireBurnEffect);
                                        printToOutput(`A ${enemyInQueue.name} in the queue is engulfed in flames!`, 'text-danger');
                                    }
                                });
                            } else if (item.damage && item.name === 'Pipe Bomb') { // Handle pipe bomb damage
                                if (battleActive && (enemyQueue.length > 0 || currentEnemy)) {
                                    printToOutput(`You used a ${item.name}!`, 'text-system');
                                    player.materials[itemToUse]--;
                                    if (player.materials[itemToUse] === 0) {
                                        delete player.materials[itemToUse];
                                    }

                                    // Damage current enemy
                                    if (currentEnemy) {
                                        currentEnemy.health -= item.damage;
                                        printToOutput(`The ${currentEnemy.name} takes ${item.damage} damage!`, 'text-system');
                                        if (currentEnemy.health <= 0) {
                                            handleEnemyDefeated();
                                        }
                                    }

                                    // Damage other enemies in queue (AoE)
                                    enemyQueue.forEach(enemyId => {
                                        const enemyInQueue = enemies[enemyId];
                                        if (enemyInQueue) {
                                            enemyInQueue.health -= item.damage;
                                            printToOutput(`A ${enemyInQueue.name} in the queue takes ${item.damage} damage!`, 'text-system');
                                        }
                                    });
                                } else { // Not in battle, clear the room
                                    printToOutput(`You placed a ${item.name} and detonated it, clearing the room of all hostiles!`, 'text-success');
                                    player.materials[itemToUse]--;
                                    if (player.materials[itemToUse] === 0) {
                                        delete player.materials[itemToUse];
                                    }
                                    // Clear enemies from the current location
                                    locations[player.currentLocation].enemiesInLocation = [];
                                    // Also clear any active battle state if somehow triggered outside of battle
                                    battleActive = false;
                                    currentEnemy = null;
                                    enemyQueue = [];
                                    battleRewards = { xp: 0, items: {} };
                                    displayLocation(); // Redisplay location to show it's clear
                                }
                            }
                        } else {
                            printToOutput(`ERROR, UNAVALIBLE ACTION.`, 'text-danger');
                        }
                } else {
                    printToOutput("ERROR NOT FOUND.", 'text-danger');
                }
            } else {
                printToOutput("What do you want to use?", 'text-danger');
            }
            break;

        case 'view':
            if (args[0] === 'logs') {
                if (isPlayerInLocation('medbay')) {
                    printToOutput("--- Accessing Medical Terminal ---", "text-system");
                    medicalLogs.forEach(log => {
                        printToOutput(log, "text-dialogue");
                    });
                } else {
                    printToOutput("There are no logs to view here.", 'text-danger');
                }
            } else {
                printToOutput("What do you want to view?", 'text-danger');
            }
            break;

        case 'scan':
            if (args[0] === 'chip') {
                if (isPlayerInLocation('engineering')) {
                    if (player.questItems.includes('memory_chip')) {
                        printToOutput("--- Analyzing Memory Chip ---", "text-system");
                        printToOutput("The chip contains encrypted security protocols for the 'Pioneer' shuttle. Access Level 1 granted.", "text-dialogue");
                        
                        // Remove chip and grant access
                        player.questItems = player.questItems.filter(item => item !== 'memory_chip');
                        player.securityAccessLevel = 1;
                        printToOutput("Security Access Level 1 acquired. You can now 'fly pioneer' from the Shuttle Bay.", "text-success");
                    } else {
                        printToOutput("You don't have a memory chip to scan.", 'text-danger');
                    }
                } else {
                    printToOutput("You can only scan memory chips at the terminal in the Engineering Deck.", 'text-danger');
                }
            } else {
                printToOutput("What do you want to scan?", 'text-danger');
            }
            break;

        case 'fly':
            if (args[0] === 'pioneer') {
                if (isPlayerInLocation('shuttle_bay')) {
                    if (player.securityAccessLevel >= 1) {
                        printToOutput("--- Activating 'Pioneer' Shuttle ---", "text-system");
                        printToOutput("The shuttle's engines hum to life. You engage the thrusters and blast off into the unknown!", "text-success");
                        // This could lead to a new game state, location, or even end the game.
                        // For now, let's just end the game as a placeholder for completing this chapter.
                        gameOver();
                    } else {
                        printToOutput("ERROR, DENIED.", 'text-danger');
                    }
                } else {
                    printToOutput("ERROR.", 'text-danger');
                }
            } else {
                printToOutput("What do you want to fly?", 'text-danger');
            }
            break;

        case 'drop':
            if (args.length > 0) {
                const firstArg = args[0];
                const isIndex = !isNaN(parseInt(firstArg));

                if (isIndex) { // Dropping equipment by index
                    const index = parseInt(firstArg);
                    if (index >= 0 && index < player.equipment.length) {
                        const droppedItem = player.equipment.splice(index, 1)[0]; // Remove from array
                        printToOutput(`You dropped ${droppedItem.name}.`, 'text-system');
                    } else {
                        printToOutput("Invalid equipment index.", 'text-danger');
                    }
                } else { // Dropping materials by name
                    const itemToDrop = firstArg;
                    let quantity = 1;
                    if (args.length > 1 && !isNaN(parseInt(args[1]))) {
                        quantity = parseInt(args[1]);
                    }

                    if (player.materials[itemToDrop] && player.materials[itemToDrop] >= quantity) {
                        const item = materials[itemToDrop] || consumables[itemToDrop];
                        const itemName = item ? item.name : itemToDrop;
                        
                        player.materials[itemToDrop] -= quantity;
                        if (player.materials[itemToDrop] <= 0) {
                            delete player.materials[itemToDrop];
                        }
                        printToOutput(`You dropped ${quantity}x ${itemName}.`, 'text-system');
                    } else {
                        printToOutput("You don't have enough of that material to drop.", 'text-danger');
                    }
                }
            } else {
                printToOutput("What do you want to drop?", 'text-danger');
            }
            break;

        case 'weapons':
            printToOutput("--- WEAPONS ---", 'text-system');
            const foundWeapons = player.equipment.filter(item => weapons[item.baseId]);
            if (foundWeapons.length === 0) {
                printToOutput("ERROR, NULL.", 'text-system');
            } else {
                foundWeapons.forEach(item => {
                    const itemIndex = player.equipment.indexOf(item);
                    const weaponData = weapons[item.baseId];
                    const weaponTier = weaponData.tiers[item.tier - 1];
                    // Note: This does not yet account for attribute bonuses on the display.
                    printToOutput(`[${itemIndex}] ${item.name} (T${item.tier}) - Attack: ${weaponTier.attack}`, 'text-item');
                });
            }
            break;
        case 'armor':
            printToOutput("--- ARMOR ---", 'text-system');
            const foundArmor = player.equipment.filter(item => armor[item.baseId]);
            if (foundArmor.length === 0) {
                printToOutput("ERROR, NULL", 'text-system');
            } else {
                foundArmor.forEach(item => {
                    const itemIndex = player.equipment.indexOf(item);
                    const armorData = armor[item.baseId];
                    const armorTier = armorData.tiers[item.tier - 1];
                    // Note: This does not yet account for attribute bonuses on the display.
                    printToOutput(`[${itemIndex}] ${item.name} (T${item.tier}) - Defense: ${armorTier.defense}`, 'text-item');
                });
            }
            break;
        case 'status':
            printToOutput("--- PLAYER STATUS ---", 'text-system');
            printToOutput(`Health: ${player.health}/${player.maxHealth}`);
            printToOutput(`Level: ${player.level} (XP: ${player.xp}/${getXpToNextLevel(player.level)})`);

            // Calculate total attack
            let totalPlayerAttack = player.attack;
            let equippedWeaponName = "None";
            if (player.currentWeapon) {
                equippedWeaponName = player.currentWeapon.name;
                const weaponData = weapons[player.currentWeapon.baseId];
                const weaponTier = weaponData.tiers[player.currentWeapon.tier - 1];
                totalPlayerAttack += weaponTier.attack;

                player.currentWeapon.attributes.forEach(attr => {
                    if (attr.type === 'stat_change' && attr.stat === 'attack') {
                        totalPlayerAttack += attr.value;
                    }
                });
            }

            // Calculate total defense
            let totalPlayerDefense = player.defense;
            let equippedArmorName = "None";
            if (player.currentArmor) {
                equippedArmorName = player.currentArmor.name;
                const armorData = armor[player.currentArmor.baseId];
                const armorTier = armorData.tiers[player.currentArmor.tier - 1];
                totalPlayerDefense += armorTier.defense;

                player.currentArmor.attributes.forEach(attr => {
                    if (attr.type === 'stat_change' && attr.stat === 'defense') {
                        totalPlayerDefense += attr.value;
                    }
                });
            }

            printToOutput(`Equipped Weapon: ${equippedWeaponName}`, 'text-system');
            printToOutput(`Equipped Armor: ${equippedArmorName}`, 'text-system');
            printToOutput(`Total Attack: ${totalPlayerAttack}`, 'text-system');
            printToOutput(`Total Defense: ${totalPlayerDefense}`, 'text-system');
            break;
        case 'repair':
            const repairCostScrap = 1;
            const repairCostWiring = 1;
            const healthRestored = 20;

            const hasScrap = player.materials['scrap_metal'] && player.materials['scrap_metal'] >= repairCostScrap;
            const hasWiring = player.materials['wiring'] && player.materials['wiring'] >= repairCostWiring;

            if (hasScrap && hasWiring) {
                // Consume materials
                player.materials['scrap_metal'] -= repairCostScrap;
                if (player.materials['scrap_metal'] === 0) {
                    delete player.materials['scrap_metal'];
                }
                player.materials['wiring'] -= repairCostWiring;
                if (player.materials['wiring'] === 0) {
                    delete player.materials['wiring'];
                }

                // Restore health
                player.health = Math.min(player.maxHealth, player.health + healthRestored);
                printToOutput(`You used ${repairCostScrap} scrap metal and ${repairCostWiring} wiring to repair yourself, restoring ${healthRestored} health. Current health: ${player.health}/${player.maxHealth}`, 'text-system');
            } else {
                printToOutput(`You need ${repairCostScrap} scrap metal and ${repairCostWiring} wiring to repair yourself.`, 'text-danger');
            }
            break;

        case 'upgrade':
            if (args.length > 0) {
                const index = parseInt(args[0]);
                if (!isNaN(index) && index >= 0 && index < player.equipment.length) {
                    const itemToUpgrade = player.equipment[index];
                    const itemData = weapons[itemToUpgrade.baseId] || armor[itemToUpgrade.baseId];

                    if (itemData) {
                        const currentTierIndex = itemToUpgrade.tier - 1;
                        if (currentTierIndex >= itemData.tiers.length - 1) {
                            printToOutput(`${itemToUpgrade.name} is already at its maximum tier.`, 'text-danger');
                            return;
                        }

                        const nextTier = itemData.tiers[currentTierIndex + 1];
                        let canUpgrade = true;
                        // Check materials
                        if (nextTier.materials.length > 0) {
                            for (const material of nextTier.materials) {
                                if (!player.materials[material.id] || player.materials[material.id] < material.quantity) {
                                    canUpgrade = false;
                                    const materialName = materials[material.id] ? materials[material.id].name : material.id;
                                    printToOutput(`You need ${material.quantity}x ${materialName} to upgrade.`, 'text-danger');
                                    break;
                                }
                            }
                        } else { // No materials needed for next tier (max tier)
                            printToOutput(`${itemToUpgrade.name} cannot be upgraded any further.`, 'text-danger');
                            canUpgrade = false;
                        }

                        if (canUpgrade) {
                            // Consume materials
                            for (const material of nextTier.materials) {
                                player.materials[material.id] -= material.quantity;
                                if (player.materials[material.id] === 0) {
                                    delete player.materials[material.id];
                                }
                            }

                            // Apply upgrade
                            itemToUpgrade.tier++;
                            itemToUpgrade.name = `${itemData.name} T${itemToUpgrade.tier}`;
                            printToOutput(`Successfully upgraded ${itemData.name} to Tier ${itemToUpgrade.tier}!`, 'text-success');
                        }
                    } else {
                        printToOutput("ERROR, NULL EXCEPTION.", 'text-danger');
                    }
                } else {
                    printToOutput("Invalid item index. Type 'inventory' to see item indices.", 'text-danger');
                }
            } else {
                printToOutput("What do you want to upgrade? (e.g., upgrade 1)", 'text-danger');
            }
            break;
        case 'deconstruct':
            if (args.length > 0) {
                const index = parseInt(args[0]);
                if (!isNaN(index) && index >= 0 && index < player.equipment.length) {
                    const itemToDeconstruct = player.equipment[index];
                    const recipe = recipes[itemToDeconstruct.baseId];

                    if (recipe && recipe.ingredients) {
                        printToOutput(`Deconstructing ${itemToDeconstruct.name}...`, 'text-system');
                        player.equipment.splice(index, 1); // Remove item

                        recipe.ingredients.forEach(ingredient => {
                            const quantityToReturn = Math.floor(ingredient.quantity * (Math.random() * (0.75 - 0.5) + 0.5)); // 50-75% return
                            if (quantityToReturn > 0) {
                                if (player.materials[ingredient.id]) {
                                    player.materials[ingredient.id] += quantityToReturn;
                                } else {
                                    player.materials[ingredient.id] = quantityToReturn;
                                }
                                const materialName = materials[ingredient.id] ? materials[ingredient.id].name : ingredient.id;
                                printToOutput(`Recovered ${quantityToReturn}x ${materialName}.`, 'text-item');
                            }
                        });
                    } else {
                        printToOutput("This item cannot be deconstructed or has no known recipe.", 'text-danger');
                    }
                } else {
                    printToOutput("Invalid item index. Type 'inventory' to see item indices.", 'text-danger');
                }
            } else {
                printToOutput("What do you want to deconstruct? (e.g., deconstruct 0)", 'text-danger');
            }
            break;
        case 'fight':
            if (args.length > 0) {
                const enemyId = args[0];
                const currentLocation = locations[player.currentLocation];
    
                if (currentLocation.enemiesInLocation && currentLocation.enemiesInLocation.includes(enemyId)) {
                    startBattle(enemies[enemyId]);
                } else if (enemies[enemyId]) {
                    printToOutput(`There is no ${enemies[enemyId].name} here to fight.`, 'text-danger');
                } else {
                    printToOutput(`Unknown enemy: '${enemyId}'.`, 'text-danger');
                }
            } else {
                printToOutput("Who do you want to fight?", 'text-danger');
            }
            break;
        default:
            printToOutput(`Unknown command: '${command}'. Type 'help' for a list of commands.`, 'text-danger');
    }
}

function handleRoomInteractionYes() {
    const currentLocation = locations[player.currentLocation];
    printToOutput("\nWhat would you like to do?", 'text-system');
    let options = [];

    if (currentLocation.searchable_materials && currentLocation.searchable_materials.length > 0) {
        options.push("search");
    }
    if (player.currentLocation === 'medbay') {
        options.push("view logs");
    }
    if (player.currentLocation === 'engineering' && player.questItems.includes('memory_chip')) {
        options.push("scan chip");
    }
    if (player.currentLocation === 'shuttle_bay' && player.securityAccessLevel >= 1) {
        options.push("fly pioneer");
    }

    currentInteractionOptions = options; // Store options for later selection

    if (options.length > 0) {
        options.forEach((option, index) => {
            printToOutput(`${index + 1}. ${option}`, 'text-system');
        });
        awaitingInteractionSelection = true; // Set state to await selection
        printToOutput("Enter the number of your choice:", 'text-system');
    } else {
        printToOutput("There's nothing specific to interact with here.", 'text-system');
    }
}

function displayLocation() {
    const currentLocation = locations[player.currentLocation];
    printToOutput(`\n--- ${currentLocation.name.toUpperCase()} ---`, 'text-location');
    printToOutput(currentLocation.description, 'text-dialogue');

    if (currentLocation.enemiesInLocation && currentLocation.enemiesInLocation.length > 0) {
        printToOutput("Enemies present:", 'text-danger');
        currentLocation.enemiesInLocation.forEach(enemyId => {
            printToOutput(`- ${enemies[enemyId].name}`, 'text-danger');
        });
    }

    awaitingInteractionChoice = true;
    printToOutput("\nDo you want to interact with the room? (yes/no)", 'text-system');
}

function startEncounter(enemyIdArray) {
    if (!enemyIdArray || enemyIdArray.length === 0) {
        return;
    }
    enemyQueue = [...enemyIdArray];
    battleRewards = { xp: 0, items: {} };
    battleActive = true;

    printToOutput(`\n--- BATTLE STARTED ---`, 'text-danger');
    startNextEnemy();
}

function startNextEnemy() {
    if (enemyQueue.length === 0) {
        endBattle();
        return;
    }
    const nextEnemyId = enemyQueue.shift();
    currentEnemy = { ...enemies[nextEnemyId] }; 

    printToOutput(`A ${currentEnemy.name} appears! ${currentEnemy.description}`, 'text-danger');
    printToOutput(`Your health: ${player.health}/${player.maxHealth}`);
    printToOutput(`${currentEnemy.name} health: ${currentEnemy.health}/${currentEnemy.maxHealth}`);
    printToOutput(`What will you do? (attack, run)`);
}

function handleEnemyDefeated() {
    const defeatedEnemy = { ...currentEnemy };
    printToOutput(`${defeatedEnemy.name} defeated!`, 'text-system');

    // Accumulate rewards
    if (defeatedEnemy.xpValue) {
        battleRewards.xp += defeatedEnemy.xpValue;
    }
    if (defeatedEnemy.drops) {
        defeatedEnemy.drops.forEach(drop => {
            if (Math.random() < drop.chance) {
                const quantity = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
                if (battleRewards.items[drop.item]) {
                    battleRewards.items[drop.item] += quantity;
                } else {
                    battleRewards.items[drop.item] = quantity;
                }
            }
        });
    }

    // --- QUEST ITEM LOGIC ---
    if (defeatedEnemy.baseId === 'corrupted_android' && !player.quests.corruptedAndroidDefeated) {
        player.questItems.push('memory_chip');
        player.quests.corruptedAndroidDefeated = true;
        printToOutput("You retrieve a 'Memory Chip' from the defeated android. New Objective: Take the Memory Chip to the Engineering Deck.", 'text-success');
    }
    // --- END QUEST ITEM LOGIC ---

    // Award perk XP for plasma_burn
    if (defeatedEnemy.statusEffects) {
        defeatedEnemy.statusEffects.forEach(effect => {
            if (effect.type === 'plasma_burn' && effect.weaponBaseId) {
                const plasmaWeapon = player.equipment.find(item => item.baseId === effect.weaponBaseId && item.perkData && item.perkData.plasma_burn);
                if (plasmaWeapon) {
                    gainPerkXP(plasmaWeapon, 'plasma_burn', 25); // Award 25 XP for defeating an enemy with plasma_burn
                }
            } else if (effect.type === 'electric_stun' && effect.weaponBaseId) {
                const stunWeapon = player.equipment.find(item => item.baseId === effect.weaponBaseId && item.perkData && item.perkData.electric_stun);
                if (stunWeapon) {
                    gainPerkXP(stunWeapon, 'electric_stun', 20); // Award 20 XP for defeating an enemy with electric_stun
                }
            } else if (effect.type === 'fire_burn') {
                // Molotovs are consumables, not weapons, so no perk XP for them directly
                // If we want to track Molotov usage for a player stat, that would be a separate system
            }
        });
    }

    if (enemyQueue.length > 0) {
        printToOutput("The next foe approaches...", "text-system");
        startNextEnemy();
    } else {
        endBattle();
    }
}

function handleBattleCommand(command) {
    let totalPlayerAttack = player.attack;
    if (player.currentWeapon) {
        const weaponData = weapons[player.currentWeapon.baseId];
        const weaponTier = weaponData.tiers[player.currentWeapon.tier - 1];
        totalPlayerAttack += weaponTier.attack;

        player.currentWeapon.attributes.forEach(attr => {
            if (attr.type === 'stat_change' && attr.stat === 'attack') {
                totalPlayerAttack += attr.value;
            }
        });
    }

    let totalPlayerDefense = player.defense;
    if (player.currentArmor) {
        const armorData = armor[player.currentArmor.baseId];
        const armorTier = armorData.tiers[player.currentArmor.tier - 1];
        totalPlayerDefense += armorTier.defense;

        player.currentArmor.attributes.forEach(attr => {
            if (attr.type === 'stat_change' && attr.stat === 'defense') {
                totalPlayerDefense += attr.value;
            }
        });
    }

    switch (command.toLowerCase()) {
        case 'attack':
            playSoundEffect();

            let playerHitChance = 0.8; // Base hit chance
            if (player.currentWeapon) {
                player.currentWeapon.attributes.forEach(attr => {
                    if (attr.type === 'hit_chance') {
                        playerHitChance += attr.value;
                    }
                });
            }

            if (Math.random() < playerHitChance) {
                let playerDamage = Math.max(0, totalPlayerAttack - currentEnemy.defense);
                currentEnemy.health -= playerDamage;
                printToOutput(`You attack the ${currentEnemy.name} for ${playerDamage} damage!`, 'text-system');

                if (player.currentWeapon && player.currentWeapon.perk === 'bleed' && Math.random() < 0.5) { 
                    if (!currentEnemy.statusEffects) {
                        currentEnemy.statusEffects = [];
                    }
                    const bleedEffect = { type: 'bleed', duration: 3, damage: 2 };
                    currentEnemy.statusEffects.push(bleedEffect);
                    printToOutput(`${currentEnemy.name} is bleeding!`, 'text-danger');
                }

                if (player.currentWeapon && player.currentWeapon.perk === 'plasma_burn') {
                    if (!currentEnemy.statusEffects) {
                        currentEnemy.statusEffects = [];
                    }
                    // Check if plasma_burn is already active, if so, refresh duration and update tier if new weapon is higher tier
                    let existingPlasmaBurn = currentEnemy.statusEffects.find(effect => effect.type === 'plasma_burn');
                    if (existingPlasmaBurn) {
                        existingPlasmaBurn.duration = 3; // Refresh duration
                        // Update tier if the current weapon's tier is higher
                        if (player.currentWeapon.tier > existingPlasmaBurn.weaponTier) {
                            existingPlasmaBurn.weaponTier = player.currentWeapon.tier;
                        }
                        existingPlasmaBurn.weaponBaseId = player.currentWeapon.baseId; // Update weaponBaseId
                    } else {
                        const plasmaBurnEffect = { type: 'plasma_burn', duration: 3, weaponTier: player.currentWeapon.tier, damagePerTier: 10, weaponBaseId: player.currentWeapon.baseId };
                        currentEnemy.statusEffects.push(plasmaBurnEffect);
                    }
                    printToOutput(`${currentEnemy.name} is engulfed in plasma!`, 'text-danger');
                }

                if (player.currentWeapon && player.currentWeapon.perk === 'electric_stun') {
                    if (player.currentWeapon.currentCooldown && player.currentWeapon.currentCooldown > 0) {
                        printToOutput(`${player.currentWeapon.name} is on cooldown (${player.currentWeapon.currentCooldown} turns remaining).`, 'text-danger');
                    } else {
                        if (!currentEnemy.statusEffects) {
                            currentEnemy.statusEffects = [];
                        }
                        const weaponData = weapons[player.currentWeapon.baseId];
                        const weaponTier = weaponData.tiers[player.currentWeapon.tier - 1];
                        const stunEffect = { type: 'electric_stun', duration: weaponTier.stunDuration, weaponBaseId: player.currentWeapon.baseId };
                        currentEnemy.statusEffects.push(stunEffect);
                        player.currentWeapon.currentCooldown = weaponTier.cooldown; // Set cooldown
                        printToOutput(`${currentEnemy.name} is stunned for ${weaponTier.stunDuration} turn(s)!`, 'text-danger');
                    }
                }

            } else {
                printToOutput(`You missed the ${currentEnemy.name}!`, 'text-danger');
            }

            if (currentEnemy.health <= 0) {
                handleEnemyDefeated();
                return;
            }

            if (currentEnemy.statusEffects && currentEnemy.statusEffects.length > 0) {
                currentEnemy.statusEffects.forEach(effect => {
                    if (effect.type === 'bleed') {
                        currentEnemy.health -= effect.damage;
                        printToOutput(`${currentEnemy.name} takes ${effect.damage} bleed damage!`, 'text-danger');
                        effect.duration--;
                    } else if (effect.type === 'plasma_burn') {
                        const plasmaDamage = effect.weaponTier * effect.damagePerTier;
                        currentEnemy.health -= plasmaDamage;
                        printToOutput(`${currentEnemy.name} takes ${plasmaDamage} plasma burn damage!`, 'text-danger');
                        effect.duration--;
                    } else if (effect.type === 'fire_burn') {
                        currentEnemy.health -= effect.damagePerTurn;
                        printToOutput(`${currentEnemy.name} takes ${effect.damagePerTurn} fire burn damage!`, 'text-danger');
                        effect.duration--;
                    }
                });
                currentEnemy.statusEffects = currentEnemy.statusEffects.filter(effect => effect.duration > 0);
            }

            if (currentEnemy.health <= 0) {
                handleEnemyDefeated();
                return;
            }

            // Decrement weapon cooldown if applicable
            if (player.currentWeapon && player.currentWeapon.perk === 'electric_stun' && player.currentWeapon.currentCooldown > 0) {
                player.currentWeapon.currentCooldown--;
            }

            // Check for stun effect before enemy attacks
            const stunnedEffect = currentEnemy.statusEffects ? currentEnemy.statusEffects.find(effect => effect.type === 'electric_stun') : null;
            if (stunnedEffect && stunnedEffect.duration > 0) {
                printToOutput(`${currentEnemy.name} is stunned and cannot act! (${stunnedEffect.duration} turn(s) remaining)`, 'text-danger');
                stunnedEffect.duration--;
            } else {
                let enemyDamage = Math.max(0, currentEnemy.attack - totalPlayerDefense);
                player.health -= enemyDamage;
                printToOutput(`${currentEnemy.name} attacks you for ${enemyDamage} damage!`, 'text-danger');
            }

            if (player.health <= 0) {
                printToOutput(`You have been defeated by the ${currentEnemy.name}...`, 'text-danger');
                battleActive = false; // End battle on player death
                gameOver();
                return;
            }

            printToOutput(`Your health: ${player.health}/${player.maxHealth}`);
            printToOutput(`${currentEnemy.name} health: ${currentEnemy.health}/${currentEnemy.maxHealth}`);
            printToOutput(`What will you do? (attack, run)`);
            break;
        case 'run':
            printToOutput("You attempt to flee the encounter...");
            if (Math.random() > 0.2) {
                printToOutput("You successfully escaped!", 'text-system');
                battleActive = false;
                enemyQueue = [];
                currentEnemy = null;
                printToOutput("You can now issue regular commands again. Type 'help' for options.", 'text-system');
            } else {
                printToOutput("You failed to escape!", 'text-danger');
                let enemyDamage = Math.max(0, currentEnemy.attack - totalPlayerDefense);
                player.health -= enemyDamage;
                printToOutput(`${currentEnemy.name} attacks you for ${enemyDamage} damage as you try to flee!`, 'text-danger');
                if (player.health <= 0) {
                    printToOutput(`You have been defeated by the ${currentEnemy.name}... Game Over.`, 'text-danger');
                    battleActive = false;
                    gameOver();
                } else {
                    printToOutput(`Your health: ${player.health}/${player.maxHealth}`);
                    printToOutput(`${currentEnemy.name} health: ${currentEnemy.health}/${currentEnemy.maxHealth}`);
                    printToOutput(`What will you do? (attack, run)`);
                }
            }
            break;
        default:
            printToOutput(`ERROR, INVALID OUTPUT: '${command}'.`, 'text-system');
            break;
    }
}

function endBattle() {
    printToOutput(`--- END OF BATTLE ---`, 'text-system');
    printToOutput("You stand victorious over the wreckage of your foes.", 'text-system');

    // Award accumulated XP
    if (battleRewards.xp > 0) {
        player.xp += battleRewards.xp;
        printToOutput(`You gained a total of ${battleRewards.xp} experience points!`, 'text-success');
        checkLevelUp();
    }

    // Award accumulated loot
    const itemKeys = Object.keys(battleRewards.items);
    if (itemKeys.length > 0) {
        printToOutput("You scavenge the wreckage...", 'text-system');
        itemKeys.forEach(itemKey => {
            const quantity = battleRewards.items[itemKey];
            const itemData = materials[itemKey] || consumables[itemKey];
            const equipmentData = weapons[itemKey] || armor[itemKey];

            if (itemData) {
                if (player.materials[itemKey]) {
                    player.materials[itemKey] += quantity;
                } else {
                    player.materials[itemKey] = quantity;
                }
                printToOutput(`Found ${quantity}x ${itemData.name}!`, 'text-item');
            } else if (equipmentData) {
                for (let i = 0; i < quantity; i++) {
                    const newItem = { baseId: itemKey, name: equipmentData.name, tier: 1, attributes: [], perkData: {} };
                    if (equipmentData.perk === 'electric_stun') {
                        newItem.currentCooldown = 0;
                    }
                    if (Math.random() < 0.25) {
                        const attrs = equipmentData.type === 'weapon' ? possible_attributes.weapon : possible_attributes.armor;
                        const randomAttr = attrs[Math.floor(Math.random() * attrs.length)];
                        newItem.attributes.push(randomAttr);
                        newItem.name += ` ${randomAttr.name}`;
                    }
                    player.equipment.push(newItem);
                    printToOutput(`Found a ${newItem.name}!`, 'text-item');
                }
            }
        });
    }
    
    // 1% chance for undamaged weapon drop, separate from normal loot
    if (Math.random() < 0.01) { 
        const weaponKeys = Object.keys(weapons);
        const randomWeaponKey = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
        const equipmentData = weapons[randomWeaponKey];
        const newItem = {
            baseId: randomWeaponKey,
            name: equipmentData.name,
            tier: 1,
            attributes: [],
            perkData: {} // Initialize perkData for rare drops
        };
        if (equipmentData.perk === 'electric_stun') {
            newItem.currentCooldown = 0;
        }
        if (Math.random() < 0.5) { // 50% chance for an attribute on this rare drop
            const attrs = possible_attributes.weapon;
            const randomAttr = attrs[Math.floor(Math.random() * attrs.length)];
            newItem.attributes.push(randomAttr);
            newItem.name += ` ${randomAttr.name}`;
        }
        player.equipment.push(newItem);
        printToOutput(`You found a rare ${newItem.name}!`, 'text-item');
    }

    // Reset battle state
    battleActive = false;
    currentEnemy = null;
    enemyQueue = [];
    battleRewards = { xp: 0, items: {} };

    printToOutput("You can now issue regular commands again. Type 'help' for options.", 'text-system');

    awaitingInteractionChoice = true;
    printToOutput("\nDo you want to interact with the room? (yes/no)", 'text-system');
}

function gameOver() {
    printToOutput("\n*** GAME OVER ***", 'text-danger');
    printToOutput("Your journey ends here. Refresh the page to try again.", 'text-danger');
    userInput.disabled = true;
}

function checkLevelUp() {
    const xpNeeded = getXpToNextLevel(player.level);
    if (player.xp >= xpNeeded) {
        player.level++;
        player.xp -= xpNeeded; // Carry over excess XP
        player.maxHealth += 10; // Example stat increase
        player.health = player.maxHealth;
        player.attack += 2;
        player.defense += 1;
        printToOutput(`*** YOU LEVELED UP! You are now Level ${player.level}! ***`, 'text-success');
        printToOutput(`Your health increased to ${player.maxHealth}, attack to ${player.attack}, and defense to ${player.defense}.`, 'text-success');
    }
}

function gainPerkXP(weapon, perkType, xpAmount) {
    if (!weapon.perkData[perkType]) {
        weapon.perkData[perkType] = { level: 1, xp: 0, xpToNextLevel: 100 };
    }

    const perk = weapon.perkData[perkType];
    perk.xp += xpAmount;

    while (perk.xp >= perk.xpToNextLevel) {
        perk.xp -= perk.xpToNextLevel;
        perk.level++;
        perk.xpToNextLevel = Math.floor(perk.xpToNextLevel * 1.5); // Scale XP needed for next level
        printToOutput(`${weapon.name}'s ${perkType} perk leveled up to ${perk.level}!`, 'text-success');
    }
}

async function runBootSequence() {
    const bootDelay = 25;
    const lineDelay = 25;

    userInput.disabled = true;

    await delayedPrint("INITIALIZING BIOS... ", bootDelay, false);
    await delayedPrint("INITIATED", bootDelay);

    await delayedPrint("CHECKING MEMORY... ", bootDelay, false);
    await delayedPrint("ERROR NOT FOUND", bootDelay);

    await delayedPrint("LOADING... ", bootDelay, false);
    await drawProgressBar();

    await delayedPrint("\n\nSTARFALLEN v0.1.0-alpha", lineDelay, false, 'text-system');
    await delayedPrint("A GAME BY THE ONE AND ONLY MOOGIETHEBOOGIE!.", lineDelay, false, 'text-system');
    await delayedPrint("-------------------------------------------------", lineDelay, false, 'text-system');
    
    await delayedPrint("\nYou awaken from cryo-sleep. Your mission: Find out what happened on this ship.", lineDelay, false, 'text-dialogue');

    userInput.disabled = false;
    userInput.focus();
    displayLocation();
    playMusic();
}

function delayedPrint(message, delay, addNewline = true, className) {
    return new Promise(resolve => {
        const span = document.createElement('span');
        if (className) {
            span.className = className;
        }
        gameOutput.appendChild(span);
        gameOutput.scrollTop = gameOutput.scrollHeight;

        let i = 0;
        const typeInterval = setInterval(() => {
            if (i < message.length) {
                span.textContent += message.charAt(i);
                i++;
            } else {
                clearInterval(typeInterval);
                if (addNewline) {
                    span.textContent += '\n';
                }
                resolve();
            }
        }, delay);
    });
}

async function drawProgressBar(length = 20, delay = 50) {
    const progressBarSpan = document.createElement('span');
    gameOutput.appendChild(progressBarSpan);
    for (let i = 0; i <= length; i++) {
        await new Promise(resolve => setTimeout(resolve, delay));
        const progress = '[' + '#'.repeat(i) + ' '.repeat(length - i) + ']';
        progressBarSpan.textContent = progress;
    }
    progressBarSpan.textContent += " DONE\n";
}

// Initial game setup
document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements now that the DOM is loaded
    gameOutput = document.getElementById('game-output');
    userInput = document.getElementById('user-input');
    bgMusic = document.getElementById('bg-music');
    sfx = document.getElementById('sfx');

    // Add listener now that userInput is assigned
    userInput.addEventListener('keydown', handleInput);

    // Start the game
    runBootSequence();
});
