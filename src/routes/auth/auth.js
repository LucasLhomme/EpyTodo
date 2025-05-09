const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../sql/sql'); // connexion à la BDD
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
            if (err) return res.status(500).json({ "msg": "Account already exists"});
            res.status(201).json({ msg: "User registered" });
        }
    );
    //console.log(`user coonnected ${username}`)
});

//rule for the login. output the token.
router.post('/login', (req, res) => {
    const {email, password} = req.body
    db.query('SELECT * FROM user WHERE email = ?', [email], async (err, results) => {
        //si l'email n'existe pas return 500
        if (err) return res.status(500).json({ msg: "DB Error" });
        if (results.length === 0) return res.status(401).json({ msg: "Invalid credentials" });
    const user = results[0];
    //crypte le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: "Invalid credentials" });
    const token = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: '1h' });
    res.json({ token });
    //console.log(token);
    });
});
module.exports = router;
