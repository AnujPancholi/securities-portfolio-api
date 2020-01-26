"use strict";

const mongo = require('./mongo.js');
const config = require('../config.js');

//a global to store the db (yes I know globals aren't exactly ideal)
let DB_GLOBAL = null;

//function to validate bearer token (if it's found)
const validateBearerToken = (token) => {
	console.log(token,config.getSecret());
	if(token===config.getSecret()){
		return {
			isSuccessful: true,
			error: null
		}
	} else{
		return {
			isSuccessful: false,
			error: {
				message: "BEARER TOKEN INVALID"
			}
		}
	}
}

//middleware to perform auth for requests
const performAuth = (req,res,next) => {
	console.log(req.headers.authorization);
	const authHeaderValues = req.headers.authorization ? req.headers.authorization.split(' ') : null;
	if(authHeaderValues && authHeaderValues[0]==="Bearer" && typeof(authHeaderValues[1])==="string"){
            const token = authHeaderValues[1];
            let validationResult = validateBearerToken(token);
            if(validationResult.isSuccessful){
            	next();
            } else {
            	res.status(401).send({
            		success: false,
            		data: null,
            		error: validationResult.error
            	})
            }		
    } else {
    	res.status(400).send({
    		success: false,
    		data: null,
    		error: {
    			message: "INVALID AUTHENTICATION METHOD"
    		}
    	})
    }
}

//function to connect to db if the db connection isn't done, else return the db global
const getDb = () => new Promise(async(resolve, reject) => {
    if (!DB_GLOBAL){
    	try{
        	DB_GLOBAL = await mongo.getDbInstance();
    	}catch(e){
        	reject(e);
    	}
    }
    resolve(DB_GLOBAL);
})


//middleware to add the db instance to any request
const addDb = async(req,res,next) => {
	try{
		req.db = await getDb();
		next();
	}catch(e){
		res.status(500).send({
			success: false,
			data: null,
			error: {
				message: "DB CONNECTION FAILED"
			}
		})
	}
}


module.exports = {
	performAuth: performAuth,
	addDb: addDb
}