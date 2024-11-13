// server.js
const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from the 'public' directory
app.use(express.static('public'));

//Parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});