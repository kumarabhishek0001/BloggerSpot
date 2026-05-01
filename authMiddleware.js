const jwt = require('jsonwebtoken');
const chalk = require('chalk');
const log = console.log;

function authMiddleware(req, res, next){

    const token = req.headers.token;

    if(!token){
        res.status(401).json({
            status: "FAILED",
            message: "TOKEN NOT FOUND"
        })
    }

    const verifyToken = jwt.verify(token, process.env.JWT_KEY);

    // log(chalk.red('jwt verification response'));
    // log(verifyToken);

    if(!verifyToken){
        res.status(401).json({
            status: "FAILED",
            message: "UNAUTHORIZED USER"
        })
    }

    const userId = verifyToken.userId;
    req.userId = userId;
    next();

}

module.exports = {authMiddleware}