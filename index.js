const algoliasearch = require('algoliasearch');
const {getFirestore} = require('firebase-admin/firestore');
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
const client = algoliasearch('P4GH5MJ3RF', '522e655b88c66ee65a01c10a749649eb', {});
const moviesIndex = client.initIndex('movies');
const actorsIndex = client.initIndex('actors');


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();
db.settings({ignoreUndefinedProperties: true})

const app = express();
const config = {
    headers: {'Access-Control-Allow-Origin': '*'}
};
app.use(cors({
    origin: 'moviebrowser.braydenjohnson.dev'
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/data/movie/top/:num', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
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
    res.set('Access-Control-Allow-Origin', '*');
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
    res.set('Access-Control-Allow-Origin', '*');
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
            moviesIndex.partialUpdateObject(movie).then((content) => {
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
    res.set('Access-Control-Allow-Origin', '*');
    const movieRef = db.collection('movies')
    if (!req.body.name || !req.body.rating || !req.body.descriptiontext || !req.body.year || !req.body.genre || !req.body.imageurl) {
        res.send(`Please send all required fields. Missing: ${!req.body.name ? 'name' : ''} ${!req.body.rating ? 'rating' : ''} ${!req.body.descriptiontext ? 'descriptiontext' : ''} ${!req.body.year ? 'year' : ''} ${!req.body.genre ? 'genre' : ''} ${!req.body.imageurl ? 'imageurl' : ''}`);
        return;
    }
    let movie = {
        moviename: req.body.name,
        rating: req.body.rating,
        description: req.body.descriptiontext,
        imageurl: req.body.imageurl,
        year: req.body.year,
        genre: req.body.genre,
        director: req.body.director,
        actors: req.body.actors
    };
    movieRef.add(movie).then((docRef) => {
        movie.objectID = docRef.id;
        moviesIndex.saveObject(movie).then((content) => {
            console.log(content)
        }).catch((error) => {
            console.log(error)
        });
        movie.id = docRef.objectID;
        res.send(movie);
    })
})
app.delete('/data/movie/:id', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    const objectID = req.params.id;
    const movieRef = db.collection('movies').doc(objectID);
    movieRef.get().then((doc) => {
        if (doc.exists) {
            const movie = doc.data();
            movie.objectID = doc.id;
            movieRef.delete();
            console.log(movie);
            moviesIndex.deleteObject(movie.objectID).then((content) => {
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
    res.set('Access-Control-Allow-Origin', '*');
    if (!req.body.searchterm) {
        res.end("Please send a searchterm in the body of the request.");
        return;
    }
    const searchterm = req.body.searchterm;
    res.end(`Searchterm: ${searchterm}`);
})

app.get('/movies/actors/:actor', (req, res) => {
    const id = req.params.actor;
    const movieRef = db.collection('movies');
    let query = movieRef.where('actors', 'array-contains', id);
    query.get().then((snapshot) => {
        const movies = [];
        snapshot.forEach((doc) => {
            const movie = doc.data();
            movie.objectID = doc.id;
            movies.push(movie);
        });
        res.send(movies);
    })
})
app.get('/actors/find/', (req, res) => {
    const name = req.body.actor;
    const actorRef = db.collection('actors');
    let query = actorRef.where('actor_info.name', '==', name);
    query.get().then((snapshot) => {
        const actors = [];
        snapshot.forEach((doc) => {
            const actor = doc.data();
            actor.objectID = doc.id;
            actors.push(actor);
        });
        res.send(actors);
    })
})

app.get('/actors/:id', (req, res) => {
  const objectID = req.params.id;
    const actorRef = db.collection('actors').doc(objectID);
    actorRef.get().then((doc) => {
        if (doc.exists) {
            const actor = doc.data();
            actor.objectID = doc.id;
            res.send(actor);
        } else {
            res.send('No such document!');
        }
    }).catch((error) => {
        res.send(`Error getting document: ${error}`);
    })
})

app.post('/actors/new', (req, res) => {
  const actorRef = db.collection('actors');
  if (req.body.name || req.body.imageurl) {
      let actor = {
            actor_info: {
                name: req.body.name,
                imageurl: req.body.imageurl
            },
            movies: req.body.movies
      }
      actorRef.add(actor).then((docRef) => {
          actor.objectID = docRef.id;
          res.send(actor);
          actorsIndex.saveObject(actor).then((content) => {
                console.log(content)
          }).catch((error) => {
                console.log(error)
          });
      })

  } else {
      res.send(`Please send all required fields. Missing: ${!req.body.name ? 'name' : ''} ${!req.body.imageurl ? 'imageurl' : ''}`);
  }
})

app.put('/actors/:id', (req, res) => {
  const actorsRef = db.collection('actors');
    const objectID = req.params.id;
    const actorRef = actorsRef.doc(objectID);
    actorRef.get().then((doc) => {
        if (doc.exists) {
            let actor = doc.data();
            actor.objectID = doc.id;
            if (req.body.name) {
                actor.actor_info.name = req.body.name;
            }
            if (req.body.imageurl) {
                actor.actor_info.imageurl = req.body.imageurl;
            }
            if (req.body.movies) {
                actor.movies = req.body.movies;
            }
            actorRef.set(actor).catch((error) => {
                console.log(error);
            });
            res.send(actor);
            actorsIndex.saveObject(actor).then((content) => {
                console.log(content)
            }).catch((error) => {
                console.log(error)
            });
        } else {
            res.send('No such document!');
        }
    }).catch((error) => {
        res.send(`Error getting document: ${error}`);
    })
})



app.listen(3000, () => {
    console.log('Server is listening on port 3000');
});

