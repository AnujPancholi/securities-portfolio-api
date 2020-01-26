"use strict";

const trade = require('express').Router();
const ExtendedError = require('../lib/extendedError.js');

// const ACCEPTED_TRADE_TYPES = ['BUY','SELL'];

const TRADE_OPERATION = {
	"BUY": {
		execute: (tradeObj,portfolio) => {
			let portfolioSecurityEntry = portfolio.securities.find(entry => entry.details._id.toString()===tradeObj.security._id.toString());

			let isNewSecurity = false;
			if(!portfolioSecurityEntry){
				portfolioSecurityEntry = {
					details: {
						...tradeObj.security
					},
					quantity: tradeObj.quantity,
					average_buy_price: tradeObj.price
				}
				isNewSecurity=true;
			} else {
				portfolioSecurityEntry.average_buy_price = ((portfolioSecurityEntry.quantity*portfolioSecurityEntry.average_buy_price)+(tradeObj.price*tradeObj.quantity))/(portfolioSecurityEntry.quantity+tradeObj.quantity); 
				portfolioSecurityEntry.quantity+=tradeObj.quantity;
			}
			portfolioSecurityEntry.updatedAt = new Date();
			return {
				error: false,
				tradeObj: tradeObj,
				portfolioSecurityEntry: portfolioSecurityEntry,
				isNewSecurity: isNewSecurity,
				data: {
					message: "CHANGES MADE"
				}
			}
		}
	},
	"SELL": {
		execute: (tradeObj,portfolio) => {
			let portfolioSecurityEntry = portfolio.securities.find(entry => entry.details._id.toString()===tradeObj.security._id.toString());
			if(!portfolioSecurityEntry){
				return {
					error: true,
					tradeObj: tradeObj,
					portfolioSecurityEntry: portfolioSecurityEntry,
					message: "CANNOT SELL - SECURITY NOT FOUND IN PORTFOLIO",
					data: {
						portfolioId: portfolio._id
					},
					httpStatusCode: 400
				}
			} else {
				if(portfolioSecurityEntry.quantity<tradeObj.quantity){
					return {
						error: true,
						tradeObj: tradeObj,
						portfolioSecurityEntry: portfolioSecurityEntry,
						message: "CANNOT SELL - QUANTITY SPECIFIED MORE THAN QUANTITY IN PORTFOLIO",
						data: {
							portfolioId: portfolio._id,
							quantity: portfolioSecurityEntry.quantity,
							sell_quantity: tradeObj.quantity
						},
						httpStatusCode: 400
					}	
				} else {
					portfolioSecurityEntry.quantity-=tradeObj.quantity;
					if(portfolioSecurityEntry.quantity===0){
						portfolioSecurityEntry = null;
					}
					return {
						error: false,
						tradeObj: tradeObj,
						portfolioSecurityEntry: portfolioSecurityEntry,
						data: {
							message: "CHANGES MADE"
						}
					}
				}
			}

		}
	},
}

const fetchPortfolioFromDb = (__portfolioId,__db,__securityId) => new Promise(async(resolve,reject) => {
	let portfolio = null;

	try{
		let portfolioProjection = {};
		if(__securityId){
			portfolioProjection.securities = {
				$elemMatch: {
					'details._id': __db.getObjectId(__securityId)
				}
			}
		}
		portfolio = await __db.collection("portfolios").findOne({
			_id: __db.getObjectId(__portfolioId)
		},portfolioProjection);
		resolve(portfolio);

	}catch(e){
		reject(e);
	}
})

const fetchSecurityFromDb = (__securityId,__db) => new Promise(async(resolve,reject) => {
	let security = null;

	try{
		security = await __db.collection("securities").findOne({
			_id: __db.getObjectId(__securityId)
		});
		resolve(security);

	}catch(e){
		reject(e);
	}
})

