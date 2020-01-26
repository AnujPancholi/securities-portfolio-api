"use strict";

//mocking some code that will fetch the live price of a security form the securities exchange

//this just resolves 100 now, if live prices are required, only this would need changing
const getCurrentListedPrice = (__securityId) => new Promise((resolve,reject) => {
	resolve(100);
})


module.exports = {
	getCurrentListedPrice: getCurrentListedPrice
}