//========================= Importing modules =========================
const express = require('express'); 
const mysql = require('mysql');
const {connMySQL, configMySQL} = require('./mysql.js');

const path = require('path'); 
const upload = require('./upload'); // middleware "multer" and its settings in upload.js, used for uploading image + change paths
const fs = require('fs'); // To change the name of the uploaded file name

const axios = require('axios'); // middleware to be able to handle http(s) requests in node, used to save coodinates
const bcrypt = require('bcrypt'); // middleware to encrypt the password

//start an app
const router = express.Router();

//======================================================================

//======================================================================
//                               INDEX
//======================================================================

router.get("/", (req, res) => {
    // query to find latest 2 locations
    const recentQuery = `SELECT id_location, name, cate, verf, rsvn FROM locations ORDER BY id_location DESC LIMIT 2`;
    connMySQL.query(recentQuery, (err, result) => {
        if (err) throw err;
        res.render("index", {
            title: "Inicio",
            recent: result,
            msj: req.query.m // message after deleting account
        })
    })
})


//======================================================================
//                           LOCATION PAGES
//======================================================================

//----------------------- BUSINESS (local) -----------------------------

router.get("/local/:id", (req, res) => {
    const businessId = req.params.id; // getting the ID from route path
    const businessQuery = `SELECT * FROM locations WHERE id_location = '${businessId}'`;
    //search from "locations" table
    connMySQL.query(businessQuery, (err, resultBusi) => {
        if (err) throw err;

        // ------ user has added to favorite list or not -----
        if (req.session.userId) { // if user is logged in
            const userId = req.session.userId; // get user ID from session
            // query to find this loaction and user are in "favorites" table
            const favorite = `SELECT * FROM favorites WHERE id_location = '${businessId}' AND id_user = ${userId}`; 
            connMySQL.query(favorite, (err, resultFav) => {
                if (err) throw err;
                res.render("business", {
                    title: resultBusi[0].name,
                    lc: resultBusi,
                    fav: resultFav.length, // 0 => not added to favorites. 1 => added
                    loggedIn: true,
                    msj: req.query.m // message after suggesting a new place
                })
            })

        } else { // if user is not logged in
            res.render("business", {
                title: resultBusi[0].name,
                lc: resultBusi,
                fav: 0, // not added to favorites
                loggedIn: false
            })
        }
    })
})


//--------- BUSINESS (local) : add to favorite action route --------------

router.get("/local/:id/addFav", requireLogin, (req, res) =>{
    const userId = req.session.userId; // getting user ID from session
    const businessId = req.params.id; // getting business ID from route path
    // query to insert this loaction and user into "favorites" table if not already there
    const addFav = `INSERT INTO favorites (id_user, id_location) VALUES (${userId}, ${businessId})`;
    connMySQL.query(addFav, (err, result) => {
        if (err) throw err;
        res.redirect(`/local/${businessId}`); // go back (stay and reload) the same page
    })
})


//------- BUSINESS (local) : remove from favorite action route ----------

router.get("/local/:id/remFav", requireLogin, (req, res) =>{
    const userId = req.session.userId; // getting user ID from session
    const businessId = req.params.id; // getting business ID from route path
    // query to delete this loaction and user from "favorites" table if they are there
    const remFav = `DELETE FROM favorites WHERE id_user = ${userId} AND id_location = ${businessId}`;
    connMySQL.query(remFav, (err, result) => {
        if (err) throw err;
        res.redirect(`/local/${businessId}`); // go back (stay and reload) the same page
    })
})


//------------------------------ SEARCH ---------------------------------

