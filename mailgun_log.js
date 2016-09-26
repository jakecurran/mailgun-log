#!/usr/bin/env node

// *****************************************************************************
//
//   Mailgun Log
//
//   Add to /etc/cron.daily (anacron)
//
//   Switch to https://documentation.mailgun.com/api-events.html#events
//
// *****************************************************************************

// Paterns of domain names from account to exclude in log
var EXCLUDE_DOMAINS = [/^sandbox*/];

// Preamble

var fs = require('fs');
var https = require('https');

// *******************************************************************
//
//                        Helper Functions
//
// *******************************************************************

// Makes request to Mailgun API at path with key and returns the body data
function mailgunRequest(path, key) {
  var options = {
    hostname: 'api.mailgun.net',
    port: 443,
    method: 'GET',

    path: path,
    auth: 'api:' + key
  };

  var req = https.request(options, (res) => {
    //console.log('STATUS: ' + res.statusCode);
    //console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');

    var data = '';

    res.on('data', function (d) {
      data += d;
    });

    res.on('end', function () {
      console.log(data);
    });
  });

  req.on('error', function(e) {
    console.log('Problem with request: ' + e.message);
    process.exit(1);
  });

  req.end();

  return req;
}

// *******************************************************************
//
//                          Main Script
//
// *******************************************************************

var currentDate = new Date();

// Read in existing log
var logName = 'log.json';

var log = null;
try {
  log = require('./' + logName);
} catch(e) {
  log = {};
}

// Confirm Mailgun api key env variable

var MAILGUN_PRIVATE_API_KEY = process.env.MAILGUN_PRIVATE_API_KEY;

if (!MAILGUN_PRIVATE_API_KEY) {
  console.log('Please set \'MAILGUN_PRIVATE_API_KEY\' environment variable');
  process.exit(1);
}

// Retrieve domain names associated with account

var domains = mailgunRequest('/v3/domains', MAILGUN_PRIVATE_API_KEY);

console.log(domains);

var domainNames = [];
for (var d = 0; d < domains.length; d++) {
  var domain = domains[d];
  var domainName = domain.name;

  var includeDomain = true;
  for (var exclude = 0; e < EXCLUDE_DOMAINS; e++) {
    if (!EXCLUDE_DOMAINS[exclude].test(domainName)) {
      includeDomain = false;
      break;
    }
  }

  if (includeDomain) {
    domainNames.push(domainName);
  }
}

domains.filter(function (d) {

  for (var dn = 0; dn < EXCLUDE_DOMAINS.length; dn++) {
    if (!EXCLUDE_DOMAINS[dn].test(d)) {
      return false;
    }
  }

  return true;
});

// Retrieve events for log update

var numberOfNewEvents = {};

for (var dn = 0; dn < domains.length; dn++) {
  domainName = domains[dn];

  numberOfNewEvents[domainName] = 0;

  if (!log[domainName]) {
    log[domainName] = {
      info: {
        last_updated: null,
        last_event_read: null,
        events_count: 0
      },

      events: []
    };
  }

  var domainInfo = log[domainName].info;

  var domainLastReadEventDate = (domainInfo.last_event_read)
                                  ? new Date(domainInfo.last_event_read)
                                  : null;

  var newEvents = [];

  var skip = 0;
  var limit = 5;

  while (true) {
    var events = mailgunRequest(
      '/v3/' + domainName + '/log?limit=' + limit + '&skip=' + skip, MAILGUN_PRIVATE_API_KEY
    );

    if (events.length === 0) {
      break;
    }

    for (var e = 0; e < events.length; e++) {
      var event = events[e];
      var eventDate = (event.created_at === null)
                      ? null
                      : new Date(event.created_at);

      if (eventDate && eventDate <= log[domainName]) {
        break;
      }

      newEvent.push(event);
    }

    log[domainName].events = log[domainName].events.concat(events);

    skip += limit;

    if (limit * 2 <= 300) limit *= 2;
  };

  numberOfNewEvents[domainName] += newEvents.length;

  while (newEvents.length > 0) {
    var event = newEvents.pop();

    if (newEvents.length === 1) {
      domainInfo.last_event_read = new Date(newEvent.created_at);
    }

    log[domainName].events.push(event);
    domainInfo.events_count++;
  }

  domainInfo.last_updated = currentDate;

  // Update log based on request
  log[domainName].events = log[domainName].events.concat(newEvents);
}

// Save file

fs.writeFile(logName, JSON.stringify(log, null, 2), function (e) {
  console.error(e);
  process.exit(1);
});

// Output summary of operations

var summary = 'Update completed successfully.\n';
              newEvents.length + 'new events added to log.';

for (var dn = 0; dn < domains.length; dn++) {
  var domainName = domains[dn];
  summary += '\t' + domainName + ': ' + numberOfNewEvents[domainName] + ' new events';
}

console.log(summary);
