const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
   try {
       const token = req.headers.authorization?.split(' ')[1];
       
       if (!token) {
           return res.status(401).json({ msg: "No token, authorization denied" });
       }
       
       const decodedToken = jwt.verify(token, process.env.SECRET);
       req.auth = { userId: decodedToken.id };
       next();
   } catch(error) {
       res.status(401).json({ msg: "Token is not valid" });
   }
};