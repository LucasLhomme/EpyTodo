//app.js
const express = require('express')
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
dotenv.config();
const authRoutes = require('../routes/auth/auth.js');
const todosRoutes = require('../routes/todos/todos.js');
const db = require('../sql/sql.js');
const app = express()
const userRoutes = require('../routes/user/user.js');
app.use(express.json());
app.use(bodyParser.json());

// Ces deux lignes sont suffisantes pour gérer toutes vos routes utilisateurs
app.use('/user', userRoutes);
app.use('/users', userRoutes);

app.use('/', authRoutes);
app.use('/todos', todosRoutes);

//html page to debug from the bootstrap
//------------------------------------------------------------------------------------------------------------------------
  // show username
  app.get('/name/:userId', (req, res) => {
      const userId = req.params.userId;
      res.send(`<h1>User Profile</h1><p>User ID: ${userId}</p>`);
  });

  //show the date
  app.get("/date", function (req, res) {
      const date = new Date()
      const year = date.getFullYear()
      const day = date.getUTCDate()
      const month = date.getUTCMonth() + 1
      const hours = date.getHours()
      const minutes = date.getMinutes()
      console.log(`day: ${day}\nmonth: ${month}\nyear: ${year}\nhours: ${hours}\nminutes: ${minutes}`);
      
      res.format({
          'text/html': () => {
              res.send(`<h1>Date</h1> <p>${day}-${month}-${year} ${hours}:${minutes}</p>`)
          },
          'application/json': () => {
              res.json({ day, month, year, hours, minutes })
          },
          'text/plain': () => {
              res.send(`Date: ${day}-${month}-${year} ${hours}:${minutes}`)
          },
          default: () => {
              // default to html
              res.send(`<h1>Date</h1> <p>${day}-${month}-${year} ${hours}:${minutes}</p>`)
          }
      })
  });
//--------------------------------------------------------------------------------------------------

// Supprimez ou commentez la route app.get('/users', ...) définie plus bas
/*
  app.get('/users', (req, res) => {
    db.query('SELECT * FROM user', (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération des utilisateurs :', err);
        res.status(500).send('Erreur serveur');
        return;
      }
      res.json(results);
    });
  });
*/

  module.exports = app;

