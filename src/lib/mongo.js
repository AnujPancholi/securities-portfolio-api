"use strict";


const config = require('../config.js');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const client = new MongoClient(config.getClusterSrv(), {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

const getObjectId = (__id) => {
	let objectId = null;
	try{
		objectId = ObjectID(__id);
	}catch(e){
		//nothing to be done here, really
	}
	return objectId;
}

/*
	since we only need to connect to one db in some cluster in this project (as is the case with many projects),
	we draw the connection srv and the db name from the config to return just one instance of that db
*/
const getDbInstance = () => new Promise((resolve,reject) => {
	client.connect((error) => {
		if(error){
			console.error(error);
			reject(error);
		}
		let db = client.db(config.getDbName());
		//attaching the client because, at any point, if the connection needs to be closed, it'll be done through the client instance
		db.clientInstance = client;

		//attaching the very useful function to convert a string into objectId (if the string can be converted)
		db.getObjectId = getObjectId;

		resolve(db);
	})
})

module.exports = {
	getDbInstance: getDbInstance,
}
