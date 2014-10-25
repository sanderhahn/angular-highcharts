(function () {
  "use strict";

  var EVENTS = 1000;

  function random(max) {
    return Math.floor(Math.random() * max);
  }

  function days(n) {
    return n * 24 * 60 * 60 * 1000;
  }

  window.ajax = function (method, url, params, ok, error) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open(method, url, false);
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === 4) {
        var response = xmlhttp.responseText;
        var contentType = xmlhttp.getResponseHeader('content-type').split(';')[0];
        if (contentType === 'application/json') {
          response = JSON.parse(response);
        }
        if (xmlhttp.status === 200) {
          ok(response);
        } else {
          error(response);
        }
      }
    };
    if (typeof(params) !== 'string') {
      params = JSON.stringify(params);
    }
    xmlhttp.send(params);
  }

  window.createStream = function () {

    var now = new Date();
    now = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    var charges = [];

    for(var i = 0; i < EVENTS; i++) {
      var timestamp = now.getTime() - days(random(365*2));
      charges.push({
        timestamp: new Date(timestamp).toISOString(),
        event: 'charge',
        amount: random(1240) + 10,
        client_id: random(300) + 1,
      });
    }

    var chargebacks = [];
    for(var i = 0; i < EVENTS/10; i++) {
      var pick = charges[Math.floor(Math.random() * charges.length)];
      var timestamp = Date.parse(pick.timestamp) + days(random(14)+3);
      chargebacks.push({
        timestamp: new Date(timestamp).toISOString(),
        event: 'chargeback',
        amount: -pick.amount,
        client_id: pick.client_id
      });
    }

    var failedcharges = [];
    for(var i = 0; i < EVENTS/10; i++) {
      var pick = charges[Math.floor(Math.random() * charges.length)];
      var timestamp = Date.parse(pick.timestamp) - days(random(14)+3);
      failedcharges.push({
        timestamp: new Date(timestamp).toISOString(),
        event: 'failedcharge',
        amount: pick.amount,
        client_id: pick.client_id
      });
    }

    var refunds = [];
    for(var i = 0; i < EVENTS/10; i++) {
      var pick = charges[Math.floor(Math.random() * charges.length)];
      var timestamp = Date.parse(pick.timestamp) + days(random(14)+3);
      refunds.push({
        timestamp: new Date(timestamp).toISOString(),
        event: 'refund',
        amount: -pick.amount,
        client_id: pick.client_id
      });
    }

    var batch = charges.concat(chargebacks).concat(failedcharges).concat(refunds);

    batch = batch.map(function (op, i) {
      return JSON.stringify({
          index: {
            _index: "stream",
            _type: "event",
            _id: i+1
          }
        }) + "\n" +
        JSON.stringify(op) + "\n";
    });

    var log = console.log.bind(console);
    var error = console.error.bind(console);

    ajax("DELETE", "http://localhost:9200/stream", null, log, error);

    ajax("POST", "http://localhost:9200/stream", {
      "mappings" : {
        "event" : {
          "dynamic": "strict",
          "properties" : {
            "timestamp" : {
              "type" : "date"
            },
            "event": {
              "type": "string"
            },
            "amount": {
              "type": "float"
            },
            "customer_id": {
              "type": "integer"
            }
          }
        }
      }
    }, log, error);

    ajax("POST", "http://localhost:9200/_bulk", batch.join(""), log, error);
  };

})();
