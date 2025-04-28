const express = require('express')
const dotenv = require('dotenv');
dotenv.config();
const app = express()

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/name/:userId', (req, res) => {
    const userId = req.params.userId;
    res.send(`<h1>User Profile</h1><p>User ID: ${userId}</p>`);
});

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
  console.log(`Example app listening on port ${process.env. port}`)
})
