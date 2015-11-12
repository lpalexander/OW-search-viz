var allData;

// Lat/Long coordinates of Boston
var center = [42.36, -71.08];

// Setup for the map
var osmUrl = 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
osmAttrib = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
osm = L.tileLayer(osmUrl, {maxZoom: 14, minZoom: 12, attribution: osmAttrib});

// Create the map
var map = new L.Map('map', {layers: [osm], center: new L.LatLng(center[0], center[1]), zoom: 13, scrollWheelZoom: false});

var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

var garageMarkerOptions = {
  radius: 4,
  fillColor: '#51A601',
  color: '#51A601',
  weight: 1,
  opacity: 0.6,
  fillOpacity: 0.6
};

var customGarageLayer = L.geoJson(null, {
  pointToLayer: function(feature, latlng) {
    return L.circleMarker(latlng, garageMarkerOptions);
  }
});

omnivore.csv('data/locations.csv', null, customGarageLayer).addTo(map);

// Options for the Hexbin
var options = {
  radius : 40, // Size of the hexagons
  opacity: 0.55, // Default opacity of the hexagons
  duration: 500, // Transition duration for animations

  // Accessor functions for lat/long
  lng: function(d){
    return d[0];
  },

  lat: function(d){
    return d[1];
  },

  // Value accessor function for deriving the color of the hexagons
  value: function(d){
    return d.length; },

  // Override the extent of the value domain
  valueFloor: undefined,
  valueCeil: undefined
};

// Create the hexlayer
var hexLayer = L.hexbinLayer(options).addTo(map);
d3.select('.leaflet-zoom-hide').style({'z-index': 10});

function getAllData() {
  d3.csv('data/search_vehicles.csv', function(data) {
    allData = data.map(function(d) {
      return [d.longitude, d.latitude, d.hour, d.dayofweek];
    });
    update();
  });
}

function formatHour(hour) {
  return Number(hour).toFixed(1);
}

function getHourFromForm() {
  return formatHour(d3.select("#hour").property("value"));
}

function getDayTypeFromForm() {
  return d3.select('input[name="day"]:checked').property("value");
}

// update the elements
function update(hour, day, delay) {
  hour = typeof hour !== 'undefined' ? hour : getHourFromForm();
  day = typeof day !== 'undefined' ? day : getDayTypeFromForm();
  delay = typeof delay !== 'undefined' ? delay : 0;
  d3.select("#hour").property("value", hour);
  d3.select("#" + day).property("checked", true);
  mapData(hour, day, delay);
}

// generateData function
function mapData(hour, day, delay) {
  var hourlyData = allData.filter(function(d) {
    if (d[2] == hour && d[3] == day) { return d; }
  });

  // Set the colorScale range - colorScale() returns a reference to the scale used to map the color of each hexbin
  if (day=='weekday') { hexLayer.colorScale().range(['lightyellow', 'firebrick']); }
  if (day=='weekend') { hexLayer.colorScale().range(['lightcyan', 'darkblue']); }

  hexLayer.data(hourlyData);

  d3.selectAll('path.hexbin-hexagon').on('click', function(d,i) {
      d3.select(this).transition().duration(300).style("opacity", 1);
      div.style("visibility","visible");
      div.transition().duration(300)
      .style("opacity", 1)
      if (day=='weekday') { div.text('searches: '+Math.round(d.length/90.0*100)/100)
      .style("left", (d3.event.pageX)  + "px")
      .style("top", (d3.event.pageY) + "px"); }
      if (day=='weekend') { div.text('searches: '+Math.round(d.length/36.0*100)/100)
      .style("left", (d3.event.pageX)  + "px")
      .style("top", (d3.event.pageY) + "px"); }
  });
  d3.selectAll('path.hexbin-hexagon').on("mouseout", function (d) {
    d3.select(this).style("opacity", 0.55);
    div.style("visibility", "hidden")
  });
  setTimeout(function() {
    timeString = String(Math.floor(hour)) + ':' +
      ('0' + String(hour % 1 * 60)).slice(-2);
    d3.select("#hour-value").text(timeString);
  }, delay);
};
var animationActive = false;
function animate() {
  if (animationActive) {
    clearInterval(int);
  } else {
    originalHour = Number(getHourFromForm());
    animationHour = originalHour;
    int = setInterval(function() {
      animationHour += 0.5;
      if (animationHour == 24) { animationHour = 0 }
      if (animationHour !== originalHour) {
        update(animationHour, getDayTypeFromForm(), 300);
      } else {
        clearInterval(int);
        update(originalHour, getDayTypeFromForm(), 300);
      }
    }, 500)
  }
  animationActive = !animationActive;
}


$(function() {
  getAllData();
  d3.select('#animate').on('click', animate);
  // update when hour slider is changed
  d3.select("#hour").on("input", function() {
    update(formatHour(+this.value), getDayTypeFromForm());
  });
  // update when day type is changed
  d3.selectAll('input[name="day"]').on("change", function() {
    update(getHourFromForm(), getDayTypeFromForm());
  });
  map.on('viewreset', function() {
    mapData(getHourFromForm(), getDayTypeFromForm());
  });
});
