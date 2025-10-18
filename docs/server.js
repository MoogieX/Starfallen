const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, 'client')));
app.use(express.json()); // For parsing application/json

// API endpoint for saving game state
app.post('/save', (req, res) => {
    const playerData = req.body;
    fs.writeFile(path.join(__dirname, 'player_data.json'), JSON.stringify(playerData, null, 2), (err) => {
        if (err) {
            console.error('Error saving game data:', err);
            return res.status(500).send('Error saving game data.');
        }
        res.send('Game saved successfully!');
    });
});

// API endpoint for loading game state
app.get('/load', (req, res) => {
    fs.readFile(path.join(__dirname, 'player_data.json'), 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).send('No saved game found.');
            }
            console.error('Error loading game data:', err);
            return res.status(500).send('Error loading game data.');
        }
        res.json(JSON.parse(data));
    });
});

// All other requests go to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
