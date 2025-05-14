const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
require('dotenv').config();

// Route d'inscription
router.post('/register', async (req, res) => {
    const { email, password, firstname, name } = req.body;
    
    // Vérifier si tous les champs requis sont présents
    if (!email || !password || !firstname || !name)
        return res.status(400).json({ msg: "Bad parameter" });
    // Vérifier que l'email est valide avec une regex simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
        return res.status(400).json({ msg: "Bad parameter" });
    try {
        // Vérifier si l'utilisateur existe déjà
        db.query('SELECT * FROM user WHERE email = ?', [email], async (err, results) => {
            if (err) {
                return res.status(500).json({ msg: "Internal server error" });
            }   
            if (results.length > 0) {
                return res.status(409).json({ msg: "Account already exists" });
            }
            // Créer un nom d'utilisateur à partir de l'email
            const username = email.split('@')[0];
            // Vérifier si le nom d'utilisateur existe déjà
            db.query('SELECT * FROM user WHERE username = ?', [username], async (err, usernameResults) => {
                if (err) {
                    return res.status(500).json({ msg: "Internal server error" });
                }
                if (usernameResults.length > 0) {
                    return res.status(409).json({ msg: "Bad parameter" });
                }
                try {
                    // Chiffrer le mot de passe
                    const hashedPassword = await bcrypt.hash(password, 10);
                    
                    // Insérer le nouvel utilisateur dans la base de données
                    db.query('INSERT INTO user (email, password, name, firstname, username) VALUES (?, ?, ?, ?, ?)',
                        [email, hashedPassword, name, firstname, username],
                        (err, result) => {
                            if (err) {
                                return res.status(500).json({ msg: "Internal server error" });
                            }
                            // Vérifier que SECRET est défini
                            if (!process.env.SECRET) {
                                return res.status(500).json({ msg: "Internal server error" });
                            }
                            try {
                                // Créer un token JWT pour le nouvel utilisateur
                                const token = jwt.sign({ userId: result.insertId }, process.env.SECRET, { expiresIn: '24h' });
                                
                                // Renvoyer directement le token sans requête supplémentaire
                                return res.status(200).json({ token });
                            } catch (jwtError) {
                                return res.status(500).json({ msg: "Internal server error" });
                            }
                        }
                    );
                } catch (bcryptError) {
                    return res.status(500).json({ msg: "Internal server error" });
                }
            });
        });
    } catch (error) {
        return res.status(500).json({ msg: "Internal server error" });
    }
});

// Route de connexion
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    // Vérifier si les informations d'identification sont fournies
    if (!email || !password)
        return res.status(400).json({ msg: "Bad parameter" });
    // Rechercher l'utilisateur dans la base de données
    db.query('SELECT * FROM user WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ msg: "Internal server error" });
        // Vérifier si l'utilisateur existe
        if (results.length === 0)
            return res.status(401).json({ msg: "Invalid credentials" });
        const user = results[0];
        // Vérifier le mot de passe
        try {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch)
                return res.status(401).json({ msg: "Invalid credentials" });
            // Créer un token JWT
            const token = jwt.sign({ userId: user.id }, process.env.SECRET, { expiresIn: '24h' });
            // Supprimer le mot de passe de l'objet utilisateur
            const { password: userPassword, ...userWithoutPassword } = user;
            // Renvoyer le token et les informations de l'utilisateur
            return res.json({
                token,
            });
        } catch (error) {
            return res.status(500).json({ msg: "Internal server error" });
        }
    });
});
module.exports = router;