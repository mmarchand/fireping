var util = require('util');
var ping = require ("net-ping");
var sqlite3 = require ("sqlite3");
var influx = require ("influx");
var colors = require('colors');
var global = require('./conf.js');

var targets = [];
var hosts = [];
var ival = global.ival; //ms
var cping = global.cping; //count
var tping = global.tping; //ms
var pingtimeout = global.pingtimeout; //ms
var pinghost = global.srchost;
var results = [];
var losses = [];
var pingerItv;
var db = new sqlite3.Database('fireping.db');
var infdb = influx ({ host : global.infhost, username: global.infuser, password: global.infpass, database: global.infdb } );

// Default options
var options = {
    networkProtocol: ping.NetworkProtocol.IPv4,
    packetSize: 16,
    retries: 0,
    sessionId: (process.pid % 65535),
    timeout: pingtimeout,
    ttl: 128
};

var session = ping.createSession (options);

function average (arr) {
  var sum = 0, j = 0;
  for (var i = 0; i < arr.length; i++) {
    sum += arr[i]; ++j;
  }
  return j ? sum / j : 0;
}

function doOnePing (target, count) {
  session.pingHost (target, function (error, target, sent, rcvd) {
    var ms = rcvd - sent;

    //ignore first ping (arp resolutions and stuff can be laggy)
    if ( count === 1 )
      return;

    if (error) {
      //console.log (target + "(" + count + ") :" + error.toString ());
      losses[target].push(count);
    } else {
      results[target].push(ms);
    }
  });
}

function dumpResults (ip) {
  if (losses[ip].length) {
    console.error(ip + " ("+hosts[ip]+") : " + average(results[ip]) + " ms : " + (losses[ip].length + " losses").red);
  } else {
    console.log(ip + " ("+hosts[ip]+") : " + average(results[ip]) + " ms : " + losses[ip].length + " losses");
  }
  //var points = [ { 'ttl':  average(results[ip]), 'loss': losses[ip].length*100/20, time: new Date() } ];
  //infdb.writePoints("fireping."+hosts[ip].replace(/\./g, "_"), points, function(err) {
  //  if (err)
  //    console.error(err);
  //});

  var dt = new Date();
  ttlip = average(results[ip]);
  lossip =  losses[ip].length*100/20;
  var points = [ [ { value: ttlip, time: dt}, { srchost: pinghost, host: hosts[ip].replace(/\./g, "_") } ] ];
  var points2 = [ [ { value: lossip, time: dt}, { srchost: pinghost, host: hosts[ip].replace(/\./g, "_") } ] ];

  var series = {
    "ttl": points,
    "loss": points2
  };
  infdb.writeSeries(series, function(err) {
    if (err)
      console.error(err);
  });

  //reset for next scan
  results[ip]=[];
  losses[ip]=[];
}

function doAllPing () {
  for (i in targets) {
    var ip = targets[i];
    for (var j = 1 ; j <= (cping+1) ; j++) {
      setTimeout( doOnePing, tping*j, ip , j );
    }
    setTimeout( dumpResults, (tping*(cping+2))+pingtimeout, ip );
  }
}

function Pinger() {
}

Pinger.addTarget = function(target, hostname) {
  console.log("Add target: " + target + "(" + hostname + ")");
  if (hosts[target]) {
    console.error ( "Entry " + target + " already exists");
  } else {
    var stmt = db.prepare("INSERT INTO targets ('target', 'hostname') VALUES (?,?)");
    stmt.run(target,hostname);
    stmt.finalize(Pinger.loadTargets);
  }
};

Pinger.loadTargets = function() {
  //force init arrays
  losses=[];
  results=[];
  targets=[];
  hosts=[];
  if (pingerItv)
    clearInterval(pingerItv);
  db.each("SELECT * FROM targets", function (err,row) {
      console.log("Read target from DB : " + row.id + " : " + row.target + " (" + row.hostname + ")");
      results[row.target] = [];
      losses[row.target] = [];
      targets.push(row.target);
      hosts[row.target] = row.hostname;
  }, startPing); //db.each
};

function startPing (err,rows) {
  console.log("Targets: " + rows);
  doAllPing();
  pingerItv = setInterval (doAllPing, ival);
}

//init and start
Pinger.loadTargets();

module.exports = Pinger;