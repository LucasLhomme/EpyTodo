// sql.js
const mysql = require('mysql2');
require('dotenv').config();


const connection = mysql.createConnection({
  host: `${process.env.SQL_HOST}`,
  user: `${process.env.SQL_USER}`,
  password: `${process.env.SQL_PWD}`,
  database: `${process.env.SQL_DB}`
});

connection.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données :', err);
    return;
  }
  console.log(`Connecté à la base de données MySQL. (ports: ${process.env.port})`);
});

module.exports = connection;
