var express = require('express');
var path = require('path');
var bodyparser = require('body-parser');
var cookieSession = require('express-session');
var request = require('request');
//hook up all the routers here
var app = express();

//Yes, key is public for everyone.

var API_KEY = "ee400c33-906c-49b6-9515-28a518446c42";

//Assets all in public folder
app.use('/public', express.static(__dirname + '/public'));
app.use( bodyparser.json()); // to support JSON-encoded bodies for posts, gets should not be stringifiied
app.use(cookieSession({
    resave: false,
    saveUninitialized: false,
    secret: 'NOTSECRET'
}));
app.locals.pretty = true;

//Basic get request for the entities in the article
//TODO: call this without default parameters
function getEntities(url, entity_type, callback) {
	request({
		uri: "https://api.havenondemand.com/1/api/async/extractentities/v2",
	  	method: "POST",
	  	timeout: 60000,
	  	form: {
	    	apikey: API_KEY,
	    	url: url,
	    	entity_type: entity_type
	  	}
	}, function(error, response, body) {
		body = JSON.parse(body);
	  	console.log(body.jobID);	
	  	awaitAsync(body.jobID, callback);
	  	//getEntitiesDone(body);
	});
}


function awaitAsync(jobID, callback){	
	console.log("Making request to " + "https://api.havenondemand.com/1/job/status/" + jobID + "?apikey=" + API_KEY);
	request({
	  	uri: "https://api.havenondemand.com/1/job/status/" + jobID + "?apikey=" + API_KEY,
		method: "GET",
		timeout: 10000,
	}, function(error, response, body) {
		body = JSON.parse(body);
		var status = body.status;
		if (status === 'failed'){
			console.log("Request failed");
		} else if (status === 'finished'){
			console.log("Request completed");
			callback(body.actions[0].result);
		} else {
			//TODO: maybe stack overflow
			awaitAsync(jobID, callback);
		}
	});
	
}

function getEntitiesDone(result) {
	console.log("Get entities done=" + result);
	//ignore names that only have 1 match
	var entities = result.entities.filter(function (entity){ return entity.matches.length > 1; });
	for(var i = 0; i < entities.length; i++){
		console.log("Found entity: " + entities[i].normalized_text + ", picture: " + entities[i].additional_information.image);
	}
}

getEntities("http://espn.go.com/nba/story/_/id/15202045/nba-kobe-bryant-fitting-farewell", "people_eng", getEntitiesDone);




app.listen(3000);