

To help you create a successful pull request, here are a few points you should consider:

* **Issue/Jira ticket**: if applicable.
* **Description**: what did you change, how, why was this needed. Be as descriptive as possible.
* **Who might need to know about this?**: other people collaborating or when review is required.
* **Add Labels**: try to tag your PR with meaningful labels (e.g.: `ad-blocker`, `bug`, `core`, etc.)

To make the review process more enjoyable for everyone, also consider the following (these steps can be done *locally*):
* Test have been added to cover the changes (unit tests or integration tests)
* Unit tests are green: `./fern.js test configs/ci/unit-tests.js -l unit-node`
* Linter errors have been checked: `./fern.js lint`
* Guidelines have been read [CONTRIBUTING.md](./CONTRIBUTING.md)?
