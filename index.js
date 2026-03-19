require('dotenv').config();

const express = require('express');
const app = express();
const fileRoutes = require('./routes/fileroute');

app.use(express.json());
app.use('/users', fileRoutes);

app.get('/', (req, res) => res.send('Mini Cloud Storage API is Booming'));

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
