// Middleware pour gérer les routes non trouvées
module.exports = (_req, res) => {
    res.status(404).json({ msg: "Not found" });
};