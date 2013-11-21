var url = require('url'), express = require('express'), app = express(),
    server = require('http').createServer(app), io = require('socket.io').listen(server), Twitter = require('twit');

var twitter = new Twitter({
  consumer_key:         process.env.TWITTER_CONSUMER_KEY,
  consumer_secret:      process.env.TWITTER_CONSUMER_SECRET,
  access_token:         process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret:  process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var emitTweet = function(socket, tweet) {
  console.log(tweet);
  if (!tweet.retweeted) {
    socket.emit('tweet', {
      id: tweet.id,
      text: tweet.text,
      timestamp: tweet.created_at,
      user: {
        name: tweet.user.name,
        handle: tweet.user.screen_name,
        image: tweet.user.profile_image_url
      }
    });
  }
}

io.sockets.on('connection', function(socket) {
  socket.on('init', function(data) {
    socket.get('hashtag', function(err, hashtag) {
      if (!hashtag) { socket.set('hashtag', data.hashtag); }
      var query = data.hashtag;

      socket.emit('init', {hashtag: query});

      twitter.get('search/tweets', {q: query, count: 8}, function(err, reply){
        reply.statuses.reverse().forEach(function(tweet) {
          emitTweet(socket, tweet);
        });
      });

      var stream = twitter.stream('statuses/filter', {track: query});
      stream.on('tweet', function(tweet) { emitTweet(socket, tweet); });
    });
  });
});

app.get('/', function(req, res) { res.sendfile(__dirname + '/index.html'); });
app.use(express.static(process.cwd() + '/public'));

server.listen(process.env.PORT || 8081);
