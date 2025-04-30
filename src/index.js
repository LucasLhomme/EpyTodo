//index.js
const dotenv = require('dotenv');
dotenv.config();

//Importer l'application
const app = require('./app/app');

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});