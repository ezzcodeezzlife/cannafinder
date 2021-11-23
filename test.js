var axios = require("axios").default;

var options = {
  method: 'GET',
  url: 'http://localhost:5000/shops-near-coordinates',
  params: {lat: '52.377075', lon: '4.902427', radius: '100'},
  headers: {
    'x-rapidapi-host': 'cannatest.p.rapidapi.com',
    'x-rapidapi-key': ''
  }
};

axios.request(options).then(function (response) {
	console.log(response.data);
}).catch(function (error) {
	console.error(error);
});