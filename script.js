/*jslint devel: true, indent: 2 */

(function () {
  "use strict";

  if (console.log === undefined) {
    console.log = function () {};
  }

  var defaultOptions = {
    title: {
      text: 'Monthly Average Temperature',
      x: -20
    },
    subtitle: {
      text: 'Source: WorldClimate.com',
      x: -20
    },
    xAxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    },
    yAxis: {
      title: {
        text: 'Temperature (°C)'
      },
      plotLines: [{
        value: 0,
        width: 1,
        color: '#808080'
      }]
    },
    tooltip: {
      valueSuffix: '°C'
    },
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      borderWidth: 0
    },
    series: [{
      name: 'Tokyo',
      data: [7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2, 26.5, 23.3, 18.3, 13.9, 9.6]
    }, {
      name: 'New York',
      data: [-0.2, 0.8, 5.7, 11.3, 17.0, 22.0, 24.8, 24.1, 20.1, 14.1, 8.6, 2.5]
    }, {
      name: 'Berlin',
      data: [-0.9, 0.6, 3.5, 8.4, 13.5, 17.0, 18.6, 17.9, 14.3, 9.0, 3.9, 1.0]
    }, {
      name: 'London',
      data: [3.9, 4.2, 5.7, 8.5, 11.9, 15.2, 17.0, 16.6, 14.2, 10.3, 6.6, 4.8]
    }]
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function prettyjson(obj) {
    return JSON.stringify(obj, null, '  ');
  }

  function parsejson(json) {
    try {
      return JSON.parse(json);
    } catch (err) {
      return null;
    }
  }

  function deepequal(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  angular.module('app', [])

    // https://coderwall.com/p/h72qlg

    .config(['$provide', function ($provide) {
      $provide.decorator('$rootScope', function ($delegate) {
        var emit = $delegate.$emit;

        $delegate.$emit = function () {
          console.log.apply(console, arguments);
          emit.apply(this, arguments);
        };

        return $delegate;
      });
    }])

    .controller('controller', function ($scope, pubsub) {
      window.pubsub = pubsub;
      var options = defaultOptions;

      $scope.$watch('$viewContentLoaded', function () {
        pubsub.publish('options', options, 'init');
      });
    })

    // Pub/sub service

    .service('pubsub', function () {
      var channels = {};

      var channel = function (topic) {
        channels[topic] = channels[topic] || [];
        return channels[topic];
      }

      return {
        channels: function () {
          return channels;
        },

        subscribe: function (topic, callback) {
          channel(topic).push(callback);
        },

        unsubscribe: function (topic, callback) {
          var ch = channel(topic);
          var i = ch.indexOf(callback);
          if(i > 0) {
            ch.splice(i, 1);
          }
        },

        publish: function (topic, value, origin) {
          var ch = channel(topic);
          // console.log("publish", topic, origin, value, ch);
          for(var i = 0; i < ch.length; i++) {
            ch[i](value, origin);
          }
        }
      };
    })

    // Ace directive for json editing

    .directive('ace', function (pubsub) {
      var editor;
      return {
        restrict: 'A',
        scope: {
          topic: '@'
        },
        replace: false,
        link: function (scope, element, attrs) {
          scope.editor = ace.edit(element[0]);
          scope.editor.getSession().setMode("ace/mode/json");
          scope.editor.getSession().setTabSize(2);
          scope.editor.getSession().setUseSoftTabs(true);

          var listener = function (value, origin) {
            if (origin !== 'ace') {
              scope.editor.setValue(prettyjson(value));
            }
          };

          pubsub.subscribe(scope.topic, listener);

          scope.editor.getSession().on('change', function(e) {
            var object = parsejson(scope.editor.getValue());
            if (object !== null) {
              pubsub.publish(scope.topic, object, 'ace');
            }
          });

          scope.$on('$destroy', function () {
            pubsub.unsubscribe(listener);
          });
        }
      }
    })

    // Highchart directive (attribute) that passes options through
    // and watches its series for changes

    .directive('highchart', function (pubsub) {
      // Refresh complete graph
      function initGraph(options, element) {
        options.chart = options.chart || {};
        options.chart.renderTo = element[0];
        return new Highcharts.Chart(options);
      }

      // Refresh graph series
      function updateSeries(scope, series) {
        var chart = scope.chart;
        if (chart === undefined || series === undefined) {
          return;
        }
        for(var i = 0; i < series.length; i++) {
          if (i >= chart.series.length) {
            chart.addSeries(series[i]);
          } else {
            if (chart.series[i].setData) {
              chart.series[i].setData(series[i].data);
            }
          }
        }
      }

      return {
        restrict: 'A',
        replace: false,
        insolateScope: true,
        scope: {},
        link: function (scope, element, attrs) {

          var listenOptions = function (options) {
            var _options = clone(options);

            // Only series changed: do a dynamic update
            // Name changes: do a complete update

            var series = options.series;
            var names = options.series.map(function (serie) {
              return serie.name;
            });

            delete(options.series);

            var equalOptions = deepequal(options, scope.lastOptions);
            var equalNames = deepequal(names, scope.lastNames);

            options.series = series;
            scope.lastOptions = clone(options);
            scope.lastNames = names;
            delete(scope.lastOptions.series);

            if (equalOptions && equalNames) {
              updateSeries(scope, series);
            } else {
              scope.chart = initGraph(_options, element);
            }
          };

          pubsub.subscribe('options', listenOptions);

          scope.$on('$destroy', function () {
            pubsub.unsubscribe('options', listenOptions);
          });
        }
      }
    });

}());