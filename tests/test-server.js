const fs = require('fs');
const resolve = require('path').resolve;
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');

const port = 3000;
const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(compression());

// Accept request to mock a particular endpoint dynamically
let requests = {};
let fileIndex = {};
app.post('/mock', function mock(request, response) {
  console.log('MOCK', JSON.stringify(request.body));
  const { path, result, headers, directories, status } = request.body;
  if (path) {
    let endpoint = path;
    if (directories) {
      fileIndex = {};
      directories.forEach((dir) => {
        const fullDir = __dirname + '/../' + dir;
        console.log('READ', fullDir, dir);
        fs.readdir(fullDir, (err, files) => {
          console.log('ERR', err);
          if (!files) {
            console.log('EMPTY DIR', fullDir);
            return;
          }
          files.forEach((file) => {
            const fullPath = fullDir + '/' + file;
            console.log('FILE', fullPath);
            fileIndex[file] = fullPath;
          });
        });
      });

      if (!endpoint.endsWith('/')) {
        endpoint += '/';
      }

      endpoint += '*';
    }

    console.log('REGISTER', endpoint);
    app.all(endpoint, function dynamicRoute(req, res) {
      console.log(`${path} request`, {
        url: req.url,
        headers: req.headers,
        body: req.body
      });

      if (!requests[path]) {
        requests[path] = [];
      }

      // Keep track of headers, body
      requests[path].push({
        headers: JSON.parse(JSON.stringify(req.headers)),
        body: req.body,
      });

      (headers || []).forEach(({ name, value }) => {
        console.log('HEADER', name, value);
        res.header(name, value);
      });

      if (status) {
        res.status(status);
      }

      // Returns expected result
      //
      if (directories) {
        let fileName = req.url.substring(path.length).split('?')[0];
        if (fileName.startsWith('/')) {
          fileName = fileName.substring(1);
        }
        const parts = fileName.split('/');

        console.log(fileName);
        const finalPath = resolve(fileIndex[parts[0]] + '/' + parts.slice(1).join('/'));
        console.log('Serve', finalPath);
        res.sendFile(finalPath);
      } else {
        console.log('Serve', result);
        res.end(result);
      }
    });
  }

  response.end(JSON.stringify({ status: 'OK' }));
});


app.all('/info', function info(request, response) {
  console.log('/info');
  const result = JSON.stringify(requests);
  console.log('Summary', result);
  response.end(result);
});


app.all('/reset', function reset(request, response) {
  console.log('/reset');
  // Delete dynamic routes
  const routes = app._router.stack;
  const removeMiddlewares = function removeMiddlewares(route, i, routes) {
    switch (route.handle.name) {
      case 'dynamicRoute':
        routes.splice(i, 1);
    }
    if (route.route) {
      route.route.stack.forEach(removeMiddlewares);
    }
  }
  routes.forEach(removeMiddlewares);

  // Return a summary of hits
  const result = JSON.stringify(requests);
  requests = {};
  response.end(result);
});


const server = app.listen(port, () => {
  const host = server.address().address;
  console.log(`Example app listening at http://${host}:${port}`);
});
