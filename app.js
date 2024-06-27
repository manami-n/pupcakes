// import modules
const express = require('express');
const path = require('path');
const mysql = require('mysql');

//mysql connection information in another file.
const {configMySQL, connMySQL} = require('./mysql.js');
// npm express-session and express-mysql-session for sessoions saving data.
const session = require('express-session');

//import MySQLStore from 'express-mysql-session';
const expressMySqlSession = require("express-mysql-session");
const MySQLStore  = expressMySqlSession(session);




///////////////////////////////
// Server setup 
///////////////////////////////

// creating app
const app = express();
// setup engine
app.set('view engine', 'ejs');

// ======== Session management ==========
const sessionStore = new MySQLStore(configMySQL);

// setting the session using express-session
app.use(session({
    key: process.env.KEY,
    secret: process.env.SECKEY,// Secret key is inside .env
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // HTTP --> false, HTTPS --> true
        maxAge: 1000 * 60 * 60 * 24 * 2, // save for 2 days
    } 
}));

// MySQLStore checking
sessionStore.onReady().then(() => {
    console.log('MySQLStore ready');
}).catch(error => {
    console.error(error);
});


// ----- Session Nav -----
app.use((req, res, next) => { // next is important
    // Check if the userId exists in the session
    // If it does, it means the user is logged in
    if (req.session.userId) {
        res.locals.loggedIn = true;  // Set isLoggedIn to true
    } else {
        res.locals.loggedIn = false; // Set isLoggedIn to false
    }
    next();
});


// ======================================

// setting the port
const PORT = process.env.PORT || 3000; // port

// Static set up
app.use(express.static('static'));

// json enabled, before importing router.js
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// importing router.js
const router = require('./router.js');
app.use(router);


// Ensure this is the last middleware used
app.use((req, res, next) => {
    res.status(404).render("error");
});

// connect to server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
})