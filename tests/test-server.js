const DEBUG = false;

const fs = require('fs');
const { resolve, join } = require('path');
const url = require('url');
const createServer = require('http').createServer;

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

function log(...args) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function interpol(str, req) {
  const interpolPrefix = '{req.';
  const interpolStartIndex = str.indexOf(interpolPrefix);
  if (interpolStartIndex !== -1) {
    const interpolEndIndex = str.indexOf('}', interpolStartIndex + interpolPrefix.length);
    if (interpolEndIndex === -1) {
      return str;
    }

    const attribute = str.substring(interpolStartIndex + interpolPrefix.length, interpolEndIndex);
    if (req[attribute] !== undefined) {
      return str.replace(`${interpolPrefix}${attribute}}`, req[attribute]);
    }

    return str;
  }

  return str;
}

function normalizePath(path) {
  return resolve(path).replace(/[/]{1,}/g, '/');
}

(function createApp(port = 3000) {
  const app = express();

  app.use(bodyParser.json());
  app.use('/static', express.static(join(__dirname, 'public')));
  app.use(cookieParser());

  // Accept request to mock a particular endpoint dynamically
  let requests = {};
  let fileIndex = {};
  let mocks = {};

  app.post('/mock', async (request, response) => {
    const { path, result, headers, directories, status, timeout } = request.body;

    let endpoint = path;
    if (directories) {
      for (const dir of directories) {
        const fullDir = `${__dirname}/../${dir}`;
        log('READ', fullDir, dir);
        try {
          const files = fs.readdirSync(fullDir);
          if (!files) {
            log('EMPTY DIR', fullDir);
            return;
          }
          for (const file of files) {
            const fullRequestPath = normalizePath(`${path}/${file}`);
            const fullResourcePath = normalizePath(`${fullDir}/${file}`);
            log('FILE', fullRequestPath, fullResourcePath);
            fileIndex[fullRequestPath] = fullResourcePath;
          }
        } catch (err) {
          log('ERR', err);
        }
      }

      if (!endpoint.endsWith('/')) {
        endpoint += '/';
      }

      endpoint += '*';
    } else {
      mocks[path] = {
        headers,
        result,
        status,
        timeout,
      };
    }

    log('REGISTER', endpoint);
    response.end(JSON.stringify({ status: 'OK' }));
  });

  app.all('/info', (request, response) => {
    log('/info');
    response.end(JSON.stringify(requests));
  });

  app.all('/reset', async (request, response) => {
    log('/reset');
    requests = {};
    fileIndex = {};
    mocks = {};
    response.end('{}');
  });

  // Listen to everything and dispatch to known mocks
  app.all('/*', async (req, res) => {
    const path = req.path;
    const requestObj = clone({
      baseUrl: req.baseUrl,
      body: req.body,
      cookies: req.cookies,
      headers: req.headers,
      hostname: req.hostname,
      method: req.method,
      originalUrl: req.originalUrl,
      params: req.params,
      path: req.path,
      protocol: req.protocol,
      query: req.query,
      queryString: url.parse(req.url).query,
      url: req.url,
      xhr: req.xhr,
    });

    if (!requests[path]) {
      requests[path] = [];
    }

    log('New request', path, requestObj);
    if (mocks[path] !== undefined) {
      // Keep track of requests seen
      requests[path].push(requestObj);

      const { headers, result, status, timeout } = mocks[path];

      if (timeout) {
        await new Promise(resolveTimeout => setTimeout(resolveTimeout, timeout));
      }

      // Set resulting headers
      (headers || []).forEach(({ name, value }) => {
        const finalValue = interpol(value, requestObj);
        log('HEADER', name, finalValue);
        res.header(name, finalValue);
      });

      // Set resulting status
      if (status) {
        res.status(status);
      }

      if (result === '{Transparent.gif}') {
        log('Serve transparent gif');
        res.header('Content-Type', 'image/gif');
        res.end(Buffer.from([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0,
          0, 0, 0, 255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1,
          0, 1, 0, 0, 2, 1, 68, 0, 59]), 'binary');
      } else {
        log('Serve pre-registered response');
        res.end(interpol(result, requestObj));
      }
    } else if (fileIndex[path] !== undefined) {
      // Keep track of requests seen
      requests[path].push(requestObj);

      const finalPath = fileIndex[path];
      log('Serve file from', finalPath);
      res.sendFile(finalPath);
    } else {
      log('Not found', path);
      res.status(404).send('Not found');
    }
  });

  createServer(app).listen(port);
}());
