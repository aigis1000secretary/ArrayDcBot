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

module.exports = {
   app,
   init() {
      server = app.listen(process.env.PORT || 3000, () => { console.log("HTTP Server is online!") });
   },
   terminate() {
      server.close();
   }
};
