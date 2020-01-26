"use strict";

const portfolio = require('express').Router();
const ExtendedError = require('../lib/extendedError.js');


portfolio.get('/:portfolioId',async(req,res,next) => {
	const response = {
		code: 500,
		payload: {
			success: false,
			data: null,
			error: null
		}
	}
	const portfolioId = req.params.portfolioId.trim();
	try{
		// let portfolioDbResponse = null;
		let portfolioObj = await req.db.collection("portfolios").findOne({
			_id: req.db.getObjectId(portfolioId)
		});
		if(!portfolioObj){
			throw new ExtendedError("PORTFOLIO NOT FOUND",{
				portfolioId: portfolioId
			},404);
		}

		portfolioObj.trades = await req.db.collection("trades").find({
			portfolioId: req.db.getObjectId(portfolioId)
		}).sort({_id: -1}).toArray();

		response.payload.success=true;
		response.payload.data=[portfolioObj];
		response.code=200;

	}catch(e){
		console.log(`portfolio|${portfolioId}|ERROR|${e.message || "NA"}`,e);
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

portfolio.get('/holdings',async(req,res,next) => {
	const response = {
		code: 500,
		payload: {
			success: false,
			data: null,
			error: null
		}
	}
	//using query params this time because I've been using url params almost everywhere;
	let portfolioId = req.query.portfolioId || null;

	try{
		let portfolio = await req.db.collection("portfolios").findOne({
			_id: db.getObjectId(portfolioId)
		});
		if(!portfolio){
			throw new ExtendedError("PORTFOLIO NOT FOUND",{
				portfolioId: portfolioId
			},404);
		}
		if(!portfolio.securities || !Array.isArray(portfolio.securities)){
			throw new ExtendedError("INVALID VALUE IN SECURITIES",{
				portfolioId: portfolioId,
				securities: portfolio.securities || null
			},500)
		}

		response.code = 200;
		response.payload = portfolio.securities;
		response.success = true;

	}catch(e){
		console.log(`portfolio|holdings|${portfolioId}|ERROR|${e.message || "NA"}`,e);
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


module.exports = portfolio;