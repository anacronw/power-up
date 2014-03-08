var currentPage = 0;
var lineCtx = document.getElementById('line-analysis').getContext('2d');
var pieCtx = document.getElementById('pie-analysis').getContext('2d');
var deviceMap = {};
var lineData = {
  labels : [],
  datasets : [
    {
    fillColor : "rgba(220,220,220,0.5)",
    strokeColor : "rgba(220,220,220,1)",
    pointColor : "rgba(220,220,220,1)",
    pointStrokeColor : "#fff",
    data: []
    }
  ]
};
var pieData = []
var lineChart = new Chart(lineCtx);
var pieChart = new Chart(pieCtx);

var socket = io.connect('/');
var wattage;
$.getJSON('/api/usage', function(info){
  wattage = info.usage;
  $('#watts').html(wattage);
  setInterval(function(){
    variance = wattage + Math.round(Math.random() * 3);
    $('#watts').html(variance);
    // update lineData
    lineData.labels.push(moment().format('s'));
    lineData.datasets[0].data.push(variance);

    lineData.labels = lineData.labels.splice(-20);
    lineData.datasets[0].data = lineData.datasets[0].data.splice(-20);
    lineChart.Line(lineData, {animation: false, scaleOverride: true, scaleSteps: 15, scaleStartValue: 1800, scaleStepWidth: 200});

    // update pie data
    var pieData = [];
    for (var deviceName in deviceMap){
      if (deviceMap[deviceName].status === 'on')
        deviceMap[deviceName].value+= deviceMap[deviceName].power;
      pieData.push(deviceMap[deviceName]);
    }

    pieChart.Pie(pieData, {animation: false});
  }, 1000);
});
socket.on('update', function(newWattage){
  wattage = newWattage;
  console.log(wattage);
  $.getJSON('/api/guess/devices', function(devices){
    $('#question').html('Did you turn one of these on?').toggleClass('text-success');
    $('#buttons-container').empty();
    devices.forEach(function(device){
      $('#buttons-container').append('<div class="col-xs-4"><button class="btn btn-info btn-lg btn-block device-btn slideUp" data-name="' + device.name + '">' + device.name + '<br /><i class="fa ' + device.icon + '"></i></button></div>');
    });
    $('#buttons-container').append('<div class="col-xs-4"><button class="btn btn-lg btn-block device-btn">Other...</button></div>');
    $('#buttons-container').hide().fadeIn(1000);
    $('.device-btn').click(function(){
        $.post('/api/device', {name: $(this).data('name')}, function(){
          $('#question').html('Great!  Let\'s do another one! <br /> (Turn on another device)').toggleClass('text-success');
          $('#buttons-container').empty();
        });
    });
  });
});
socket.on('device.on', function(device){
  deviceMap[device.name] = {
    value: device.power,
    power: device.power,
    label: device.name,
    status: 'on',
    labelColor: '#ffffff',
    color: getRandomColor()
  };
  $.bootstrapGrowl(device.name + ' just turned on');
});
socket.on('device.off', function(device){
  if (deviceMap[device.name]){
    deviceMap[device.name].status = "off";
  }
  $.bootstrapGrowl(device.name + ' just turned off');
});
$('#start-btn').click(function(){
  nextPage();
})
$('#continue-btn').click(function(){
  nextPage();
  $.post('/api/complete', {}, function(){
    $.getJSON('/api/devices', function(devices){
      console.log(devices);
      devices.forEach(function(device){
        deviceMap[device.name] = {
          value: device.power,
          power: device.power,
          status: 'on',
          label: device.name,
          labelColor: "#ffffff",
          color: getRandomColor()
        }
      });
    });
  });
});
function nextPage(){
  $('.page').hide();
  currentPage++;
  $('.page').eq(currentPage).show();
}
function getRandomColor() {
  var letters = '0123456789ABCDEF'.split('');
  var color = '#';
  for (var i = 0; i < 6; i++ ) {
    color += letters[Math.round(Math.random() * 15)];
  }
  return color;
}
$.post('/api/start');
