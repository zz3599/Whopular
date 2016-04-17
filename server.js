var express = require('express');
var path = require('path');
var bodyparser = require('body-parser');
var cookieSession = require('express-session');

//hook up all the routers here
var app = express();

//Assets all in public folder
app.use('/public', express.static(__dirname + '/public'));
app.use( bodyparser.json()); // to support JSON-encoded bodies for posts, gets should not be stringifiied
app.use(cookieSession({
    resave: false,
    saveUninitialized: false,
    secret: 'NOTSECRET'
}));
app.locals.pretty = true;

// API for invoking HP, Twitter, etc.
var api = require('./api.js');


//api.getEntities("http://espn.go.com/nba/story/_/id/15202045/nba-kobe-bryant-fitting-farewell", "people_eng", getEntitiesDone);
//api.getSentiments("That was terrible. He's really the best when nothing matters.", "eng", getSentimentsDone);
api.initializeTwitter(
	function(){
		api.getTweetsForEntity("Kobe Bryant", function(tweets) {
			api.getSentiments(tweets, "eng", api.getSentimentsDone);
		});
	}
);

app.listen(3000);