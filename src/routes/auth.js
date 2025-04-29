const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../sql/sql'); // connexion à la BDD
require('dotenv').config(); // pour gérer le token secret

router.post('/register', async(req, res) => {

    const { email, password, firstname, name } = req.body;
    
    //si il manque l'un des cas donnée, return 400 dans le navigateur.
    if (!email || !password || !firstname || !name)
        return res.status(400).json({ msg: "Missing fields" });
    //chiffre le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    // Utiliser email comme username par défaut
    const username = email.split('@')[0];
    //les ? ? ? ? sont la pour évité des injections SQL
    //ajoute dans la DB le mail le password firstname et name et username
    db.query('INSERT INTO user (email, password, firstname, name, username) VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, firstname, name, username],
        (err, _result) => {
            if (err) return res.status(500).json({ msg: "DB Error", err });
            res.status(201).json({ msg: "User registered" });
        }
    );
});
module.exports = router;
