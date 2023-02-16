const algoliasearch = require('algoliasearch');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require("firebase-admin");
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const serviceAccount = {
    "type": process.env.TYPE,
    "project_id": process.env.PROJECT_ID,
    "private_key_id": process.env.PRIVATE_KEY_ID,
    "private_key": process.env.PRIVATE_KEY,
    "client_email": process.env.CLIENT_EMAIL,
    "client_id": process.env.CLIENT_ID,
    "auth_uri": process.env.AUTH_URI,
    "token_uri": process.env.TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.AUTH_PROVIDER_X509_CERT_URL,
    "client_x509_cert_url": process.env.CLIENT_X509_CERT_URL
}
const bodyParser = require("body-parser");
const client = algoliasearch('P4GH5MJ3RF', '522e655b88c66ee65a01c10a749649eb',{

});
const index = client.initIndex('movies');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true })

const app = express();
app.use(cors({
    origin: 'moviebrowser.braydenjohnson.dev'
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/data/movie/top/:num', (req, res) => {
    const num = parseInt(req.params.num, 10);
    const moviesRef = db.collection('movies');
    const query = moviesRef.orderBy('rating', 'desc').limit(num);
    query.get().then((snapshot) => {
        const movies = [];
        snapshot.forEach((doc) => {
            const movie = doc.data();
            movie.objectID = doc.id;
            movies.push(movie);
        });
        res.send(movies);
    });
});
app.get('/data/movie/:id', (req, res) => {
    const objectID = req.params.id;
    const movieRef = db.collection('movies').doc(objectID);
    movieRef.get().then((doc) => {
        if (doc.exists) {
            const movie = doc.data();
            movie.id = doc.objectID;
            res.send(movie);
        } else {
            res.send('No such document!');
        }
    }).catch((error) => {
        res.send(`Error getting document: ${error}`);
    });
});
app.put('/data/movie/:id', (req, res) => {
    // if put request is sent with body rating, name, descriptiontext, or imageurl update movie document with sent data.
    const objectID = req.params.id;
    const movieRef = db.collection('movies').doc(objectID);
    movieRef.get().then((doc) => {
        if (doc.exists) {
            const movie = doc.data();
            movie.objectID = doc.id;
            if (req.body.rating) {
                movie.rating = req.body.rating;
            }
            if (req.body.name) {
                movie.moviename = req.body.name;
            }
            if (req.body.descriptiontext) {
                movie.description = req.body.descriptiontext;
            }
            if (req.body.actors) {
                movie.actors = req.body.actors;
            }
            if (req.body.year) {
                movie.year = req.body.year;
            }
            if (req.body.genre) {
                movie.genre = req.body.genre;
            }
            if (req.body.director) {
                movie.director = req.body.director;
            }

            if (req.body.imageurl) {
                movie.imageurl = req.body.imageurl;
            }
            movieRef.set(movie);
            index.partialUpdateObject(movie).then((content) => {
                console.log(content)
            }).catch((error) => {
                console.log(error)
            });
            res.send(movie);
        } else {
            res.send('No such document!');
        }
    }).catch((error) => {
        res.send('Error getting document:', error);
    })
});

app.post('/data/movie/new', (req, res) => {
    const movieRef = db.collection('movies')
    if (!req.body.name || !req.body.rating || !req.body.descriptiontext || !req.body.year || !req.body.genre) {
        res.send(`Please send all required fields. Missing: ${!req.body.name ? 'name' : ''} ${!req.body.rating ? 'rating' : ''} ${!req.body.descriptiontext ? 'descriptiontext' : ''} ${!req.body.year ? 'year' : ''} ${!req.body.genre ? 'genre' : ''} `);
        return;
    }
    let movie = {
        moviename: req.body.name,
        rating: req.body.rating,
        description: req.body.descriptiontext,
        imageurl: req.body.imageurl ? req.body.imageurl : undefined,
        year: req.body.year,
        genre: req.body.genre,
        director: req.body.director ? req.body.director : undefined,
        actors: req.body.actors ? req.body.actors : undefined
    };
    movieRef.add(movie).then((docRef) => {
        movie.objectID = docRef.id;
        index.saveObject(movie).then((content) => {
                console.log(content)
            }).catch((error) => {
                console.log(error)
            });
        movie.id = docRef.objectID;
        res.send(movie);
    })
})
app.delete('/data/movie/:id', (req, res) => {
    const objectID = req.params.id;
    const movieRef = db.collection('movies').doc(objectID);
    movieRef.get().then((doc) => {
        if (doc.exists) {
            const movie = doc.data();
            movie.objectID = doc.id;
            movieRef.delete();
            console.log(movie);
            index.deleteObject(movie.objectID).then((content) => {
                console.log(content)
            }).catch((error) => {
                console.log(error)
            });
            res.send(`Deleted movie ${movie.moviename}!`);
        } else {
            res.send('No such document!');
        }
    }).catch((error) => {
        res.send(`Error getting document: ${error}`);
    })
})

app.get('/data/search/', (req, res) => {
    if(!req.body.searchterm) {
        res.end("Please send a searchterm in the body of the request.");
        return;
    }
  const searchterm = req.body.searchterm;
    res.end(`Searchterm: ${searchterm}`);
})

app.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
