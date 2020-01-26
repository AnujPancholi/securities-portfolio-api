"use strict";


const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const serverless = require('serverless-http');
const config = require('./config.js');
const middlewares = require('./lib/middlewares.js');
const routes = require('./routes/index.js');


// console.log(`CONFIG:`)
// Object.keys(config).forEach(func => {
// 	console.log(config[func]());
// })

const app = express();

//some useful middlewares from npm
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

//some middlewares that I made
app.use(middlewares.performAuth);
app.use(middlewares.addDb);


//routes
Object.keys(routes).forEach(route => {
	app.use(`/.netlify/functions/app/${route}`,routes[route]);
})



//and finally, let's fire her up

module.exports.handler = serverless(app);

// app.listen(config.getApiPort(),() => {
// 	console.log(`EXCHANGE-API SERVER LISTENING ON ${config.getApiPort()}`)
// })

