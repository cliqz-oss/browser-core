# Release lifecycle

Release channels:

* beta - rolling stage, built from `upstream master`,
* pre-release - rolling stage, replaced with release once stable,
* release - versioned, built from tags.

Extension release process description:

* Each release version is planned using bug tracker tickets.
* Work is split into release sprints, each having a release date and more or less fixed list of tickets.
* Each release sprint starts with increasing version number.
* During release sprint features and bug fixes land in beta channel.
* Once all tickets are closed, a feature freeze is started - that means, repository `upstream master` is forked to release branch on which we start stabilization.
* Release branch gets built into pre-release build with every bug fix landing in the branch.
* Quality control team test pre-release for regression and all tickets included in given release. That results in new "bug" tickets added to bug tracker.
* Quality control iterate over release branch until all know bugs are fixed or assigned to next release.
* Stabilization is finished once there are not more tickets left in bug tracker.
* A tag is put on the release branch and release builds are created.
* Release builds are sent for AMO review. Fixes get applied resulting in new builds.
* Once accepted by AMO reviewers, the release tag is being open-sourced.

Released AMO versions are base for Cliqz browser releases, which have to be independently stabilized.