# Cliqz Metrics

A summary of the metrics the Cliqz add-on will record.

## Data collection

Apart from the [standard Test Pilot telemetry data](https://testpilot.firefox.com/privacy) and the [standard Cliqz telemetry data](https://testpilot.firefox.com/privacy), there is also some additional data collection specific to this Test Pilot experiment.

Metrics gathered from the Cliqz add-on will be reported to the Test Pilot add-on, which will augment that information and relay it to Firefox's telemetry system via `submitExternalPing`.

We are measuring whether the addon is enabled and whether the user visits and uses traditional search providers. The `cliqzSession` is the identifier used in Cliqz telemetry system.  Collecting this ID will allow us to look for correlations between their data set and our own. Here is the rough schema:

```
{
  event: ‘cliqzEnabled’ or ‘cliqzDisabled’ or ‘cliqzInstalled’ or ‘cliqzUninstalled’ or ‘userVisitedEngineResult’ or ‘userVisitedEngineHost’
  cliqzSession: a session string
  sessionId: a string containing the telemetry session ID
  subsessionId: a string containing the telemetry subsession ID
  contentSearch: ‘google’ or ‘yahoo’ or ‘bing’ or not present
}
```

Here is an example of the `payload` portion of a Test Pilot telemetry ping when the add-on is enabled:

```
"payload": {
  "event": "cliqzEnabled",
  "cliqzSession": "session string",
  "sessionId": "telemetry session ID",
  "subsessionId": "telemetry subsession ID"
}
```

And here is another example of the `payload` portion of a Test Pilot telemetry ping after the user has visited bing.com searching for something:

```
"payload": {
  "event": "userVisitedEngineResult",
  "cliqzSession": "session string",
  "sessionId": "telemetry session ID",
  "subsessionId": "telemetry subsession ID",
  "contentSearch": "bing"
}
```

## Data analysis

The collected data will primarily be used to answer the following questions.

### Add-on uninstall rates

_How soon do users uninstall the add-on?_

This will allow us to understand the overall user satisfaction with Cliqz.

### Add-on disabling rates

_How often do users disable the add-on?_

This will also allow us to understand the overall user satisfaction and engagement with Cliqz.

### In-content search rates

_How often do users search not through the awesomebar, but by visiting a search engine directly?_

This will allow us to understand how well the search capabilities of Cliqz are understood and whether the interactions are intuitive enough.
