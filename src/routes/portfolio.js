"use strict";

const portfolio = require('express').Router();
const ExtendedError = require('../lib/extendedError.js');
const {getCurrentListedPrice: getCurrentListedPrice} = require('../lib/securitiesExchangeInterface.js');


portfolio.get('/get/:portfolioId',async(req,res,next) => {
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

		// portfolioObj.trades = await req.db.collection("trades").find({
		// 	portfolioId: req.db.getObjectId(portfolioId)
		// }).sort({_id: -1}).toArray();

		let aggregatedTrades = await req.db.collection("trades").aggregate([{
			$match: {
				portfolioId: req.db.getObjectId(portfolioObj._id)
			}
		},{
			$group: {
				_id: '$security._id',
				trades: {
					$push: '$$ROOT'
				}
			}
		}]).toArray()

		let securityToTradesMap = aggregatedTrades.reduce((secToTrades,result) => {
			secToTrades[result._id.toString()] = result.trades;
			return secToTrades;
		},{});

		portfolioObj.securities.forEach(securityEntry => {
			securityEntry.trades = securityToTradesMap[securityEntry.details._id.toString()];
		})


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
			_id: req.db.getObjectId(portfolioId)
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
		response.payload.data = portfolio.securities;
		response.payload.success = true;

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



const addReturnsToSecurityEntry = (__securityEntry,__totalReturnsObj) => new Promise(async(resolve,reject) => {
	try{
		let currentPrice = await getCurrentListedPrice(__securityEntry.details._id);
		__securityEntry.returns = (currentPrice - __securityEntry.average_buy_price)*__securityEntry.quantity;
		__totalReturnsObj.value+=__securityEntry.returns;
		resolve(true);
	}catch(e){
		__securityEntry.returns = null;
		resolve(false);
	}
}) 

portfolio.get('/returns/:portfolioId',async(req,res,next) => {
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
		let portfolioObj = await req.db.collection("portfolios").findOne({
			_id: req.db.getObjectId(portfolioId)
		});
		if(!portfolioObj){
			throw new ExtendedError("PORTFOLIO NOT FOUND",{
				portfolioId: portfolioId
			},404);
		}


		let totalReturnsObj = {
			value: 0
		}
		let returnsCalculationResult = await Promise.all(portfolioObj.securities.map(securityEntry => addReturnsToSecurityEntry(securityEntry,totalReturnsObj)));
		portfolioObj.total_returns = totalReturnsObj.value;
		


		response.code=200;
		response.payload.success=true;
		response.payload.data = portfolioObj;

	}catch(e){
		console.log(`portfolio|returns|${portfolioId}|ERROR|${e.message || "NA"}`,e);
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