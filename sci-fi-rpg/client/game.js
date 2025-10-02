const gameOutput = document.getElementById('game-output');
const userInput = document.getElementById('user-input');

// Audio Elements
const bgMusic = document.getElementById('bg-music');
const sfx = document.getElementById('sfx');

function playMusic() {
    bgMusic.play().catch(error => console.log("Music autoplay prevented:", error));
}

function pauseMusic() {
    bgMusic.pause();
}

function playSoundEffect() {
    sfx.currentTime = 0; // Rewind to start for quick playback
    sfx.play().catch(error => console.log("SFX autoplay prevented:", error));
}

// Game State Variables
let gamePhase = 'intro'; // 'intro', 'playing', 'battle'
let battleActive = false;
let currentEnemy = null;

// Player Stats
let player = {
    name: "", // Player name will be set during intro
    health: 100,
    maxHealth: 100,
    attack: 15,
    defense: 5,
    currentLocation: "bridge", // Player starts on the bridge
    inventory: { 
        "power_core": 0, "titanium_mesh": 0, "fuel_canister": 0, 
        "energy_cell": 0, "scrap_metal": 0, "circuit_board": 0, 
        "optic_fiber": 0, "rare_earth": 0, "synthetic_fabric": 0, 
        "plasma_condenser": 0, "grav_stabilizer": 0, "nano_fibers": 0, 
        "cryo_fluid": 0, "bio_luminescent_gel": 0, "quantum_chip": 0, 
        "alloy_plate": 0, "power_regulator": 0, "sensor_array": 0, 
        "data_crystal": 0, "thermal_regulator": 0, "magnetic_coil": 0, 
        "polymer_resin": 0, "sonic_emitter": 0, "vibration_dampener": 0, 
        "exotic_matter": 0 
    }
};

// Game Settings
const randomEncounterChance = 0.3; // 30% chance of a random encounter after moving

// Game Locations
const locations = {
    "bridge": {
        name: "Starship Bridge",
        description: "You are on the command bridge of the starship 'Voyager'. The main viewscreen shows a swirling nebula. Consoles hum softly around you. Exits: north (Engineering), east (Crew Quarters), south (Cargo Bay), west (Medbay).",
        exits: {
            n: "engineering",
            e: "crew_quarters",
            s: "cargo_bay",
            w: "medbay"
        }
    },
    "engineering": {
        name: "Engineering Deck",
        description: "The heart of the ship's propulsion system. Sparks occasionally fly from exposed conduits. The air smells of ozone and coolant. Exits: south (Bridge).",
        exits: {
            s: "bridge"
        }
    },
    "crew_quarters": {
        name: "Crew Quarters",
        description: "Rows of bunks and personal lockers. A few holographic displays flicker with family photos. It's quiet here. Exits: west (Bridge).",
        exits: {
            w: "bridge"
        }
    },
    "cargo_bay": {
        name: "Cargo Bay",
        description: "Large crates are stacked high, secured with magnetic clamps. The heavy door to the shuttle bay is to the south. Exits: north (Bridge), south (Shuttle Bay).",
        exits: {
            n: "bridge",
            s: "shuttle_bay"
        }
    },
    "medbay": {
        name: "Medbay",
        description: "A sterile environment with diagnostic beds and medical equipment. A faint antiseptic smell hangs in the air. Exits: east (Bridge).",
        exits: {
            e: "bridge"
        }
    },
    "shuttle_bay": {
        name: "Shuttle Bay",
        description: "The main shuttle 'Pioneer' sits ready for launch. The bay doors lead out into space. Exits: north (Cargo Bay).",
        exits: {
            n: "cargo_bay"
        }
    }
};

// Enemy Templates (we can expand this later)
const enemies = {
    "scout_drone": {
        name: "Scout Drone",
        health: 30,
        maxHealth: 30,
        attack: 10,
        defense: 2,
        description: "A small, agile reconnaissance drone."
    },
    "combat_bot": {
        name: "Combat Bot",
        health: 60,
        maxHealth: 60,
        attack: 20,
        defense: 10,
        description: "A heavily armored combat unit."
    },
    "alien_scavenger": {
        name: "Alien Scavenger",
        health: 40,
        maxHealth: 40,
        attack: 12,
        defense: 3,
        description: "A cunning alien, looking for easy prey."
    },
    "mutated_creature": {
        name: "Mutated Creature",
        health: 80,
        maxHealth: 80,
        attack: 25,
        defense: 8,
        description: "A grotesque beast, mutated by cosmic radiation."
    }
};

