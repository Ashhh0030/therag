// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Start the server
app.listen(PORT, () => {
    console.log(`TheraSense server running at http://localhost:${PORT}`);
});