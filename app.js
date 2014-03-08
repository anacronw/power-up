
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var devices = require('./devices');

var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var sockets = [];
var complete = false;
var registeredDevices = [];
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
var wattage = 2000;
var lastAmount = 0;
app.get('/api/update', function(req, res){ 
  lastAmount = parseFloat(req.query.amount);
  wattage += lastAmount;

  if (!complete){
    sockets.forEach(function(socket){
      socket.emit('update', wattage);
    });
  } else{

    // try to guess which device it was
    var devicesCopy = JSON.parse(JSON.stringify(registeredDevices));
    var mostLikelyDevice = devicesCopy.sort(function(a,b){
      return (Math.abs(a.power - lastAmount) - Math.abs(b.power - lastAmount));
    }).shift();
    sockets.forEach(function(socket){
      socket.emit(lastAmount > 0 ? 'device.on' : 'device.off', mostLikelyDevice);
    });
  }
  res.send(200, 'success'); 
});
app.post('/api/start', function(req, res){
  complete = false;
  res.send(200, 'success');
});
app.post('/api/complete', function(req, res){
  complete = true;
  res.send(200, 'success');
});
app.get('/api/usage', function(req, res){
  res.send(200, {usage: wattage});
});
app.get('/api/guess/devices', function(req, res){
  var devicesCopy = JSON.parse(JSON.stringify(devices));
  res.send(200, devicesCopy.sort(function(a, b){
    return (Math.abs(a.power - lastAmount) - Math.abs(b.power - lastAmount));
  }).splice(0, 5));
});
app.post('/api/device', function(req, res){
  var device = req.body;
  device.power = lastAmount;
  registeredDevices.push(device);
  res.send(200);
});
app.get('/api/devices', function(req, res){
  console.log(registeredDevices);
  res.send(200, registeredDevices);
});
io.sockets.on('connection', function(socket){
  sockets.push(socket);
});