router.get('/search', (req, res) => {
    const { txt, cate, verf, rsvn } = req.query; // user input
    let search = `SELECT * FROM locations WHERE 1=1` // 1=1 to make it easier to add conditions later.
    if(txt){ // name input
        search += ` AND name LIKE '%${txt}%'`;
    }
    if(cate && cate !== 'any'){ // for category
        search += ` AND cate = '${cate}'`;
    }
    if(verf){ // for verified checkbox
        search += ` AND verf = 1`;
    }
    if(rsvn){ // for non-reservation checkbox
        search += ` AND rsvn = 0`;
    }
    connMySQL.query(search, (err, result) => {
        if (err) throw err;

        // Check if user is logged in and retrieve favorites if logged in
        if (req.session.userId) { // if user is logged in
            const userId = req.session.userId; // get user ID from session

            let completedTasks = 0; // prepare the task counter
            const totalTasks = result.length; // prepare the total task number

            result.forEach(row => { // for each result
                // query to check if logged in user has any favorite places
                const favoriteQuery = `SELECT * FROM favorites WHERE id_location = '${row.id_location}' AND id_user = ${userId}`;
                connMySQL.query(favoriteQuery, (err, favResult) => {
                    if (err) {
                        console.error("Error fetching favorites:", err);
                        completedTasks++; // make sure the counter adds up even for error case
                        checkAllCompleted(completedTasks, totalTasks, result, res); // use function even when it's error
                        return; // end here
                    }
                    // if no error
                    row.isFavorite = favResult.length > 0; // Set isFavorite based on the query result
                    completedTasks++; // one task has been done
                    checkAllCompleted(completedTasks, totalTasks, result, res); // use function
                });
            });

            // Function to count it up for tasks
            function checkAllCompleted(counter, total, result, res) { // taking 4 arguments
                if (counter === total) { // when all tasks complete
                    res.render("search", { // show the results
                        title: "Buscador",
                        lc: result,
                        loggedIn: true
                    });
                }
            }

        } else { // When user is not logged in
            res.render("search", {
                title: "Buscador",
                lc: result,
                loggedIn: false
            });
        }
    });
});


//------------ SEARCH : add to favorite action route -----------------

router.get("/search/:id/addFav", requireLogin, (req, res) =>{
    const userId = req.session.userId; // get user ID from session
    const businessId = req.params.id; // getting business ID from route path
    // query to insert this loaction and user into "favorites" table if not already there
    const addFav = `INSERT INTO favorites (id_user, id_location) VALUES (${userId}, ${businessId})`;
    connMySQL.query(addFav, (err, result) => {
        if (err) throw err;
        res.redirect(`back`); // go back (stay and reload) the search page
    });
})

//---------- SEARCH : remove from favorite action route ---------------

router.get("/search/:id/remFav", requireLogin, (req, res) =>{
    const userId = req.session.userId; // get user ID from session
    const businessId = req.params.id; // getting business ID from route path
    // query to delete this loaction and user from "favorites" table if they are there
    const remFav = `DELETE FROM favorites WHERE id_user = ${userId} AND id_location = ${businessId}`;
    connMySQL.query(remFav, (err, result) => {
        if (err) throw err;
        res.redirect(`back`); // go back (stay and reload) the search page
    })
})


//======================================================================
//                      LOG IN / LOG OUT / SIGN UP
//======================================================================

//---------------------------- LOG IN ----------------------------------

router.get("/login", (req, res) => {
    res.render("login", {
        title: "Iniciar Sessión",
        msj: req.query.m // message after registration and error
    })
})


//-------------------- LOG IN : action route -------------------------

router.post("/account", (req, res) => {
    const {email, pass} = req.body; // getting info from the form
    // query if the email already exists
    const login = `SELECT * FROM users WHERE email = "${email}";`
    connMySQL.query(login, (err, result) => {
        if (err) throw err;
        // if email is not found 
        if (result.length === 0) {
            return res.redirect(`/login?m=error`); // return error, and stop
        } 

        const passMatch = bcrypt.compareSync(pass, result[0].pass); // encrypted password comparison using "bcrypt"
        // if passwords don't match
        if (!passMatch){
            return res.redirect(`/login?m=error`); // return error, and stop
        }
        
        // if the client is found and all good
        req.session.userId = result[0].id_user; // save id to session
        req.session.userName = result[0].name; // save name to session
        res.redirect(`/account`) // redirect to account page
    })
})


//--------------------- SIGN UP (registrar) ------------------------------

router.get("/signup", (req, res) => {
    res.render("signup", {
        title: "Registrar",
        msj: req.query.m // message for error
    })
})


