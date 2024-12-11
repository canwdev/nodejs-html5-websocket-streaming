var express = require('express');
var app = express();
const path = require('path');

app.use('/', express.static(path.join(__dirname, 'public')))

app.listen(3001, function () {
  console.log('Example app listening on port http://localhost:3001');
});