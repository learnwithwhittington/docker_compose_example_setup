const express = require('express');
const redis = require('redis');
const mongo = require('mongodb');

const PORT = 3000;

const app = express();

// Mongo crap -> Config IIFE
const mongo_client = new mongo.MongoClient('mongodb://mongo-server:27017');
let mongo_connection, mongo_db;
(async () => {
    mongo_connection = await mongo_client.connect();
    mongo_db = mongo_connection.db('docker_demo');

    // Check if collection exists, deletes if it does
    const collections = (await mongo_db.listCollections().toArray()).map(c => c.name);
    if(collections.includes('visits')) {
        let collection = mongo_db.collection('visits');
        await collection.drop();
    }

    await mongo_db.createCollection('visits');
    console.log('mongo db initialized');
})();

// Redis crap -> Config IIFE
let redis_client;
(async () => {
    redis_client = redis.createClient({ url: 'redis://redis-server:6379'});
    redis_client.on('error', (error) => {
        console.error(`Error: ${error}`);
    });
    await redis_client.connect();
    // Initialize the redis cache value to zero on application restart
    redis_client.set('visit_count', 0);
})();

app.get('/', async (req, res) => {
    // mongo crap
    let mongo_collection = mongo_db.collection('visits');
    const doc = {
        date: new Date()
    };
    const result = await mongo_collection.insertOne(doc);

    // Grab all the visits, append them to a list, generate html, return
    let list_string = "<h3>Visits:</h3><ol>"
    let visits_cursor = await mongo_collection.find();
    for await(const doc of visits_cursor) {
        list_string+=`<li>${doc.date}</li>`
    }
    list_string += "<ol>"

    let visit_count = await redis_client.get('visit_count');
    redis_client.set('visit_count', parseInt(visit_count) + 1);

    res.send(`
        <h1>Hello from express app. App visited ${parseInt(visit_count) + 1} times.</h1>
        ${list_string}
    `);
});

app.listen(PORT, (err) => {
    console.log(`Listening on port: ${PORT}`);
})