//-------------------- SIGN UP : action route --------------------------

router.post("/registrar", (req, res) => {
    const {name, email, pass} = req.body; // getting info from the form
    //query if email already exists
    const selectEm = `SELECT id_user FROM users WHERE email = "${email}";`
    connMySQL.query(selectEm, (err, result) => {
        if(err) throw err;
        // if email is found
        if (result.length > 0){
            return res.redirect(`/signup?m=error`); // return error, and stop
        } 

        // if email does not exist
        const passCryp = bcrypt.hashSync(pass, 10); // encrypt the password with bcrypt
        // query to insert the new user into the "users" table
        const signup = `INSERT INTO users (name, email, pass) VALUES ("${name}", "${email}", "${passCryp}");`
        connMySQL.query(signup, (err, result) => {
            if (err) throw err;
            res.redirect(`/login?m=success`); // jump to log in page with a message
        })
    })
})


//---------------------- LOG OUT : action route  ---------------------------

router.get('/logout', requireLogin, (req, res) =>{
    req.session.destroy(error => { // destroy the session
        if (error) throw error;
        res.redirect('/'); // go back to index
    });
})


//-------------------- FUNCTION : REQUIRE LOGIN ---------------------------

function requireLogin(req, res, next) {
    if (!req.session.userId) { // if not logged in
        return res.redirect('/login'); // go back to log in page
    }
    next();
}


//======================================================================
//                             MY PAGE
//======================================================================

//---------------------------- ACCOUNT ---------------------------------

router.get("/account", requireLogin, (req, res) => {
    // query to find user info using the session ID
    const user = `SELECT * FROM users WHERE id_user = ${req.session.userId}`; 
    connMySQL.query(user, (err, resUser) => {
        if (err) throw err;
        // query to find the favorite locations of the current user
        const select = `SELECT lc.name FROM users us
        LEFT JOIN favorites fv ON us.id_user = fv.id_user
        INNER JOIN locations lc ON fv.id_location = lc.id_location
        WHERE us.id_user = ${req.session.userId}` 
        connMySQL.query(select, (err, resultFav) => {
            if (err) throw err;

            res.render("account", {
                title: resUser[0].name, // user name
                user: resUser[0],
                list: resultFav, // favorite list
                msj: req.query.m // message after updating information
            })
        })
    })
})


//-------------------------- FAVORITES -------------------------------

router.get("/favorites", requireLogin, (req, res) => {
    // query to find favorite locations of the current user
    const select = `SELECT lc.* FROM users us
                    LEFT JOIN favorites fv ON us.id_user = fv.id_user
                    INNER JOIN locations lc ON fv.id_location = lc.id_location
                    WHERE us.id_user = ${req.session.userId}` 
    connMySQL.query(select, (err, result) => {
        if (err) throw err;

        res.render("favorites", {
            title: "Favoritos",
            list: result,
            loggedIn: true
        })
    })
})


//------------------- UPDATE (Email/password) ------------------------

router.get("/update", requireLogin, (req, res) => {
    const {t} = req.query // getting the type (email or password) to update
    // query to find user info in "users" table using the session ID
    const select = `SELECT * FROM users WHERE id_user = ${req.session.userId}`;
    connMySQL.query(select, (err, result) => {
        if (err) throw err;

        res.render("update", {
            title: "Actualizar",
            user: result[0],
            type: req.query.t
        })
    })
})


//------------------- UPDATE : action route -------------------------

router.post("/updated", requireLogin, (req, res) => {
    const { email, pass, id_user } = req.body; // getting info from the form
    // checking if new email address already exists in "users" table
    const selectEm = `SELECT id_user FROM users WHERE email = "${email}";`
    connMySQL.query(selectEm, (err, result) => {
        if(err) throw err;
        
        // if email already exists, and belongs to someone else (IDs don't match)
        if (result.length > 0 && result[0].id_user !== parseInt(id_user)) {
            return res.redirect(`/update?t=${email}&m=error`); // send error message, and stop
        }

        // if everything goes ok
        const passCryp = bcrypt.hashSync(pass, 10); // encrypt the password with bcrypt
        // query to update the user info in "users" table with the new email and password
        const update = `UPDATE users SET email ='${email}', pass ='${passCryp}' WHERE id_user = ${id_user}`
        connMySQL.query(update, (err, result) => {
            if (err) throw err;
            return res.redirect(`/account?m=success`); // return account page with success message
        })
    })
})


