const express = require('express');
const router = express.Router();
const db = require('../../sql/sql');
const auth = require('../../middleware/auth');

// Route GET pour récupérer toutes les tâches de l'utilisateur connecté
// Le middleware auth garantit que seules les personnes authentifiées peuvent accéder à cette route
router.get('/', auth, (req, res) => {
    // Requête SQL qui sélectionne uniquement les tâches appartenant à l'utilisateur connecté
    db.query('SELECT * FROM todo WHERE user_id = ?', [req.auth.userId], (err, results) => {
        // Gestion des erreurs de base de données
        if (err)
            return res.status(500).json({ msg: "Internal server error" });
        // Renvoie les résultats au format JSON
        res.json(results);
    });
});

// Route GET pour récupérer une tâche spécifique par son ID
router.get('/:id', auth, (req, res) => {
    // Requête SQL qui vérifie que la tâche existe ET appartient bien à l'utilisateur connecté (sécurité)
    db.query('SELECT * FROM todo WHERE id = ? AND user_id = ?', 
        [req.params.id, req.auth.userId],
        (err, results) => {
            // Gestion des erreurs de base de données
            if (err)
                return res.status(500).json({ msg: "Internal server error" });
            // Si aucune tâche ne correspond, renvoi d'une erreur 404 (non trouvé)
            if (results.length === 0)
                return res.status(404).json({ msg: "Not found" });
            // Renvoie la première (et unique) tâche trouvée
            res.json(results[0]);
        }
    );
});

// Route POST pour créer une nouvelle tâche
router.post('/', auth, (req, res) => {
    // Extraction des données du corps de la requête (JSON)
    const { title, description, due_time, status } = req.body;
    // Vérification des champs obligatoires
    if (!title || !description || !due_time)
        return res.status(400).json({ msg: "Missing fields" });
    // Utiliser le status fourni ou la valeur par défaut
    const todoStatus = status || "not started";
    // Insertion avec les bons paramètres
    db.query('INSERT INTO todo (user_id, title, description, due_time, status) VALUES (?, ?, ?, ?, ?)',
        [req.auth.userId, title, description, due_time, todoStatus],
        (err, result) => {
            // Gestion des erreurs d'insertion
            if (err)
                return res.status(500).json({ msg: "Internal server error" });
            // Récupération de la tâche nouvellement créée pour la renvoyer au client
            db.query('SELECT * FROM todo WHERE id = ?', [result.insertId], (err, results) => {
                if (err)
                    return res.status(500).json({ msg: "Internal server error" });
                // Renvoie la tâche créée avec un statut 201 (Created)
                res.status(201).json(results[0]);
            });
        }
    );
});

// Route PUT pour mettre à jour une tâche existante
router.put('/:id', auth, (req, res) => {
    // Extraction des données modifiées du corps de la requête
    const { title, description, completed } = req.body;
    // Vérification que la tâche existe et appartient à l'utilisateur connecté
    db.query('SELECT * FROM todo WHERE id = ? AND user_id = ?', 
        [req.params.id, req.auth.userId],
        (err, results) => {
            if (err)
                return res.status(500).json({ msg: "Internal server error" });
            if (results.length === 0)
                return res.status(404).json({ msg: "Not found" });
            
            const updates = [];
            const values = [];
            if (title) {
                updates.push('title = ?');
                values.push(title);
            }
            if (description !== undefined) {
                updates.push('description = ?');
                values.push(description);
            }
            if (status) {
                updates.push('status = ?');
                values.push(status);
            }
            if (due_time) {
                updates.push('due_time = ?');
                values.push(due_time);
            }
            
            // Si aucun champ à mettre à jour n'a été fourni
            if (updates.length === 0)
                return res.status(400).json({ msg: "Nothing to update" });
            
            // Ajout de l'ID et user_id pour la clause WHERE
            values.push(req.params.id);
            values.push(req.auth.userId);
            
            // Exécution de la requête de mise à jour avec les champs variables
            db.query(`UPDATE todo SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
                values,
                (err, _result) => {
                    // Gestion des erreurs de mise à jour
                    if (err)
                        return res.status(500).json({ msg: "Internal server error" });
                    
                    // Récupération de la tâche mise à jour pour la renvoyer
                    db.query('SELECT * FROM todo WHERE id = ?', [req.params.id], (err, results) => {
                        if (err)
                            return res.status(500).json({ msg: "Internal server error" });
                        // Renvoie la tâche mise à jour
                        res.json(results[0]);
                    });
                }
            );
        }
    );
});

// Route DELETE pour supprimer une tâche
router.delete('/:id', auth, (req, res) => {
    // Vérification que la tâche existe et appartient à l'utilisateur connecté
    db.query('SELECT * FROM todo WHERE id = ? AND user_id = ?', 
        [req.params.id, req.auth.userId],
        (err, results) => {
            // Gestion des erreurs de base de données
            if (err)
                return res.status(500).json({ msg: "Internal server error" });
            // Si la tâche n'existe pas ou n'appartient pas à l'utilisateur
            if (results.length === 0)
                return res.status(404).json({ msg: "Not found" });
            
            // Suppression de la tâche après vérification
            db.query('DELETE FROM todo WHERE id = ? AND user_id = ?',
                [req.params.id, req.auth.userId],
                (err, _result) => {
                    // Gestion des erreurs de suppression
                    if (err)
                        return res.status(500).json({ msg: "Internal server error" });
                    // Confirmation de la suppression avec l'ID de la tâche supprimée
                    res.json({ msg: "Successfully deleted record number: " + req.params.id });
                }
            );
        }
    );
});

// Exportation du routeur pour qu'il puisse être utilisé dans app.js
module.exports = router;
