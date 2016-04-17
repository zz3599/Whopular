var request = require('request');

//TODO: move to DB
var secrets = {
	API_KEY : "ee400c33-906c-49b6-9515-28a518446c42",
	TWITTER_ACCESS_TOKEN : ""
}

module.exports = {
	/////////////////////////////////////////////
	////Get request for the entities in the article
	/////////////////////////////////////////////
	getEntities: function (url, entity_type, callback) {
		request({
			uri: "https://api.havenondemand.com/1/api/async/extractentities/v2",
		  	method: "POST",
		  	timeout: 60000,
		  	form: {
		    	apikey: secrets.API_KEY,
		    	url: url,
		    	entity_type: entity_type
		  	}
		}, function(error, response, body) {
			body = JSON.parse(body);
		  	console.log(body.jobID);	
		  	module.exports.awaitAsync(body.jobID, callback);
		});
	}, 

	// General call that should be invoked from all async get/post callbacks
	awaitAsync: function (jobID, callback){	
		console.log("Making request to " + "https://api.havenondemand.com/1/job/status/" + jobID + "?apikey=" + secrets.API_KEY);
		request({
		  	uri: "https://api.havenondemand.com/1/job/status/" + jobID + "?apikey=" + secrets.API_KEY,
			method: "GET",
			timeout: 10000,
		}, function(error, response, body) {
			body = JSON.parse(body);
			var status = body.status;
			if (status === 'failed'){
				console.log("Request failed");
			} else if (status === 'finished'){
				console.log("Request completed " + jobID);
				callback(body.actions[0].result);
			} else {
				module.exports.awaitAsync(jobID, callback);
			}
		});	
	},

	// Callback for getEntities
	getEntitiesDone: function (result) {
		console.log("Get entities done=" + result);
		//ignore names that only have 1 match
		var entities = result.entities.filter(function (entity){ return entity.matches.length > 1; });
		for(var i = 0; i < entities.length; i++){
			console.log("Found entity: " + entities[i].normalized_text + ", picture: " + entities[i].additional_information.image);
		}
	},

	/////////////////////////////////////////////
	////Get request for the sentiments of the specified string. 
	////Can be an aggregate of multiple sentences
	/////////////////////////////////////////////
	getSentiments: function (text, language, callback) {
		console.log("Making request to get sentiments for " + text);
		request({
			uri: "https://api.havenondemand.com/1/api/async/analyzesentiment/v1",
		  	method: "POST",
		  	timeout: 60000,
		  	form: {
		    	apikey: secrets.API_KEY,
		    	text: text,
		    	language: language
		  	}
		}, function(error, response, body) {
			body = JSON.parse(body);
		  	console.log(body.jobID);	
		  	module.exports.awaitAsync(body.jobID, callback);
		});
	},

	// Callback for getsentiments
	getSentimentsDone: function (result) {
		console.log("Get sentiments done=" + result);
		var numPositive = result.positive.length;
		var numNegative = result.negative.length;
		var aggregateScore = result.aggregate.score;
		var aggregateSentiment = result.aggregate.sentiment;
		console.log("Total negative: " + numNegative + ", positive: " + numPositive + ", aggregateScore: " + aggregateScore + ", aggregateSentiment: " + aggregateSentiment);
	},

	// Should only be called once
	initializeTwitter: function (callback) {
		var key = "Lt0Y4gU3um7ou8WQdQrPjcefw";
		//TODO: move to DB
		var secret = "xRMUKxd9Srl7PHxICidbSpObIrf2RCbOxeWfNW3b4wTiuAWNgd";
		var encoded = new Buffer(key + ":" + secret).toString('base64');
		console.log(encoded);
		request({
			uri: "https://api.twitter.com/oauth2/token",
		  	method: "POST",
		  	timeout: 10000,
		  	headers: {
		  		"Authorization" : "Basic " + encoded,
		  		"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
		  	},
		  	form: {
		    	"grant_type" : "client_credentials"
		  	}
		}, function(error, response, body) {
			console.log(body);	
			body = JSON.parse(body);
			if (body.token_type === 'bearer') {
				secrets.TWITTER_ACCESS_TOKEN = body["access_token"];
			}
			if(callback)callback();
		});
	},

	/////////////////////////////////////////////
	////Gets the tweets for one entity
	/////////////////////////////////////////////
	getTweetsForEntity: function (entityName, callback) {
		if (!entityName) {
			console.log("Empty entityname");
			callback("");
		}
		if (!secrets.TWITTER_ACCESS_TOKEN){
			console.log("No twitter access token");
			callback("");
		}
		// Put OR's around everything so we can get everything in one search
		var allEntities = entityName;
		var queryString = "q=" + encodeURIComponent(allEntities) + "&result_type=recent&count=100&lang=en";
		console.log("Twitter Search query: " + queryString);
		request({
		  	uri: "https://api.twitter.com/1.1/search/tweets.json?" + queryString,
			method: "GET",
			timeout: 10000,
			headers: {
		  		"Authorization" : "Bearer " + secrets.TWITTER_ACCESS_TOKEN,
		  		"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
		  	},
		}, function(error, response, body) {
			body = JSON.parse(body);
			console.log("Tweet count received: " + body.statuses.length);
			//Concatentate all the tweets into one string, separated by periods, but not extra periods
			//since that would screw up the sentiment analysis due to extra sentences
			var tweetText = "";
			for (var i = 0; i < body.statuses.length; i++) {
				if (tweetText.length > 0 && tweetText[tweetText.length-1] !== '.'){
					tweetText += '.';
				}
				tweetText += body.statuses[i].text.trim();
			}
			callback(tweetText);
		});	
	}
};