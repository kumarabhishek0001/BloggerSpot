const log = console.log;

const chalk = require('chalk');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DB_KEY
});



const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
    console.log(process.env.DB_KEY)
    res.send('Live!!');
})

app.post('/signup', async(req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if(!username || !email || !password){
        return res.status(400).json({
            staus: "FAIL",
            message: "BAD REQUEST",
        })
    }

    const hashed_password = await bcrypt.hash(password, 10);
    

    const query = 'INSERT INTO users(username, email, password, hashed_password) VALUES ($1, $2, $3, $4) RETURNING id, username';
    // log(chalk.blue('query: ', query));

    const value = [username, email, password, hashed_password];
    // log(chalk.blue(value));

    try{
        const response = await pool.query(query, value);
        log(chalk.red('response: '));
        log(response.rows);

        res.json({
            staus: "SUCCESS",
            message: "USER CREATED SUCCESSFULLY",
            response: response.rows
        })

    }catch(err){
        log(chalk.red('ERROR: '));
        log(err);

        return res.status(409).json({
            staus: "FAILD",
            message: "USER ALREADY EXIST",
        })
    }
})

app.listen(PORT, () => {
    log(chalk.green(`server live on http://localhost:${PORT}`));
})