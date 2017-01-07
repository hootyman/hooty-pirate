#!/usr/bin/env node
// TODO: add l10n support for multiple languages.
var piratebay = require('thepiratebay');
var irc = require("irc");
var rateLimit = require('function-rate-limit');
// Interval seconds between each line is sent via IRC to get around rate limiting.
var interval = 2;
var config = {
  channels: ["#thepiratebay.org"],
  server: "irc.freenode.net",
  botName: "hootybot"
};
var optionator = require('optionator')({
  prepend: 'Usage: cmd [options]',
  append: 'Version 1.0.0',
  options: [{
    option: 'help',
    alias: 'h',
    type: 'Boolean',
    description: 'Displays help'
  }, {
    option: 'query',
    alias: 'q',
    type: 'String',
    description: 'Searches thepiratebay using the provided query.',
    example: '-q query'
  }, {
    option: 'order',
    alias: 'o',
    type: 'String',
    description: 'name, date, size, seeds, leeches. Defaults to leeches',
    example: '-q query -o seeds'
  }, {
    option: 'sort',
    alias: 's',
    type: 'String',
    description: 'desc, asc. Defaults to desc',
    example: '-q query -sort asc'
  }, {
    option: 'limit',
    alias: 'l',
    type: 'Int',
    description: 'Number of records, defaults to 3, maximum 10',
    example: '-q query -limit 10'
  }]
});

var bot = new irc.Client(config.server, config.botName, {
  channels: config.channels
});

// Listen for private messages
bot.addListener("pm", function(nick, rawtext, message) {
  console.log(message.host + " | " + nick + " | " + rawtext);
  query(nick, rawtext);
});

function query(from, text) {
  var sort = "desc";
  var order = "leeches";
  // TODO need to get rate limiting working before this number can be increased.
  var limit = 2;
  var argv = process.argv.slice(0);
  // Separate the message into commands
  argv = argv.concat(text.split(' '));

  var options = optionator.parseArgv(argv);
  
  if(options.help) {
      return optionator.generateHelp();
  }
  if (options.sort) {
    sort = options.sort;
  }
  if (options.order) {
    order = options.order;
  }
  if (options.limit && options.limit <= 10) {
    limit = options.limit;
  }
  if (options.query) {
    piratebay.search(options.query, {
      sortBy: sort,
      orderBy: order
    })
    .then(function (results) {
      reply(from, results.splice(0, limit));
    } )
    .catch(err => console.log(err));
  }
}

function reply(from, results) {
  var parsed = parse(results);
  for (var result in parsed) {
    if (parsed.hasOwnProperty(result)) {
      // TODO: get rate limiting working as exptected
      rateLimit(1, interval * 1000, bot.say(from, parsed[result]));
    }
  }
}

function parse(unformatted) {
  var results = [];
  // TODO: Allow columns to be specified as an optionn
  var columns = [
    'name',
    'magnetLink'
  ];

  for (var i=0; i < unformatted.length; i++) {
    for (var result in unformatted[i]) {
      // return only columns specified
      if (columns.indexOf(result) === -1) {
        continue;
      }
      if (unformatted[i].hasOwnProperty(result)) {
        //TODO return prettier results
        results.push(result + '::' + unformatted[i][result] + '\n');
      }
    }
  }
  return results;
}
