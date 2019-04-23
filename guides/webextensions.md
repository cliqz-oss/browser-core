# Webextensions FAQ

**Question:** Which storage option to use in webextension?

**Answer:**

There are only two storage options that we should rely upon:

* *indexed_db* - in use cases that requires search
* *chrome.storage* - if you need to persist "large" data

If you don't fall into any of those use cases you are free to choose whatever you like.

Note that currently *chrome.storage* in Firefox is crippled and should not be used too extensively.

Any wrapper or top of them is fine to use. So `Dexie` is welcome.
