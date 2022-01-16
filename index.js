var express = require("express");
var logger = require("morgan");
const axios = require("axios").default;
var compression = require("compression");
require("dotenv").config();

//This function takes in latitude and longitude of two location and returns the distance between them (in km)
function calcDistance(lat1, lon1, lat2, lon2) {
  var R = 6371; // km
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var lat1 = toRad(lat1);
  var lat2 = toRad(lat2);

  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
}

// Converts numeric degrees to radians
function toRad(Value) {
  return (Value * Math.PI) / 180;
}

//coords with delta to bbox coordinates
const getBoundByRegion = (region, scale = 1) => {
  /*
   * Latitude : max/min +90 to -90
   * Longitude : max/min +180 to -180
   */
  // Of course we can do it mo compact but it wait is more obvious
  const calcMinLatByOffset = (lng, offset) => {
    const factValue = lng - offset;
    if (factValue < -90) {
      return (90 + offset) * -1;
    }
    return factValue;
  };

  const calcMaxLatByOffset = (lng, offset) => {
    const factValue = lng + offset;
    if (90 < factValue) {
      return (90 - offset) * -1;
    }
    return factValue;
  };

  const calcMinLngByOffset = (lng, offset) => {
    const factValue = lng - offset;
    if (factValue < -180) {
      return (180 + offset) * -1;
    }
    return factValue;
  };

  const calcMaxLngByOffset = (lng, offset) => {
    const factValue = lng + offset;
    if (180 < factValue) {
      return (180 - offset) * -1;
    }
    return factValue;
  };

  const latOffset = (region.latitudeDelta / 2) * scale;
  const lngD =
    region.longitudeDelta < -180
      ? 360 + region.longitudeDelta
      : region.longitudeDelta;
  const lngOffset = (lngD / 2) * scale;

  return {
    minLng: calcMinLngByOffset(region.longitude, lngOffset), // westLng - min lng
    minLat: calcMinLatByOffset(region.latitude, latOffset), // southLat - min lat
    maxLng: calcMaxLngByOffset(region.longitude, lngOffset), // eastLng - max lng
    maxLat: calcMaxLatByOffset(region.latitude, latOffset), // northLat - max lat
  };
};

const port = 5000;
var app = express();

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  res.json({ message: "Welcome to the API" });
});

app.get("/shops-in-radius-around-coordinates", function (req, res) {
  console.log(req.query);
  var lat = req.query.lat;
  var lon = req.query.lon;
  var radius = req.query.radius;

  if (!lat || !lon || !radius) {
    res.status(400).send("Required Parameters missing!");
    return;
  }
  if (radius > 50000) {
    res.status(400).send("Biggest Radius possible is 50000m!");
    return;
  }

  const options = {
    method: "GET",
    url:
      "https://overpass.openstreetmap.fr/api/interpreter?data=[out:json];node(around:" +
      radius +
      "," +
      lat +
      "," +
      lon +
      ')["shop"="cannabis"];out;',
  };

  axios
    .request(options)
    .then(function (response) {
      //console.log(response.data);
      response.data.elements.forEach(function (entry) {
        const entryLat = entry.lat;
        const entryLon = entry.lon;

        //console.log(calcDistance(entry.lat,entry.lon, lat,lon))

        var keyVar = "distance";
        var valueVar = calcDistance(entry.lat, entry.lon, lat, lon);

        entry[keyVar] = valueVar;
      });

      response.data.elements.sort(function (a, b) {
        return parseFloat(a.distance) - parseFloat(b.distance);
      });
      console.log(response.data.elements);

      res.json({ data: response.data.elements }); //maybe remove
    })
    .catch(function (error) {
      console.error(error);
    });
});

app.get("/shops-in-boundingbox", function (req, res) {
  console.log(req.query);
  const minLat = req.query.minLat;
  const minLon = req.query.minLon;
  const maxLat = req.query.maxLat;
  const maxLon = req.query.maxLon;

  if (!minLat || !minLon || !maxLat || !maxLon) {
    res.status(400).send("Required Parameters missing!");
    return;
  }
  /*
  if(maxLat - minLat > 10){
    res.status(400).send('Bounding Box too big!');
    return
  }
  */
  const options = {
    method: "GET",
    url:
      "https://overpass.openstreetmap.fr/api/interpreter?data=[out:json];node[%27shop%27=%27cannabis%27](" +
      minLat +
      "," +
      minLon +
      "," +
      maxLat +
      "," +
      maxLon +
      ");out%20body;",
  };

  axios
    .request(options)
    .then(function (response) {
      response.data.elements.sort(function (a, b) {
        return parseFloat(a.id) - parseFloat(b.id);
      });
      console.log(response.data.elements);

      res.json({ data: response.data.elements }); //maybe remove
    })
    .catch(function (error) {
      console.error(error);
    });
});

app.get("/shops-in-boundingbox-delta", function (req, res) {
  //console.log(req.query);
  const lat = req.query.lat;
  const lon = req.query.lon;
  const latitudeDelta = req.query.latitudedelta;
  const longitudeDelta = req.query.longitudedelta;

  if (!lat || !lon || !latitudeDelta || !longitudeDelta) {
    res.status(400).send("Required Parameters missing!");
    return;
  }

  regionJSON = {
    latitude: parseFloat(lat),
    longitude: parseFloat(lon),
    latitudeDelta: latitudeDelta,
    longitudeDelta: longitudeDelta,
  };

  console.log(getBoundByRegion(regionJSON));
  boundsJSON = getBoundByRegion(regionJSON);

  const options = {
    method: "GET",
    url:
      "https://overpass.openstreetmap.fr/api/interpreter?data=[out:json];node[%27shop%27=%27cannabis%27](" +
      boundsJSON.minLat +
      "," +
      boundsJSON.minLng +
      "," +
      boundsJSON.maxLat +
      "," +
      boundsJSON.maxLng +
      ");out%20body;",
  };

  axios
    .request(options)
    .then(function (response) {
      //console.log(response.data.elements)

      res.json({ data: response.data.elements });
    })
    .catch(function (error) {
      console.error(error);
    });
});

//last route
app.get("*", function (req, res) {
  res.status(404).send("Route not found");
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`App listening at http://localhost:${port}`);
});
