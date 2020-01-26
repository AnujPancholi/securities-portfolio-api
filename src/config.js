"use strict";


const config_local = require('./config-local.js');

module.exports = {
	...config_local
}


// module.exports = {
// 	"getClusterSrv": () => process.env.CLUSTER_SRV,
// 	"getDbName": () => process.env.DB_NAME,
// 	"getSecret": () => process.env.SECRET,
// 	"getApiPort": () => parseInt(process.env.API_PORT)
// }