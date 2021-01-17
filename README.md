# Take-home Task

This is an API that I built as a take-home task for a company in 36 hours.

**NOTE:** I have implemented some crude auth which uses a static token, so you won't be able to just import the Postman collection and try it out.

[Postman Docs](https://documenter.getpostman.com/view/4642320/SWT8hzLq)

[Base URL (will not yield any result)](https://peaceful-hugle-67003a.netlify.com/.netlify/functions/app/)

## Tech Stack:
 - Runtime: Node.js (v10.16.3)
 - Framework Used for RESTful API: Express.js
 - Database: Mongodb (Hosted on Atlas, Mongoose ORM NOT used)

## Database Schema

Not a strict schema (since I used mongodb withOUT Mongoose), however:

**Collection: securities**
```
{
	_id: ObjectId,
	type: String [“EQUITY”,”DEBT”,etc](all are EQUITY for the purpose of the task)
	ticker_symbol: String,
	company_name: String
}
```

**Collection: portfolios**
```
{
	_id: ObjectId,
	name: String,
	securities: Array of Objects: {
				details: {
					_id: ObjectId (refers to doc in securities)
					ticker_symbol: string (refers to doc in securities)
},
quantity: number,
average_buy_price: number,
updatedAt: date 
}
	updatedAt: date
}
```

**Collection: trades**
```
{
	_id: ObjectId,
	type: String [“BUY”,”SELL”, etc.],
	portfolioId: ObjectId (refers to doc in portfolios)
	security: {
		_id: ObjectId (refers to doc in securities)
		ticker_symbol: String (refers to doc in securities)
},
price: Number,
quantity: Number,
timestamp: Date
}
```

There is only one portfolio in the portfolios collection. The securities array in the portfolio shows the state of the holdings at any time, objects are added, removed and updated depending on the trades that occur.

A given trade may only belong to one portfolio, therefore a portfolioId in every trade is enough to model the 1-many relationship. The many-many relationship between securities and portfolios is better modeled by the list of securities in portfolio.


## Salient Features:

 - For auth, I just started with a random string as a secret in the env variables, and thought I might change it later, but decided against it (will give me a point to make in the improvements). However, if you look at the way the token validation is implemented, there is a function solely responsible for validating the bearer token (principle of single responsibility, SOLID principles work well even outside a strict OOP setting). So, if another auth method like say JWT were to be implemented, only that function would need a change.
 - There is a middleware that attaches the db connection object to each express request obj. This is useful for serverless, where if the dyno (as Heroku calls it) times out, the connection is lost, and therefore a function is needed to check if that is the case, and if so, it reconnects. This is why every request made after a lull in requests will be abnormally slow (because the db connection is established). Therefore, if a request hasn’t been made in a while, I encourage you to try any requests that require the db twice so that the second time, it’s significantly faster.
 - There are two more factors beyond my control contributing to slowness: the fact that the db is hosted on a free atlas cluster (the one that Mongodb university signs you up for and has only 512Mb free storage), and that the netlify functions are hosted in the US. Not making excuses, just giving you a heads-up.
 - In lib/middlewares, the db object I’m attaching has a bit more sugar on top of it other than what the Node.js driver for mongo provides - it is a connection only to one db, since that’s all the application needs (singleton pattern), however, if we do need to switch dbs or close the connection, I’ve attached a Mongo client instance to the object itself. Also, I’ve made a function to convert a string to ObjectId using the constructor of Mongodb’s ObjectId class, and attached the same to the db object. At my current company, an npm package has been built over the mongo driver that has features like this and more, so I just quickly implemented the features that I needed since I’m used to that package (just making myself feel at home).
 - In the trade route file, I realized that I’ll be needing to query the portfolio many times. So one of the first things I did was make a function to fetch just that that can be used anywhere (facade pattern). However, I did not do that in any of the other routes, where I should have (another point for improvement).
 - There are some values in the environment variables (db connection info, secret, etc) that I’m returning wherever they are called from a function from config.js. To be frank, I’m not entirely sure what the advantage of doing it that way is. Perhaps it’s so that the values never get stored in any variable in the program and any deep inspection of the heap may not reveal them (security)? I just saw it in a project made by an accomplished developer and thought it looked cool.
 - You may notice an ExtendedError class, it’s so that errors can have more detail to them, instead of just a message, and we can pass custom data to it, along with an httpStatusCode, so if it’s thrown in a request handler, custom status code can be sent.
 - You may also notice that I’ve made a securitiesExchangeInterface.js file in lib, which is a mockup for some facade (again, the facade pattern) that interacts with some securities exchange software (API/socket?) to get the current price. It only resolves 100, but the operation will most likely be async, so I’ve promisified it. If something actual were to be done, just that function (read facade) needs a change (cool, huh?).
 - Another feature I’d like to highlight is in the trade route file, there is an object called TRADE_OPERATIONS. This is what makes accommodating buy and sell trades in the same handler possible, and if more operations are to be added like SHORT or COVER (yes, I’ve been doing my due diligence on the world of finance), only functions would most probably be needed to be written for them, instead of making more endpoints. 
  - You may notice that in every request handler, I’ve first initialized a response object, in which there is a response code and payload, that is sent in every request in the same way, regardless of successful response or error (again, principle of single responsibility).


## Testing Strategy
Firstly, every function that isn’t a request handler (lib function, middleware, etc) gets its own unit test (the only tests I actually ran were on 1 such function).
For testing the API itself, the standardized format will make things easy. However, using deepEquals (Node.js assertion library) would only work in success cases, as in most of the errors, the data object contains extremely specific data. Just assert if the schema is matching in these cases (perhaps using the ajv package).

## Future Improvements

 - As stated earlier, the response object initialization and the response sending parts are the same, so they could be reduced to middlewares themselves.
 - In most of the requests, error handling is the same as well, so that could also be made a middleware, used just before response.
 - Most of the queries are just being made via the req.db object, and not through a model. So a data access layer, maybe, to fetch data anywhere in the project. Or we could just use Mongoose
 Portfolio is being fetched anywhere and everywhere, so the project could be moved to serverful deployment with caching of such data for logged-in users. And perhaps an LRU cache for the blue-chip hot trades (already picking up finance lingo).




