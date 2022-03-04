const express = require('express');
const app = express();
let server = null;

app.all('/', (req, res) => {
   res.setHeader('Content-Type', 'text/html');
   res.write('<link href="https://fonts.googleapis.com/css?family=Roboto Condensed" rel="stylesheet"> <style> body {font-family: "Roboto Condensed";font-size: 22px;} <p>Hosting Active</p>');
   res.end();
})

app.all('/uptimerobot/', (req, res) => {
   res.write('uptimerobot');
   res.end();
})
app.all('/uptimeinterval/', (req, res) => {
   res.write('uptimeinterval');
   res.end();
})

// keep online
let interval = null;
const request = require('request');
const get = require('util').promisify(request.get);

module.exports = {
   app,
   init() {
      server = app.listen(process.env.PORT || 3000, () => { console.log("HTTP Server is online!") });

      // const res = get({ url: 'https://arraydcbot.herokuapp.com/uptimeinterval/', json: true }).then(console.log)
      interval = setInterval(() => {
         const res = get({ url: 'https://arraydcbot.herokuapp.com/uptimeinterval/', json: true })
            .catch(() => { });
      }, 5 * 60 * 1000);  // check every 5min
   },
   terminate() {

      if (interval != null) {
         clearInterval(interval);
      }

      server.close(() => { console.log("HTTP Server is offline!") });
   }
};
