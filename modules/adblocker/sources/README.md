# adblocker

This module is a thin wrapper around [@cliqz/adblocker](https://github.com/cliqz-oss/adblocker) which
we maintain independently. There is still some magic sauce in
navigation-extension though to make sure it integrates well with other
features. In particular:

* There is custom logic to integrate with `webrequest-pipeline` to make sure we
  do not perform redundant parsing of URLs (by default the adblocker will handle
  that internally).
* More powerful updates are possible, leveraging the server-side filters
  builder. In particular, this allows to download serialized engines and diff
  updates.
* Implement custom statistics for blocked requests based on domain info and
  unified with antitracking and Ghostery stats.
