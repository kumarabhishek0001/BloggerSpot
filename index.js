const log = console.log;
const { authMiddleware } = require('./authMiddleware');

const chalk = require('chalk');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')

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

// AUTHENTICATION 
app.post('/signup', async (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (!username || !email || !password) {
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

    try {
        const response = await pool.query(query, value);
        log(chalk.red('response: '));
        log(response.rows);

        res.json({
            staus: "SUCCESS",
            message: "USER CREATED SUCCESSFULLY",
            response: response.rows
        })

    } catch (err) {
        log(chalk.red('ERROR: '));
        log(err);

        return res.status(409).json({
            staus: "FAILD",
            message: "USER ALREADY EXIST",
        })
    }
})

app.post('/signin', async (req, res) => {

    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (!username || !email || !password) {
        return res.status(400).json({
            staus: "FAIL",
            message: "BAD REQUEST",
        })
    }

    const query = 'SELECT * FROM users WHERE username = $1';
    const response = await pool.query(query, [username]);

    // log(chalk.red('response: '))
    // log(response);

    const userExist = response.rows[0];

    if (!userExist) {
        return res.status(404).json({
            status: "FAIL",
            message: "INCORRECT CREDENTIALS. USER NOT FOUND"
        })
    }

    const checkPassword = await bcrypt.compare(password, userExist.hashed_password);
    // log(chalk.red('Password Verification: '));
    // log(checkPassword);

    if (!checkPassword) {
        return res.status(401).json({
            status: "FAIL",
            message: "INCORRECT CREDENTIALS."
        })
    }

    const userId = userExist.id;

    const token = jwt.sign({
        userId
    }, process.env.JWT_KEY)

    res.json({
        status: "SUCCESS",
        message: "LOGGED IN SUCCESSFULLY",
        token
    })

})

// ADMIN CONTROLLS
app.post('/getalluser', authMiddleware, async (req, res) => {
    const userId = req.userId;
    if (userId === 1) {
        const query = 'SELECT username, email, created_at FROM users';
        const response = await pool.query(query);

        const data = response.rows;

        res.json({
            status: "SUCCESS",
            message: "DATA FETCHED",
            data
        })
    }
})

// CREATE ENDPOINT
app.post('/api/createBlog', authMiddleware, async (req, res) => {

    function createSlug(title) {
        const slug = title.toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');
        return slug;
    }

    try {
        const userId = req.userId;
        const authorId = userId;
        const { title, content } = req.body;

        const query = 'INSERT INTO blogs(title, slug, content, author_id) VALUES($1, $2, $3, $4) RETURNING *';
        log(chalk.red(query));
        log(query);

        let slug = createSlug(title)

        const values = [title, slug, content, authorId];
        log(chalk.red(values));
        log(values);

        try {
            const response = await pool.query(query, values);
            const data = response.rows;

            res.json({
                status: "SUCCESS",
                message: "BLOG CREATED SUCCESSFULLY",
                data
            })
        }catch(err){
            if(err.code === "23505"){
                slug = slug + '-' + Date.now()

                const retry = await pool.query(query, [title, slug, content, authorId]);

                return res.json({
                    status: "SUCCESS",
                    message: "BLOG CREATED (with modified slug)",
                    data: retry.rows[0]
                });
            }

            throw err
        }

    }catch(error){
        res.status(500).json({
            status: "ERROR",
            message: error.message
        })
    }

})

// GET ENDPOINT
app.get('/api/getAllBlogs', authMiddleware, async(req, res) => {
    try{
        const userId = req.userId;

        const query = 'SELECT id, title, slug, content FROM blogs';
        const response = await pool.query(query);
        data = response.rows;

        res.json({
            status: "SUCCESS",
            message: "ALL BLOGS FETCHED",
            data 
        })
    }
    catch(error){
        res.status(500).json({
            staus:"ERROR",
            message: error.message
        })
    }
})

app.get('/api/getBlog/:slug', authMiddleware, async(req, res) => {
    try{
        const userId = req.userId;
        const getSlug = req.params.slug;

        const query = 'SELECT id, title, slug, content FROM blogs WHERE slug = $1';
        const response = await pool.query(query, [getSlug]);
        data = response.rows;

        res.json({
            status: "SUCCESS",
            message: "BLOG FETCHED",
            data 
        })
    }
    catch(error){
        res.status(500).json({
            staus:"ERROR",
            message: error.message
        })
    }
})



app.listen(PORT, () => {
    log(chalk.green(`server live on http://localhost:${PORT}`));
})