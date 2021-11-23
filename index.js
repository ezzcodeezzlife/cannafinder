var express = require('express');
var logger = require('morgan');
const axios = require('axios').default;
var compression = require('compression')
require('dotenv').config()

const port = 5000
var app = express();

app.use(compression())

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', function(req, res) {
  res.json({ message: 'Welcome to the API' })
});

app.get('/shops-near-coordinates', function(req, res) {
  console.log(req.query);
  var lat = req.query.lat
  var lon = req.query.lon
  var radius = req.query.radius

  if(!lat || !lon || !radius) {
    res.status(400).send('Required Parameters missing!');
    return
  }

  const options = {
    method: 'GET',
    url: 'https://overpass.openstreetmap.fr/api/interpreter?data=[out:json];node(around:' + radius + ',' + lat + ',' + lon + ')["shop"="cannabis"];out;',
  };
  
  axios.request(options).then(function (response) {
    //console.log(response.data);
    
    res.json({ data: response.data.elements }) //maybe remove
  }).catch(function (error) {
    console.error(error);
  });
});

//last route
app.get('*', function(req, res){
  res.status(404).send("Route not found");
});


app.listen(process.env.PORT || 5000, () => {
    console.log(`App listening at http://localhost:${port}`)
})