function printToOutput(message) {
    gameOutput.innerHTML += message + '\n';
    gameOutput.scrollTop = gameOutput.scrollHeight; // Auto-scroll to bottom
}

function handleInput(event) {
    if (event.key === 'Enter') {
        const command = userInput.value.trim();
        printToOutput(`> ${command}`);
        userInput.value = ''; // Clear input
        
        processCommand(command);
    }
}

function processCommand(command) {
    switch (gamePhase) {
        case 'intro':
            player.name = command;
            gamePhase = 'playing';
            printToOutput(`Welcome, Captain ${player.name}, to the Sci-Fi RPG!`);
            printToOutput("You awaken from cryo-sleep. Your mission: explore the uncharted galaxy.");
            displayLocation();
            playMusic();
            printToOutput("Type 'help' for available commands.");
            break;
        case 'playing':
            if (battleActive) {
                handleBattleCommand(command);
                return;
            }

            const currentLocation = locations[player.currentLocation];

            // Check for movement commands first
            const direction = command.toLowerCase();
            if (currentLocation.exits[direction]) {
                player.currentLocation = currentLocation.exits[direction];
                displayLocation();
                // After moving, check for a random encounter
                if (checkRandomEncounter()) {
                    return; // If an encounter starts, don't process further commands
                }
                return;
            }

            switch (command.toLowerCase()) {
                case 'look':
                    displayLocation();
                    printToOutput(`Your current health: ${player.health}/${player.maxHealth}`);
                    break;
                case 'help':
                    printToOutput("Available commands: look, help, inventory, fight [enemy_type], [directions like n, s, e, w, ne, nw, se, sw], music on/off, save, load.");
                    break;
                case 'music on':
                    playMusic();
                    printToOutput("Background music turned on.");
                    break;
                case 'music off':
                    pauseMusic();
                    printToOutput("Background music turned off.");
                    break;
                case 'save':
                    saveGame();
                    break;
                case 'load':
                    loadGame();
                    break;
                case 'fight scout_drone':
                    startBattle(enemies.scout_drone);
                    break;
                case 'fight combat_bot':
                    startBattle(enemies.combat_bot);
                    break;
                case 'inventory':
                    printToOutput("\n--- INVENTORY ---");
                    let inventoryEmpty = true;
                    for (const item in player.inventory) {
                        if (player.inventory[item] > 0) {
                            printToOutput(`${item.replace('_', ' ')}: ${player.inventory[item]}`);
                            inventoryEmpty = false;
                        }
                    }
                    if (inventoryEmpty) {
                        printToOutput("Your inventory is empty.");
                    }
                    printToOutput("-----------------");
                    break;
                default:
                    printToOutput(`Unknown command: '${command}'. Type 'help' for a list of commands.`);
                    break;
            }
            break;
        case 'battle': // Should be handled by battleActive flag, but good to have a phase
            handleBattleCommand(command);
            break;
    }
}

function displayLocation() {
    const currentLocation = locations[player.currentLocation];
    printToOutput(`\n--- ${currentLocation.name.toUpperCase()} ---`);
    printToOutput(currentLocation.description);
}

function startBattle(enemy) {
    battleActive = true;
    currentEnemy = { ...enemy }; // Create a copy so we don't modify the template
    printToOutput(`\n--- BATTLE STARTED ---`);
    printToOutput(`A ${currentEnemy.name} appears! ${currentEnemy.description}`);
    printToOutput(`Your health: ${player.health}/${player.maxHealth}`);
    printToOutput(`${currentEnemy.name} health: ${currentEnemy.health}/${currentEnemy.maxHealth}`);
    printToOutput(`What will you do? (attack, run)`);
}

