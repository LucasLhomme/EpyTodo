const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const auth = require('../../middleware/auth');

// Correction pour donner la bonne date
const formatDate = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null; // Vérifie si la date est valide
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Route GET pour récupérer toutes les tâches
router.get('/', auth, (req, res) => {
    db.query('SELECT * FROM todo', (err, results) => {
        if (err)
            return res.status(500).json({ msg: "Internal server error" });
        if (results.length === 0)
            return res.json({ msg: "No todos found", todos: [] });
        results.forEach(todo => {
            todo.created_at = formatDate(todo.created_at);
            todo.due_time = formatDate(todo.due_time);
        });
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
            const todo = results[0];
            todo.created_at = formatDate(todo.created_at);
            todo.due_time = formatDate(todo.due_time);
            res.json(todo);
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
        const formattedDate = formatDate(due_time);
        if (!formattedDate) throw new Error('Invalid date format');
        parsedDueTime = formattedDate;
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
                const todo = results[0];
                todo.created_at = formatDate(todo.created_at);
                todo.due_time = formatDate(todo.due_time);
                res.status(201).json(todo);
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
        return res.status(400);
    }
    // Validation du statut si fourni
    if (status) {
        const validStatuses = ['not started', 'todo', 'in progress', 'done'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({msg: "Bad parameter"});
        }
    }
    // Validation du format de date si fournie
    let parsedDueTime;
    if (due_time) {
        try {
            parsedDueTime = formatDate(due_time);
            if (!parsedDueTime) {
                throw new Error('Invalid date format');
            }
        } catch (error) {
            return res.status(400).json({ 
                msg: "Invalid date format", 
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
                        const todo = results[0];
                        todo.created_at = formatDate(todo.created_at);
                        todo.due_time = formatDate(todo.due_time);
                        res.json(todo);
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
