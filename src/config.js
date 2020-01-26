"use strict";


module.exports = {
	"getClusterSrv": () => process.env.CLUSTER_SRV,
	"getDbName": () => process.env.DB_NAME,
	"getSecret": () => process.env.SECRET,
	"getApiPort": () => parseInt(process.env.API_PORT)
}