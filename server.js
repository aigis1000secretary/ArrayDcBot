const express = require('express');
const app = express();
let server = null;

app.all('/', (req, res) => {
   res.set('Content-Type', 'text/html');
   let response = '<link href="https://fonts.googleapis.com/css?family=Roboto Condensed" rel="stylesheet">' +
      '<style> body {font-family: "Roboto Condensed";font-size: 16px;} </style>' +
      '<p>Hosting Active</p>' +
      `<p>Now: ${new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' })}</p>`;
   res.send(response);
})

app.all('/uptimeinterval/', (req, res) => {
   res.write('uptimeinterval');
   res.end();
})

// keep online
let interval = null;
const request = require('./modules/undici-request.js');
const get = require('util').promisify(request.get);

module.exports = {
   app,
   init() {
      const port = process.env.PORT || 3000;
      server = app.listen(port, () => {
         let nowDate = new Date(Date.now()).toLocaleString('en-ZA', { timeZone: 'Asia/Taipei' });
         console.log(`HTTP Server is online, port: ${port}! ${nowDate}`);
      });

      // const res = request.get({ url: `${process.env.HOST_URL}/uptimeinterval/` }).then(console.log)
      interval = setInterval(() => request.get({ url: `${process.env.HOST_URL}/uptimeinterval/` }).catch(() => { }), 5 * 60 * 1000);  // check every 5min
   },
   terminate() {

      if (interval != null) {
         clearInterval(interval);
      }

      server.close(() => { console.log("HTTP Server is offline!") });
   }
};
