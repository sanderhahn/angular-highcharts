# Angular Highcharts Experiment

Angular directives have a `link` callback and an `$destroy` event. I use these events to `subscribe` and `unsubscribe` to certain topics in the `pubsub` service. The main controller publishes the initial highcharts options by watching the `$viewContentLoaded` because then all the directives are ready to recieve. The Ace editor publishes changes to the `options` topic and the highcharts directive checks if the complete graph should be refreshed or that it is possible to call `setData` to only refresh the series data.

* [Try it out](http://sanderhahn.github.io/angular-highcharts/)

# Baremetrics with ElasticSearch

Vagrant that installs ElasticSearch and the Marvel plugin. Visit `localhost:8080` and press the `Create Stream` button to add some random events. The view design is based upon the [Baremetrics.io Net Revenue](https://demo.baremetrics.io/stats/net_revenue). The query is build using some helper functions in the `elasticmetrics.js` source.

* Stream of events with amounts aggregated in a histogram.
* Calculates aggregates over periods and percentage changes.

![Revenue Graph](http://sanderhahn.github.io/angular-highcharts/images/revenue.png?1)

## Links

* [Highcharts Demos](http://www.highcharts.com/demo)