trade.post('/:type',async(req,res,next) => {
	const response = {
		code: 500,
		payload: {
			success: false,
			data: null,
			error: null
		}
	}

	const tradeType = req.params.type.trim().toUpperCase();
	let tradeObj = null;
	let isTradeInserted=false;
	let isPortfolioUpdated=false;
	// let insertedTradeId = null;

	try{
		if(!TRADE_OPERATION.hasOwnProperty(tradeType)){
			throw new ExtendedError("UNKNOWN TRADE TYPE",{
				accepted_trade_types: Object.keys(TRADE_OPERATION),
				given_trade_type: tradeType
			},400);
		}
		if(!req.body.portfolioId
			|| !req.body.securityId
			|| !req.body.quantity
			|| !req.body.price){

			throw new ExtendedError("REQUEST PAYLOAD MISSING MANDATORY PARAMS",{
				request_payload: {
					...req.body
				}
			},400);
		}

		req.body.quantity = parseInt(req.body.quantity);
		if(req.body.quantity<=0){
			throw new ExtendedError("INVALID QUANTITY VALUE",{
				quantity: req.body.quantity
			},400);	
		}

		req.body.price = parseInt(req.body.price);
		if(req.body.price<=0){
			throw new ExtendedError("INVALID PRICE VALUE",{
				price: req.body.price
			},400);	
		}



		let [portfolio,security] = await Promise.all([
			fetchPortfolioFromDb(req.body.portfolioId,req.db,req.body.securityId),
			fetchSecurityFromDb(req.body.securityId,req.db)
			]);
		if(!portfolio){
			throw new ExtendedError("PORTFOLIO NOT FOUND",{
				portfolioId: req.body.portfolioId
			},404);
		}
		if(!security){
			throw new ExtendedError("SECURITY NOT FOUND",{
				securityId: req.body.securityId
			},404);
		}

		tradeObj = {
			type: tradeType,
			portfolioId: req.db.getObjectId(portfolio._id),
			security: {
				_id: req.db.getObjectId(security._id),
				ticker_symbol: security.ticker_symbol
			},
			price: parseFloat(req.body.price),
			quantity: parseInt(req.body.quantity),
			timestamp: new Date()
		}

		let portfolioSecurityEntry = portfolio.securities.find(entry => entry.details._id.toString()===security._id.toString());

		let tradeOperationExecutionResult = TRADE_OPERATION[tradeType] && TRADE_OPERATION[tradeType].hasOwnProperty("execute") ? TRADE_OPERATION[tradeType].execute(tradeObj,portfolio) : null; 
		if(!tradeOperationExecutionResult){
			throw new ExtendedError("TRADE_OPERATION EXECUTION NOT FOUND FOR TRADE TYPE",{
				tradeType: tradeType
			});
		} else if(tradeOperationExecutionResult.error){
			throw new ExtendedError(tradeOperationExecutionResult.message,tradeOperationExecutionResult.data,tradeOperationExecutionResult.httpStatusCode || 500);
		}

		let updatedPortfolioSecurityEntry = tradeOperationExecutionResult.portfolioSecurityEntry;


		let tradeInsertionResult = await req.db.collection("trades").insertOne(tradeObj);
		// insertedTradeId = tradeInsertionResult.insertedId;
		tradeObj._id = tradeInsertionResult.insertedId;
		isTradeInserted=true;
		console.log(`trades|${tradeType || "NA"}|trade inserted in db|`,tradeInsertionResult.insertedId);


		let portfolioUpdateObject = {
			//don't really need an IIFE here, but did it just to show if off I guess
			...(() => {
				if(!updatedPortfolioSecurityEntry){
					return {
						$pull: {
							"securities": {
								"details._id": req.db.getObjectId(security._id)
							}
						},
						$set: {
							updatedAt: new Date()
						}
					}
				} else {
					if(tradeOperationExecutionResult.isNewSecurity){
						return {
							$push: {
								"securities": updatedPortfolioSecurityEntry
							}
						} 
					}
					return {
						$set: {
							"securities.$.quantity": updatedPortfolioSecurityEntry.quantity,
							"securities.$.average_buy_price": updatedPortfolioSecurityEntry.average_buy_price,
							updatedAt: new Date()
						}
					}
				}
			})()
		}

		let portfolioUpdateFilter = {
			_id: req.db.getObjectId(portfolio._id)
			// "securities.details._id": req.db.getObjectId(security._id)
		}
		if(!tradeOperationExecutionResult.isNewSecurity){
			portfolioUpdateFilter["securities.details._id"] = req.db.getObjectId(security._id);
		}
		console.log("UPDATE OBJECT",portfolioUpdateObject);

		let portfolioUpdateResult = await req.db.collection("portfolios").updateOne(portfolioUpdateFilter,portfolioUpdateObject);
		if(portfolioUpdateResult.modifiedCount>0){
			isPortfolioUpdated=true;
		}
		console.log(`trades|${tradeType || "NA"}|portfolio updated in db|`,portfolioUpdateResult);


		response.code=200;
		response.payload.success = true;
		response.payload.data = [{
			trade: tradeObj,
			isTradeInserted: isTradeInserted,
			isPortfolioUpdated: isPortfolioUpdated
		}]



	}catch(e){

		console.error(`portfolio|${tradeType || "NA"}|ERROR|${e.message || "NA"}`,e);
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



module.exports = trade;