//------------------- DELETE : action route -------------------------

router.get("/delete", requireLogin, (req, res) => {
    // query to delete the user from "users" table 
    const drop = `DELETE FROM users WHERE id_user = ${req.session.userId}`;
    connMySQL.query(drop, (err, result) => {
        if (err) throw err;
        // destroy the session
        req.session.destroy(error => {
            if (error) throw error;

            res.redirect(`/?m=goodbye`); // go back to index with goodbye message
        });
    })
})


//======================================================================
//                            SUGGESTION
//======================================================================

//--------------------------- SUGGESTION -------------------------------

router.get('/suggestion', requireLogin, (req, res) => {
    res.render('suggestion', {
        title: "Sugerencia",
        msj: req.query.m // for error message
    })
})


//--------------------- SUGGESTION : action route ---------------------


router.post('/suggest', requireLogin, upload.single('image'), (req, res) => {//upload.single('image') is from "multer"
    //try { // can't get coodinate without try/catch
        if (!req.file) { // if the file uploading fails for some reason
            return res.status(400).send('No file uploaded.'); // send error message
        }

        const { name, address, tel, url, descr, cate, rsvn } = req.body; // getting information from the form
        let rsvnBoolean = 0; // reservation yes(1) or no(0)
        if (rsvn === 'on') {rsvnBoolean = 1} // if reservation is needed, boolean = 1

        // changing the uploaded file name to the name of the registered location
        const oldPath = req.file.path; // getting the original file path
        const newPath = path.join(req.file.destination, name + path.extname(req.file.originalname)); // new path (upload.js)
        // use file system to manipulate
        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                return res.status(500).send('Error renaming file.');
            }

            // Get coordinates from address
            getCoordinates(address, (err, coordinates) => {
                if (err) {
                    console.error(err);
                    return res.redirect('/suggestion?m=error'); // stay in suggestion page with error message
                }
                // query to insert to the table
                const insertQuery = `INSERT INTO locations (name, descr, address, tel, url, coodi_long, coodi_lat, cate, rsvn)
                                     VALUES (${name}, ${descr}, ${address}, ${tel}, ${url}, ${coordinates.lon}, ${coordinates.lat}, ${cate}, ${rsvnBoolean})`;
                connMySQL.query(insertQuery, (err, result) => {
                    if (err) throw err;

                    // after inserting, getting the latest added location to redirect
                    const selectQuery = `SELECT id_location FROM locations ORDER BY id_location DESC LIMIT 1`;
                    connMySQL.query(selectQuery, (err, result) => {
                        if (err) throw err;
                        res.redirect(`/local/${result[0].id_location}?m=new`); // jump to the newly registered place with message.
                    });
                });
            });
        });
    //} catch (error) {
    //    res.status(500).send('Server error.');
    //}
});


//------------- FUNCTION : Get Coodinate from Address ---------------

function getCoordinates(address, callback) {
    const encodedAddress = encodeURIComponent(address); 
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`; // nominatim data
    // from here template of "axios" usage
    axios.get(url) // if successfully getting url
        .then(response => {   // template of "axios"
            const data = response.data; // getting data from response
            if (data.length > 0) { // if data has something in it
                const location = data[0]; // data[0] has coodinates so saving it
                callback(null, { lat: location.lat, lon: location.lon }); // null is for error, and saving lat and lon
            } else {
                callback('No coordinates found'); // handling the case of no data
            }
        })
        .catch(error => {
            callback(error);
        });
}


//======================================================================
//                        404 ERROR HANDLING
//======================================================================

router.use((req, res) => {
    res.status(404).render("error", {title: "Error"});
});


//======================================================================

//Export
module.exports = router;
