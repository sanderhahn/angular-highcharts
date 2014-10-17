# Angular Highcharts Experiment

Angular directives have a `link` callback and an `$destroy` event. I use these events to `subscribe` and `unsubscribe` to certain topics in the `pubsub` service. The main controller publishes the initial highcharts options by watching the `$viewContentLoaded` because then all the directives are ready to recieve. The Ace editor publishes changes to the `options` topic and the highcharts directive checks if the complete graph should be refreshed or that it is possible to call `setData` to only refresh the series data.

* [Try it](http://sanderhahn.github.io/angular-highcharts/)

## Links

* [Highcharts Demos](http://www.highcharts.com/demo)
