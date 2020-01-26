"use strict";

const security = require('express').Router();
const ExtendedError = require('../lib/extendedError.js');



security.get('/get',async(req,res,next) => {
	const response = {
		code: 500,
		payload: {
			success: false,
			data: null,
			error: null
		}
	}

	let securitiesList = null;

	try{
		let securitiesQueryFilter = {};
		if(req.query.id){
			//chaining a whole bunch of functions just because
			//remove any spaces, split by comma (in case multiple), convert to objectId
			//have dealt with many clients using APIs who refuse to pass simple params properly
			securitiesQueryFilter._id = {
				$in: req.query.id.replace(/\s/g,'').trim().split(',').map(_id => req.db.getObjectId(_id))
			}
		}
		
		if(req.query.ticker_symbol){
			securitiesQueryFilter.ticker_symbol = {
				$in: req.query.ticker_symbol.replace(/\s/g,'').trim().split(',')
			}
		}

		if(req.query.type){
			securitiesQueryFilter.type = {
				$in: req.query.type.replace(/\s/g,'').trim().split(',').map(type => type.toUpperCase())
			}	
		}

		securitiesList = await req.db.collection("securities").find(securitiesQueryFilter).toArray();

		response.code=200;
		response.payload.success = true;
		response.payload.data = securitiesList;

	}catch(e){
		console.log(`portfolio|securities|ERROR|${e.message || "NA"}`,e);
		if(e instanceof ExtendedError){
			response.code = e.httpStatusCode;
			response.payload.success=false;
			response.payload.error = e.errorData;
		} else {
			response.code = 500;
			response.payload.success=false;
			response.payload.error = {
				message: "INTERNAL SERVER ERROR"
			}
		}
	}

	res.status(response.code).send(response.payload);

})

module.exports = security;