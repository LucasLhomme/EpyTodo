const jwt = require('jsonwebtoken');
 
module.exports = (req, res, next) => {
   try {
       const token = req.headers.authorization.split(' ')[1];
       const decodedToken = jwt.verify(token, process.env.SECRET);  // Utilisez la variable d'environnement
       const userId = decodedToken.id;  // Assurez-vous que cela correspond au format de vos tokens
       req.auth = {
           userId: userId
       };
       next();
       if (token != decodedToken)
        res.status(401).json({msg: " Token is not valid "})
   } catch(error) {
       res.status(401).json({ msg: "No token, authorization denied" });  // Message d'erreur plus générique
   }
};