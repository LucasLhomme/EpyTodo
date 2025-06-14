const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const auth = require('../../middleware/auth');

// Ajout de la fonction pour formater les dates
const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// GET /user - Voir les informations de l'utilisateur connecté
router.get('/', auth, (req, res) => {
    db.query('SELECT id, email, password, created_at, firstname, name FROM user WHERE id = ?', 
    [req.auth.userId], (err, results) => {
        if (err) return res.status(500).json({ msg: "Internal server error" });
        if (results.length === 0) return res.status(404).json({ msg: "Not found" });
        
        const user = results[0];
        user.created_at = formatDate(user.created_at);
        res.json(user);
    });
});

// GET /user/todos - Voir toutes les tâches d'un utilisateur connecté
router.get('/todos', auth, (req, res) => {
    db.query(`
        SELECT 
            id, 
            title, 
            description, 
            created_at, 
            due_time, 
            status, 
            user_id 
        FROM todo 
        WHERE user_id = ?
    `, [req.auth.userId], (err, results) => {
        if (err) return res.status(500).json({ msg: "Internal server error" });
        results.forEach(todo => {
            todo.created_at = formatDate(todo.created_at);
            todo.due_time = formatDate(todo.due_time);
        });
        res.json(results);
    });
});

// GET /users/:id ou /users/:email - Voir les informations d'un utilisateur par ID ou email
router.get('/:id', auth, (req, res) => {
    const id = req.params.id;
    let query = 'SELECT id, email, password, created_at, firstname, name FROM user WHERE id = ?';
    
    // Vérifier si l'identifiant est un email
    if (id.includes('@')) {
        query = 'SELECT id, email, password, created_at, firstname, name FROM user WHERE email = ?';
    }
    
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ msg: "Internal server error" });
        if (results.length === 0) return res.status(404).json({ msg: "Not found" });
        const user = results[0];
        user.created_at = formatDate(user.created_at);
        res.json(user);
    });
});

// PUT /users/:id - Mettre à jour les informations d'un utilisateur
router.put('/:id', auth, async (req, res) => {
    const userId = req.params.id;
    const { email, password, name, firstname, username } = req.body;
    
    // Vérifier si l'utilisateur existe
    db.query('SELECT * FROM user WHERE id = ?', [userId], async (err, results) => {
        if (err) return res.status(500).json({ msg: "Internal server error" });
        if (results.length === 0) return res.status(404).json({ msg: "Not found" });
        
        // Construire les champs à mettre à jour
        const updates = [];
        const values = [];
        
        // Validation de l'email avec regex
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ msg: "Bad parameter" });
            }
            updates.push('email = ?');
            values.push(email);
        }
        
        // Vérifier que le mot de passe n'est pas vide et a une longueur minimale
        if (password) {
            if (password.trim() === ' ') {
            return res.status(400).json({ msg: "Bad parameter" });
            }
            try {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push('password = ?');
            values.push(hashedPassword);
            } catch (error) {
            return res.status(500).json({ msg: "Internal server error" });
            }
        }
        // Vérifier que le nom n'est pas vide
        if (name) {
            if (name.trim() === '') {
                return res.status(400).json({ msg: "Bad parameter" });
            }
            updates.push('name = ?');
            values.push(name);
        }
        // Vérifier que le prénom n'est pas vide
        if (firstname) {
            if (firstname.trim() === '') {
                return res.status(400).json({ msg: "Bad parameter" });
            }
            updates.push('firstname = ?');
            values.push(firstname);
        }
        
        if (username) {
            // Vérifier que le nom d'utilisateur a une longueur minimale
            if (username.trim() === '' || username.length < 3) {
                return res.status(400).json({ msg: "Bad parameter" });
            }
            updates.push('username = ?');
            values.push(username);
        }
        
        // Vérifier s'il y a des champs à mettre à jour
        if (updates.length === 0) {
            return res.status(400).json({ msg: "Bad parameter" });
        }
        // Ajouter l'ID à la liste des valeurs
        values.push(userId);
        
        // Exécuter la requête de mise à jour
        db.query(`UPDATE user SET ${updates.join(', ')} WHERE id = ?`, values, (err, result) => {
            if (err) return res.status(500).json({ msg: "Internal server error" });
            
            // Récupérer les informations mises à jour
            db.query('SELECT id, email, password, created_at, name, firstname, username FROM user WHERE id = ?', [userId], (err, results) => {
                if (err) return res.status(500).json({ msg: "Internal server error" });
                const user = results[0];
                user.created_at = formatDate(user.created_at);
                res.json(user);
            });
        });
    });
});

// DELETE /users/:id - Supprimer un utilisateur
router.delete('/:id', auth, (req, res) => {
    const userId = req.params.id;
    
    // Vérifier si l'utilisateur existe
    db.query('SELECT * FROM user WHERE id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ msg: "Internal server error" });
        if (results.length === 0) return res.status(404).json({ msg: "Not found" });
        
        // Supprimer toutes les tâches de l'utilisateur d'abord
        db.query('DELETE FROM todo WHERE user_id = ?', [userId], (err) => {
            if (err) return res.status(500).json({ msg: "Internal server error" });
            
            // Puis supprimer l'utilisateur
            db.query('DELETE FROM user WHERE id = ?', [userId], (err, result) => {
                if (err) return res.status(500).json({ msg: "Internal server error" });
                res.json({ msg: `Successfully deleted record number: ${userId}` });
            });
        });
    });
});

module.exports = router;