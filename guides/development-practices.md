# Development practices

Development process in Frontend department goes strongly in line with our project management practices.
It is bug tracker oriented, so all development should start with a bug tracker ticket.

The process can be summarized in few steps:

* every developer forks upstream repository,
* given a bug tracker ticket, developer creates new branch in local repository clone. Branch is named after the ticket, eg. EX-1245,
* commits to repository should have messages starting with bug tracker ticker name, eg. "EX-1234: Adding feature X",
* branch should ideally have only one commit, so work should be squashed before pushing,
* once work is done, code changes, related tests and documentation are pushed to git remote clone,
* a Github pull request is created
  * the developer assigns one or more reviewers to the PR,
  * continuous integration starts automated test suites:
    * integration tests for supported versions of Firefox, that is 56+
    * unit tests, running on `nodejs`
    * ui tests, running on headless browser,
    * mobile codebase integration tests, running on chromium,
* pull request gets merged to master if all tests are green and all review are positive,
  * changes gets rebased on top of upstream repository master branch,
* once merged, changes are released on beta channel and manually tested by quality assurance team.
