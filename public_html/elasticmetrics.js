(function () {
  "use strict";

  window.termCondition = function (field, value) {
    var condition = {};
    condition[field] = value;
    return {
      term: condition
    };
  };

  window.rangeFromTo = function (field, from, to) {
    var condition = {};
    condition[field] = {
      from: from,
      to: to
    };
    return {
      range: condition
    };
  };

  window.andFilter = function (ands) {
    return {
      and: ands
    };
  };

  window.aggregate = function (field, agg) {
    var name = [agg, field].join('_');
    var fieldAggregate = {};
    fieldAggregate[agg] = {
      field: field
    };
    return fieldAggregate;
  };

  window.filterAggregate = function (filter, aggs) {
    return {
      filter: filter,
      aggs: aggs
    };
  };

  window.dateHistogramAggregate = function (field, interval, aggs) {
    return {
      date_histogram: {
        field: field,
        interval: interval,
        min_doc_count: 0
      },
      aggs: aggs
    };
  };

  var periods = '30d 60d 3M 6M 9M 1y'.split(' ');
  window.periodsAggregates = function (aggs) {
    var _aggs = {};
    for(var i = 0; i < periods.length; i++) {
      var period = periods[i];
      _aggs['past'+period] = filterAggregate(
        rangeFromTo('timestamp', 'now-'+period, 'now'), aggs);
      _aggs['prev'+period] = filterAggregate(
        rangeFromTo('timestamp', 'now-'+period+'-'+period, 'now-'+period), aggs);
    }
    return _aggs;
  };

  window.detailQuery = function (event) {
    var amountAggregate = {
      amount: aggregate('amount', 'sum')
    };
    var aggregates = periodsAggregates(amountAggregate);
    aggregates['histo30d'] = filterAggregate(
      rangeFromTo('timestamp', 'now-30d', 'now'),
        {histo: dateHistogramAggregate('timestamp', '1d', amountAggregate)});
    return {
      size: 0,
      aggs: {
        charge: filterAggregate(
          termCondition('event', event), aggregates)
      }
    };
  };

  function path(obj, paths) {
    if (typeof(paths) === 'string') {
      paths = paths.split('.');
    }
    var here = obj;
    while(paths.length > 0) {
      var path = paths.shift();
      here = here[path];
    }
    return here;
  }

  // Compose a number of function together by applying their results to the next one
  // Each function must return an array of results that are the next function arguments

  function compose(fun1, fun2 /*, ... */) {
    var funcs = Array.prototype.slice.call(arguments);
    return function() {
      var args = Array.prototype.slice.call(arguments);
      for(var i = 0; i < funcs.length; i++) {
        args = funcs[i].apply(null, args);
      }
      return args;
    }
  }

  function prevPerc(now, prev) {
    if (prev === 0) {
      return '--';
    }
    return Math.round((prev - now) / prev * 1000) / 10;
  }

  // Based upon detail view of: https://demo.baremetrics.io/stats/net_revenue

  var absolutes = '30d 60d 3M 1y'.split(' ');
  var growths = '30d 60d 3M 6M 9M 1y'.split(' ');
  function postProcessDetails(response) {
    // console.log(response);
    var charge = path(response, 'aggregations.charge');
    var counters = {};

    for(var i = 0; i < absolutes.length; i++) {
      var absolute = absolutes[i];
      counters['past'+absolute] = path(charge, 'past'+absolute+'.amount.value');
    }

    for(var i = 0; i < growths.length; i++) {
      var growth = growths[i];
      counters['growth'+growth] = prevPerc(
        path(charge, 'past'+growth+'.amount.value'),
        path(charge, 'prev'+growth+'.amount.value'));
    }

    counters['histo30d'] = path(charge, 'histo30d.histo.buckets').map(function (item) {
      return [item.key, item.amount.value];
    });

    return [counters];
  }

  var log = console.log.bind(console);
  var error = console.error.bind(console);

  window.elasticEventMetrics = function (event, callback) {
    var query = detailQuery(event);
    // console.log(query);
    ajax('POST', 'http://localhost:9200/stream/event/_search',
      query,
      compose(postProcessDetails, callback),
      error);
  }

})();