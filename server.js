var express = require('express');
var path = require('path');
var bodyparser = require('body-parser');
var cookieSession = require('express-session');

//hook up all the routers here
var app = express();

//Assets all in public folder
//app.use('/public', express.static(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));
app.use( bodyparser.json()); // to support JSON-encoded bodies for posts, gets should not be stringifiied
app.use(cookieSession({
    resave: false,
    saveUninitialized: false,
    secret: 'NOTSECRET'
}));
app.locals.pretty = true;

// API for invoking HP, Twitter, etc.
var api = require('./api.js');
// Do this early
api.initializeTwitter();

//api.getEntities("
//	http://espn.go.com/nba/story/_/id/15202045/nba-kobe-bryant-fitting-farewell", "people_eng", getEntitiesDone);
//	http://www.nytimes.com/2016/04/17/opinion/sunday/trump-family-values.html?action=click&module=TrendingGrid&region=TrendingTop&pgtype=collection&_r=0
//api.getSentiments("That was terrible. He's really the best when nothing matters.", "eng", getSentimentsDone);
// api.initializeTwitter(
// 	function(){
// 		api.getTweetsForEntity("Kobe Bryant", function(tweets) {
// 			api.getSentiments(tweets, "eng", api.getSentimentsDone);
// 		});
// 	}
// );
app.route('/').get(function(req, res, next){
	res.sendfile('public/index.html');
});

app.route('/getEntities').get(function(req, res, next){
	var url = req.param('url');
	api.getEntities(url, "people_eng", function(result){
		console.log("Get entities done=" + result);
		//ignore names that only have 1 match
		var entities = result.entities.filter(function (entity){ return entity.matches.length > 1; });
		var entityResult = [];
		for(var i = 0; i < entities.length; i++){
			console.log("Found entity: " + entities[i].normalized_text + ", picture: " + entities[i].additional_information.image);
			entityResult[i] = {
				name: entities[i].normalized_text,
				numMentions: entities[i].matches.length,
				picture: entities[i].additional_information.image
			};
		}
		res.send({'entities' : entityResult});
	});
});

app.route('/getPopularity').get(function(req, res, next){
	var entityName = req.param('entityName');
	api.getTweetsForEntity(entityName, function(tweets) {
		api.getSentiments(tweets, "eng", function (result) {
			console.log("Get sentiments done=" + result);
			var numPositive = result.positive.length;
			var numNegative = result.negative.length;
			var aggregateScore = result.aggregate.score;
			var aggregateSentiment = result.aggregate.sentiment;
			var mostPositiveTweet = getMostPositiveTweet(result.negative, result.positive);
			var mostNegativeTweet = getMostNegativeTweet(result.negative, result.positive);
			console.log(entityName + " Total negative: " + numNegative + ", positive: " + numPositive + ", aggregateScore: " + aggregateScore + ", aggregateSentiment: " + aggregateSentiment);
			res.send({'entityName': entityName, 'aggregateScore' : aggregateScore, 'aggregateSentiment' : aggregateSentiment, 
				'mostPositive' : mostPositiveTweet, 'mostNegative' : mostNegativeTweet});
		});
	});
});

function getMostPositiveTweet(negatives, positives){
	var mostPositive;
	for (var i = 0; i < positives.length; i++){
		if(!mostPositive || positives[i].score > mostPositive.score){
			mostPositive = positives[i];
		}
	}
	if (mostPositive) {
		return mostPositive;
	}
	for (var i = 0; i < negatives.length; i++){
		if(!mostPositive || negatives[i].score > mostPositive.score){
			mostPositive = negatives[i];
		}
	}
}

function getMostNegativeTweet(negatives, positives){
	var mostNegative;
	for (var i = 0; i < negatives.length; i++){
		if(!mostNegative || negatives[i].score < mostNegative.score){
			mostNegative = negatives[i];
		}
	}
	if (mostNegative) {
		return mostNegative;
	}
	for (var i = 0; i < positives.length; i++){
		if(!mostNegative || positives[i].score < mostNegative.score){
			mostNegative = positives[i];
		}
	}


}

app.listen(process.env.PORT || 3000);