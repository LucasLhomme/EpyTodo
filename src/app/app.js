const express = require('express')
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
dotenv.config();

const db = require('../sql/sql.js');
const app = express()

app.use(bodyParser.json());

// Exemple de route GET
app.get('/api/users', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération des utilisateurs :', err);
        res.status(500).send('Erreur serveur');
        return;
      }
      res.json(results);
    });
  });

  //main page
app.get('/', (req, res) => {
  res.send('Hello World!')
})
// show username
app.get('/name/:userId', (req, res) => {
    const userId = req.params.userId;
    res.send(`<h1>User Profile</h1><p>User ID: ${userId}</p>`);
});
//show th date
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

app.listen(`${process.env.port}`, () => {
  console.log(`Example app listening on port ${process.env.port}`)
})
