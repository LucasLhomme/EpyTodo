const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../sql/sql');
require('dotenv').config();

// Route d'inscription
router.post('/register', async (req, res) => {
    const { email, password, firstname, name } = req.body;
    
    // Vérifier si tous les champs requis sont présents
    if (!email || !password || !firstname || !name)
        return res.status(400).json({ msg: "Bad parameter" });
    
    try {
        // Vérifier si l'utilisateur existe déjà
        db.query('SELECT * FROM user WHERE email = ?', [email], async (err, results) => {
            if (err) return res.status(500).json({ msg: "Internal server error" });
            
            if (results.length > 0) {
                return res.status(400).json({ msg: "Account already exists" });
            }
            
            // Créer un nom d'utilisateur à partir de l'email
            const username = email.split('@')[0];
            
            // Chiffrer le mot de passe
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insérer le nouvel utilisateur dans la base de données
            db.query('INSERT INTO user (email, password, name, firstname, username) VALUES (?, ?, ?, ?, ?)',
                [email, hashedPassword, name, firstname, username],
                (err, result) => {
                    if (err) return res.status(500).json({ msg: "Internal server error" });
                    
                    // Créer un token JWT pour le nouvel utilisateur
                    const token = jwt.sign({ userId: result.insertId }, process.env.SECRET, { expiresIn: '24h' });
                    
                    // Récupérer les informations de l'utilisateur créé
                    db.query('SELECT id, email, firstname, name, username FROM user WHERE id = ?',
                        [result.insertId],
                        (err, userResults) => {
                            if (err) return res.status(500).json({ msg: "Internal server error" });
                            
                            // Renvoyer les informations de l'utilisateur avec le token
                            return res.status(201).json({
                                token,
                                ...userResults[0]
                            });
                        }
                    );
                }
            );
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
                ...userWithoutPassword
            });
        } catch (error) {
            console.error("Erreur serveur:", error);
            return res.status(500).json({ msg: "Internal server error" });
        }
    });
});
module.exports = router;