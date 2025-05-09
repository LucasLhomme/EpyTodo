const express = require('express');
const router = express.Router();
const db = require('../../sql/sql');
const auth = require('../../middleware/auth');

// Route pour obtenir les infos de l'utilisateur connecté
router.get('/', auth, (req, res) => {
    db.query('SELECT * FROM user WHERE id = ?', [req.auth.userId], (err, results) => {
        if (err) return res.status(500).json({ msg: "Internal server error" });
        if (results.length === 0) return res.status(404).json({ msg: "Not found" });
        res.json(results[0]);
    });
});

// Route pour voir les tâches de l'utilisateur connecté
router.get('/todos', auth, (req, res) => {
    db.query('SELECT * FROM todo WHERE user_id = ?', [req.auth.userId], (err, results) => {
        if (err) return res.status(500).json({ msg: "Internal server error" });
        res.json(results);
    });
});

// Route pour obtenir les infos d'un utilisateur par ID ou email
router.get('/:id', auth, (req, res) => {
    // Déterminer si l'ID est un email ou un ID numérique
    const param = req.params.id;
    let query = 'SELECT * FROM user WHERE id = ?';
    
    if (param.includes('@')) {
        query = 'SELECT * FROM user WHERE email = ?';
    }
    
    db.query(query, [param], (err, results) => {
        if (err) return res.status(500).json({ msg: "Internal server error" });
        if (results.length === 0) return res.status(404).json({ msg: "Not found" });
        res.json(results[0]);
    });
});

module.exports = router;