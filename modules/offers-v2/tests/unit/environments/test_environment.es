
import EmptyEnvironment from './empty_environment'


export default class TestContext extends EmptyEnvironment {

  queryHistory(start, end) {
    return this.testHistory;
  }


  sendApiRequest(endpoint, params) {
    var self = this;

    self.testRequest = {
      endpoint: endpoint,
      params: params
    };

    if(self.testResponse) {
      return new Promise((resolve, reject) => {
        if(self.testResponseFail) {
          reject(new Error('API request failed'));
        }
        else {
          resolve(self.testResponse);
        }
      });
    }
    else {
      return new Promise((resolve, reject) => {
        var querystring = '';
        if(params) {
          querystring = '?' + require('querystring').stringify(params)
        }

        var options = {
          hostname: '127.0.0.1',
          port: 8080,
          path: endpoint + querystring,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        };

        var req = require('http').request(options, function(res) {
          var data = '';
          res.setEncoding('utf8');
          res.on('data', function(chunk) {
            data += chunk;
          });
          res.on('end', function() {
            console.log(data)
            resolve(JSON.parse(data));
          });
        });

        req.on('error', function(err) {
          reject(err);
        });

        req.end();
      });
    }
  }

  info(msg) {
    console.log(Date.now(), msg);
  }

  error(msg) {
    console.error(Date.now(), msg);
  }

  warning(msg) {
    console.log(Date.now(), msg);
  }
}
