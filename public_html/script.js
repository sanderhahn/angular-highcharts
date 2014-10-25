/*jslint devel: true, indent: 2 */

(function () {
  "use strict";

  if (console.log === undefined) {
    console.log = function () {};
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  angular.module('app', [])

    .controller('controller', function ($scope) {

      $scope.highchartOptions = {
        title: {
          text: 'Revenue'
        },
        // xAxis: {
        //   categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        //     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        // },
        xAxis: {
          type: 'datetime'
        },
        yAxis: {
          title: {
            text: 'Revenue ($)'
          },
          plotLines: [{
            value: 0,
            width: 1,
            color: '#808080'
          }]
        },
        tooltip: {
          valuePrefix: '$'
        },
        legend: {
          layout: 'vertical',
          align: 'right',
          verticalAlign: 'middle',
          borderWidth: 0
        },
        plotOptions: {
          area: {
            fillColor: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1},
              stops: [
                [0, Highcharts.getOptions().colors[0]],
                [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
              ]
            },
            marker: {
              radius: 5
            },
            lineWidth: 5,
            threshold: null
          }
        },
        series: [{
          type: 'area',
          name: 'Amount',
          data: []
        }]
      };

      elasticEventMetrics('charge', function(counters) {
        for (var i in counters) {
          if (counters.hasOwnProperty(i)) {
            $scope[i] = counters[i];
          }
        }
      })

    })

    .directive('highchart', function () {
      return {
        restrict: 'A',
        replace: false,
        insolateScope: true,
        scope: {
          options: '=',
          series: '=',
        },
        link: function (scope, element, attrs) {
          
          scope.$watch('options', function() {
            var options = clone(scope.options);
            options.chart = options.chart || {};
            options.chart.renderTo = element[0];
            scope.chart = new Highcharts.Chart(options);
          }, true);

          scope.$watch('series', function() {
            var series = clone(scope.series);
            var chart = scope.chart;
            if (chart === undefined || series === undefined) {
              return;
            }
            chart.series[0].setData(series);
          }, true);

        }
      };
    });

})();