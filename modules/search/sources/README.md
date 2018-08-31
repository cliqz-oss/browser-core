# Search

This documentation is work in progress.

Handles search. Also known as "mixer".

# Terminology

* **Provider**
* **Operator**
* **Session**

# Dataflow

Based on RxJS.

# Architecture

## Providers

## Operators
The following structure is a proposal. Not all current operaters follow it
(yet).
* `operators/streams/` take as input an observable (independent of data type).
* `operators/responses/` take as input a response (containing results).
* `operators/results/` take as input a result (containing links).
* `operators/links/` *to be deleted*.