function handleBattleCommand(command) {
    switch (command.toLowerCase()) {
        case 'attack':
            playSoundEffect(); // Play sound effect on attack
            // Player attacks enemy
            let playerDamage = Math.max(0, player.attack - currentEnemy.defense);
            currentEnemy.health -= playerDamage;
            printToOutput(`You attack the ${currentEnemy.name} for ${playerDamage} damage!`);

            if (currentEnemy.health <= 0) {
                printToOutput(`${currentEnemy.name} defeated!`);
                endBattle(true);
                return;
            }

            // Enemy attacks player
            let enemyDamage = Math.max(0, currentEnemy.attack - player.defense);
            player.health -= enemyDamage;
            printToOutput(`${currentEnemy.name} attacks you for ${enemyDamage} damage!`);

            if (player.health <= 0) {
                printToOutput(`You have been defeated by the ${currentEnemy.name}... Game Over.`);
                endBattle(false);
                return;
            }

            printToOutput(`Your health: ${player.health}/${player.maxHealth}`);
            printToOutput(`${currentEnemy.name} health: ${currentEnemy.health}/${currentEnemy.maxHealth}`);
            printToOutput(`What will you do? (attack, run)`);
            break;
        case 'run':
            printToOutput("You attempt to flee...");
            // Simple 50% chance to run away
            if (Math.random() > 0.5) {
                printToOutput("You successfully escaped!");
                endBattle(true);
            } else {
                printToOutput("You failed to escape!");
                // Enemy gets a free hit
                let enemyDamage = Math.max(0, currentEnemy.attack - player.defense);
                player.health -= enemyDamage;
                printToOutput(`${currentEnemy.name} attacks you for ${enemyDamage} damage as you try to flee!`);
                if (player.health <= 0) {
                    printToOutput(`You have been defeated by the ${currentEnemy.name}... Game Over.`);
                    endBattle(false);
                }
            }
            break;
        default:
            printToOutput(`Invalid battle command: '${command}'. You can 'attack' or 'run'.`);
            break;
    }
}

function endBattle(playerWon) {
    battleActive = false;
    currentEnemy = null;
    printToOutput(`--- BATTLE ENDED ---`);
    if (playerWon) {
        printToOutput("You are victorious!");
        // Implement random material drop
        const materials = Object.keys(player.inventory);
        const randomMaterial = materials[Math.floor(Math.random() * materials.length)];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1 to 3 units
        player.inventory[randomMaterial] += quantity;
        printToOutput(`You looted ${quantity} ${randomMaterial.replace('_', ' ')}!`);
    } else {
        printToOutput("You were defeated.");
    }
    printToOutput("You can now issue regular commands again. Type 'help' for options.");
    // Reset player health for now, or implement proper game over/respawn
    if (!playerWon) {
        player.health = player.maxHealth; // For testing, reset health on defeat
        printToOutput("Your health has been restored for another attempt.");
    }
}

// Save Game Function
async function saveGame() {
    try {
        const response = await fetch('/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(player) // Sending player object for now
        });
        const message = await response.text();
        printToOutput(message);
    } catch (error) {
        console.error('Error saving game:', error);
        printToOutput('Failed to save game.');
    }
}

// Load Game Function
async function loadGame() {
    try {
        const response = await fetch('/load');
        if (response.ok) {
            const loadedPlayer = await response.json();
            player = { ...player, ...loadedPlayer }; // Merge loaded data into current player
            printToOutput('Game loaded successfully!');
            displayLocation(); // Refresh location display after loading
            printToOutput(`Your health: ${player.health}/${player.maxHealth}`);
        } else if (response.status === 404) {
            printToOutput('No saved game found to load.');
        } else {
            const errorText = await response.text();
            throw new Error(errorText);
        }
    } catch (error) {
        console.error('Error loading game:', error);
        printToOutput('Failed to load game.');
    }
}

// Initial game setup
printToOutput("Welcome, Captain, to the Sci-Fi RPG!");
printToOutput("Please enter your name to begin your adventure:");
playMusic(); // Start background music

userInput.addEventListener('keydown', handleInput);