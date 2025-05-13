// sql.js
const mysql = require('mysql2');
require('dotenv').config();
const PORT = process.env.PORT;


const connection = mysql.createConnection({
  host: `${process.env.MYSQL_HOST}`,
  user: `${process.env.MYSQL_USER}`,
  password: `${process.env.MYSQL_ROOT_PASSWORD}`,
  database: `${process.env.MYSQL_DATABASE}`
});

connection.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données :', err);
    return;
  }
  console.log(`Connecté à la base de données MySQL. (ports: ${process.env.PORT})`);
});

module.exports = connection;
