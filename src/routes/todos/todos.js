const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const auth = require('../../middleware/auth');

// Route GET pour récupérer toutes les tâches de l'utilisateur connecté
router.get('/', auth, (req, res) => {
    db.query('SELECT * FROM todo WHERE user_id = ?', [req.auth.userId], (err, results) => {
        if (err)
            return res.status(500).json({ msg: "Internal server error" });
        if (results.length === 0)
            return res.json({ msg: "No todos found for this user", todos: [] });
        res.json(results);
    });
});

// Route GET pour récupérer une tâche spécifique par son ID
router.get('/:id', auth, (req, res) => {
    // Vérification que l'ID est un nombre
    if (isNaN(req.params.id))
        return res.status(400).json({ msg: "Bad parameter - ID must be a number" });
    db.query('SELECT * FROM todo WHERE id = ? AND user_id = ?', 
        [req.params.id, req.auth.userId],
        (err, results) => {
            if (err)
                return res.status(500).json({ msg: "Internal server error" });
            if (results.length === 0)
                return res.status(404).json({ msg: "Not found" });
            res.json(results[0]);
        }
    );
});

// Route POST pour créer une nouvelle tâche
router.post('/', auth, (req, res) => {
    const { title, description, due_time, status } = req.body;
    // Vérification détaillée des champs obligatoires
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!description) missingFields.push('description');
    if (!due_time) missingFields.push('due_time');
    
    if (missingFields.length > 0) {
        return res.status(400).json({ 
            msg: "Bad parameter" 
        });
    }
    // Validation du statut
    const todoStatus = status || "not started";
    const validStatuses = ['not started', 'todo', 'in progress', 'done'];
    if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ 
            msg: "Bad parameter", 
            details: `Invalid status '${status}', must be one of: ${validStatuses.join(', ')}` 
        });
    }
    // Validation du format de date
    let parsedDueTime;
    try {
        parsedDueTime = new Date(due_time).toISOString().slice(0, 19).replace('T', ' ');
        if (parsedDueTime === 'Invalid Date')
            throw new Error('Invalid date format');
    } catch (error) {
        return res.status(400).json({ 
            msg: "Invalid date format", 
            details: "due_time must be in a valid date format (YYYY-MM-DD HH:MM:SS)" 
        });
    }
    // Insertion avec les bons paramètres
    db.query('INSERT INTO todo (user_id, title, description, due_time, status) VALUES (?, ?, ?, ?, ?)',
        [req.auth.userId, title, description, parsedDueTime, todoStatus],
        (err, result) => {
            if (err)
                return res.status(500).json({ msg: "Internal server error", details: err.message });
            db.query('SELECT * FROM todo WHERE id = ?', [result.insertId], (err, results) => {
                if (err)
                    return res.status(500).json({ msg: "Internal server error", details: err.message });
                res.status(201).json(results[0]);
            });
        }
    );
});

// Route PUT pour mettre à jour une tâche existante
router.put('/:id', auth, (req, res) => {
    // Vérification que l'ID est un nombre
    if (isNaN(req.params.id)) {
        return res.status(400).json({ msg: "Bad parameter - ID must be a number" });
    }
    const { title, description, due_time, status } = req.body;
    // Vérification de la présence d'au moins un champ à mettre à jour
    if (!title && !description && !due_time && !status) {
        return res.status(400).json({ msg: "Nothing to update - At least one field must be provided" });
    }
    // Validation du statut si fourni
    if (status) {
        const validStatuses = ['not started', 'todo', 'in progress', 'done'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                msg: "Bad parameter", 
                details: `Invalid status '${status}', must be one of: ${validStatuses.join(', ')}` 
            });
        }
    }
    // Validation du format de date si fournie
    let parsedDueTime;
    if (due_time) {
        try {
            parsedDueTime = new Date(due_time).toISOString().slice(0, 19).replace('T', ' ');
            if (parsedDueTime === 'Invalid Date') {
                throw new Error('Invalid date format');
            }
        } catch (error) {
            return res.status(400).json({ 
                msg: "Invalid date format", 
                details: "due_time must be in a valid date format (YYYY-MM-DD HH:MM:SS)" 
            });
        }
    }
    db.query('SELECT * FROM todo WHERE id = ? AND user_id = ?', 
        [req.params.id, req.auth.userId],
        (err, results) => {
            if (err) {
                return res.status(500).json({ msg: "Internal server error", error: err.message });
            }
            if (results.length === 0)
                return res.status(404).json({ msg: "Not found" });
            
            const updates = [];
            const values = [];
            // Construction de la requête dynamique pour les champs fournis
            const fields = { 
                title, 
                description, 
                due_time: parsedDueTime || due_time, 
                status 
            };
            Object.entries(fields).forEach(([key, value]) => {
                if (value !== undefined) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            });

            if (updates.length === 0)
                return res.status(400).json({ msg: "Nothing to update" });
            values.push(req.params.id);
            values.push(req.auth.userId);
            db.query(`UPDATE todo SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
                values,
                (err, result) => {
                    if (err) {
                        return res.status(500).json({ msg: "Internal server error", details: err.message });
                    }
                    
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ msg: "Not found or no changes made" });
                    }
                    
                    db.query('SELECT * FROM todo WHERE id = ?', [req.params.id], (err, results) => {
                        if (err) {
                            return res.status(500).json({ msg: "Internal server error", details: err.message });
                        }
                        res.json(results[0]);
                    });
                }
            );
        }
    );
});

// Route DELETE pour supprimer une tâche
router.delete('/:id', auth, (req, res) => {
    // Vérification que l'ID est un nombre
    if (isNaN(req.params.id)) {
        return res.status(400).json({ msg: "Bad parameter - ID must be a number" });
    }
    db.query('SELECT * FROM todo WHERE id = ? AND user_id = ?', 
        [req.params.id, req.auth.userId],
        (err, results) => {
            if (err) {
                return res.status(500).json({ msg: "Internal server error", details: err.message });
            }
            if (results.length === 0)
                return res.status(404).json({ msg: "Not found" });
            db.query('DELETE FROM todo WHERE id = ? AND user_id = ?',
                [req.params.id, req.auth.userId],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({ msg: "Internal server error", details: err.message });
                    }
                    if (result.affectedRows === 0) {
                        return res.status(500).json({ msg: "Failed to delete the todo" });
                    }
                    // Format spécifique demandé par le sujet
                    res.json({ msg: `Successfully deleted record number : ${req.params.id}` });
                }
            );
        }
    );
});

module.exports = router;
