// Importation des modules nécessaires
const express = require('express');  // Framework web pour créer l'API
const router = express.Router();     // Création d'un routeur Express pour organiser les routes
const db = require('../../sql/sql'); // Connexion à la base de données MySQL
const jwt = require('jsonwebtoken'); // Pour vérifier les tokens d'authentification
require('dotenv').config();          // Pour charger les variables d'environnement (.env)

// Middleware d'authentification - vérifie si l'utilisateur est connecté via son token JWT
// Ce middleware sera réutilisé sur toutes les routes qui nécessitent une authentification
const auth = (req, res, next) => {
    // Extraction du token JWT de l'en-tête Authorization (format: "Bearer <token>")
    const token = req.headers.authorization?.split(' ')[1];
    // Si aucun token n'est fourni, on renvoie une erreur 401 (non autorisé)
    if (!token) {
        return res.status(401).json({ msg: "No token, authorization denied" });
    }
    try {
        // Décodage et vérification du token avec la clé secrète stockée dans les variables d'environnement
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Stockage des informations de l'utilisateur dans l'objet request pour utilisation ultérieure
        req.user = decoded;
        // Passage au middleware/route suivant
        next();
    } catch (err) {
        // Si le token est invalide ou expiré, on renvoie une erreur 401
        res.status(401).json({ msg: "Token is not valid" });
    }
};

// Route GET pour récupérer toutes les tâches de l'utilisateur connecté
// Le middleware auth garantit que seules les personnes authentifiées peuvent accéder à cette route
router.get('/', auth, (req, res) => {
    // Requête SQL qui sélectionne uniquement les tâches appartenant à l'utilisateur connecté
    db.query('SELECT * FROM todo WHERE user_id = ?', [req.user.id], (err, results) => {
        // Gestion des erreurs de base de données
        if (err)
            return res.status(500).json({ msg: "DB Error" });
        // Renvoie les résultats au format JSON
        res.json(results);
    });
});

// Route GET pour récupérer une tâche spécifique par son ID
router.get('/:id', auth, (req, res) => {
    // Requête SQL qui vérifie que la tâche existe ET appartient bien à l'utilisateur connecté (sécurité)
    db.query('SELECT * FROM todo WHERE id = ? AND user_id = ?', 
        [req.params.id, req.user.id],
        (err, results) => {
            // Gestion des erreurs de base de données
            if (err)
                return res.status(500).json({ msg: "DB Error" });
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
    const { title, description, completed } = req.body;
    // Vérification que le titre est présent (champ obligatoire)
    if (!title)
        return res.status(400).json({ msg: "Missing fields" });
    // Conversion de la valeur completed en 0/1 pour la base de données
    const completedValue = completed ? 1 : 0;
    // Insertion de la nouvelle tâche dans la base de données
    db.query('INSERT INTO todo (user_id, title, description, completed) VALUES (?, ?, ?, ?)',
        [req.user.id, title, description || "", completedValue],
        (err, result) => {
            // Gestion des erreurs d'insertion
            if (err)
                return res.status(500).json({ msg: "DB Error" });
            // Récupération de la tâche nouvellement créée pour la renvoyer au client
            db.query('SELECT * FROM todo WHERE id = ?', [result.insertId], (err, results) => {
                if (err)
                    return res.status(500).json({ msg: "DB Error" });
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
        [req.params.id, req.user.id],
        (err, results) => {
            // Gestion des erreurs de base de données
            if (err)
                return res.status(500).json({ msg: "DB Error" });
            // Si la tâche n'existe pas ou n'appartient pas à l'utilisateur
            if (results.length === 0)
                return res.status(404).json({ msg: "Not found" });
            
            // Construction dynamique de la requête de mise à jour
            const updates = [];  // Parties du SET de la requête SQL
            const values = [];   // Valeurs correspondantes pour les paramètres (?)
            
            // Ajout conditionnel des champs à mettre à jour s'ils sont présents
            if (title) {
                updates.push('title = ?');
                values.push(title);
            }
            if (description !== undefined) {
                updates.push('description = ?');
                values.push(description);
            }
            if (completed !== undefined) {
                updates.push('completed = ?');
                values.push(completed ? 1 : 0);
            }
            
            // Si aucun champ à mettre à jour n'a été fourni
            if (updates.length === 0)
                return res.status(400).json({ msg: "Nothing to update" });
            
            // Ajout de l'ID et user_id pour la clause WHERE
            values.push(req.params.id);
            values.push(req.user.id);
            
            // Exécution de la requête de mise à jour avec les champs variables
            db.query(`UPDATE todo SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
                values,
                (err, _result) => {
                    // Gestion des erreurs de mise à jour
                    if (err)
                        return res.status(500).json({ msg: "DB Error" });
                    
                    // Récupération de la tâche mise à jour pour la renvoyer
                    db.query('SELECT * FROM todo WHERE id = ?', [req.params.id], (err, results) => {
                        if (err)
                            return res.status(500).json({ msg: "DB Error" });
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
        [req.params.id, req.user.id],
        (err, results) => {
            // Gestion des erreurs de base de données
            if (err)
                return res.status(500).json({ msg: "DB Error" });
            // Si la tâche n'existe pas ou n'appartient pas à l'utilisateur
            if (results.length === 0)
                return res.status(404).json({ msg: "Not found" });
            
            // Suppression de la tâche après vérification
            db.query('DELETE FROM todo WHERE id = ? AND user_id = ?',
                [req.params.id, req.user.id],
                (err, _result) => {
                    // Gestion des erreurs de suppression
                    if (err)
                        return res.status(500).json({ msg: "DB Error" });
                    // Confirmation de la suppression avec l'ID de la tâche supprimée
                    res.json({ msg: "Successfully deleted record number: " + req.params.id });
                }
            );
        }
    );
});

// Exportation du routeur pour qu'il puisse être utilisé dans app.js
module.exports = router;
