d3.json('device-data.json', function(data) {
  var container = require('../js/container')();

  // set up main one-day container
  container.data(data).defaults().width(1000).height(700);

  d3.select('#tidelineContainer').datum(container.getData()).call(container);

  // set up click-and-drag and scroll navigation
  container.setNav().setScrollNav();

  // attach click handlers to set up programmatic pan
  $('#tidelineNavForward').on('click', container.panForward);
  $('#tidelineNavBack').on('click', container.panBack);

  console.log(new Date(container.endpoints[0]), new Date(container.endpoints[1]));

  // start setting up pools
  // messages pool
  var poolMessages = container.newPool().defaults()
    .id('poolMessages')
    .label('')
    .index(container.pools().indexOf(poolMessages))
    .weight(0.5);

  // blood glucose data pool
  var poolBG = container.newPool().defaults()
    .id('poolBG')
    .label('Blood Glucose')
    .index(container.pools().indexOf(poolBG))
    .weight(1.5);

  // carbs and boluses data pool
  var poolBolus = container.newPool().defaults()
    .id('poolBolus')
    .label('Bolus & Carbohydrates')
    .index(container.pools().indexOf(poolBolus))
    .weight(1.0);
  
  // basal data pool
  var poolBasal = container.newPool().defaults()
    .id('poolBasal')
    .label('Basal Rates')
    .index(container.pools().indexOf(poolBasal))
    .weight(1.0);

  container.arrangePools();

  var fill = require('../js/plot/fill');

  var scales = require('../js/plot/scales');

  // BG pool
  var scaleBG = scales.bg(_.where(data, {'type': 'cbg'}), poolBG);
  // set up y-axis
  poolBG.yAxis(d3.svg.axis()
    .scale(scaleBG)
    .orient('left')
    .outerTickSize(0)
    .tickValues([40, 80, 120, 180, 300]));
  // add background fill rectangles to BG pool
  poolBG.addPlotType('fill', fill(poolBG, {endpoints: container.endpoints}));

  // add CBG data to BG pool
  poolBG.addPlotType('cbg', require('../js/plot/cbg')(poolBG, {yScale: scaleBG}));

  // add SMBG data to BG pool
  poolBG.addPlotType('smbg', require('../js/plot/smbg')(poolBG, {yScale: scaleBG}));

  // bolus & carbs pool
  var scaleBolus = scales.bolus(_.where(data, {'type': 'bolus'}), poolBolus);
  var scaleCarbs = scales.carbs(_.where(data, {'type': 'carbs'}), poolBolus);
  // set up y-axis for bolus
  poolBolus.yAxis(d3.svg.axis()
    .scale(scaleBolus)
    .orient('left')
    .outerTickSize(0)
    .ticks(3));
  // set up y-axis for carbs
  poolBolus.yAxis(d3.svg.axis()
    .scale(scaleCarbs)
    .orient('left')
    .outerTickSize(0)
    .ticks(3));
  // add background fill rectangles to bolus pool
  poolBolus.addPlotType('fill', fill(poolBolus, {endpoints: container.endpoints}));

  // add carbs data to bolus pool
  poolBolus.addPlotType('carbs', require('../js/plot/carbs')(poolBolus, {yScale: scaleCarbs}));

  // add bolus data to bolus pool
  poolBolus.addPlotType('bolus', require('../js/plot/bolus')(poolBolus, {yScale: scaleBolus}));

  // basal pool
  // add background fill rectangles to basal pool
  poolBasal.addPlotType('fill', fill(poolBasal, {endpoints: container.endpoints}));

  // messages pool
  // add background fill rectangles to messages pool
  poolMessages.addPlotType('fill', fill(poolMessages, {endpoints: container.endpoints}));

  var poolGroup = d3.select('#tidelinePools');

  var initialData = container.getData(container.initialEndpoints, 'both');

  container.allData(initialData);

  // render BG pool
  poolBG(poolGroup, initialData);

  // render bolus pool
  poolBolus(poolGroup, initialData);

  // render basal pool
  poolBasal(poolGroup, initialData);

  //render messages pool
  poolMessages(poolGroup, initialData);
});