# History Search

History search is a new search provider for history. Since the WebExtensions history search API is not optimal,
we introduce this new search provider with aim to improve the history search in terms of speed and accuracy.
It also enables you to perform fuzzy search.

# How it works
All the search logics will happen from the file history_bg.wasm. This wasm file is compiled and exported from Rust. Source code is available here (https://github.com/cliqz/history/).

There are 3 main functions exported from this wasm file:
1. Add history items: The visits (i.e. history items) fetched from WebExtensions API will be sent to this wasm once in the beginning. A visit will contain following information: url, title, visit count and last visit time.
2. Update history item: If user visits a page (could be a new page or an existing page), we will add/update this visit info (url, title, visit count, last visit time) into the wasm.
3. Search from history: This function receives a query, performs matching/ranking and return a set of results relevant to the query.
4. (To be added) Remove from history: whenever user removes a visit from their browser history, we remove it from wasm file. We didn't handle the case when user removes all history.

# Dependencies
This module doesn't have any dependency so it will work on both Firefox and Google Chrome.

# Technologies
WebAssembly, Web Worker
