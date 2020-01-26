"use strict";

class ExtendedError extends Error{
	constructor(message,dataObj,httpStatusCode=500){
		super(message);
		this.name="ExtendedError";
		// this.message = message;
		this.httpStatusCode = httpStatusCode;
		this.errorData = {
			message: message,
			data: dataObj
		};
	}
}

module.exports = ExtendedError;