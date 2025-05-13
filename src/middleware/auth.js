const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
    try {
        // Récupérer le token du header Authorization
        const token = req.headers['x-auth-token'] || req.headers.authorization?.split(' ')[1];
        // Vérifier si le token existe
        if (!token) {
            return res.status(401).json({ msg: "No token, authorization denied" });
        }
        // Vérifier la validité du token
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            req.auth = { userId: decoded.userId };
            next(); // Passer au middleware suivant
        } catch (error) {
            return res.status(401).json({ msg: "Token is not valid" });
        }
    } catch (error) {
        return res.status(500).json({ msg: "Internal server error" });
    }
};