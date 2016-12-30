@NonCPS
def entries(m) {m.collect {k, v -> [k, v]}}

firefoxVersions = entries([
    '38.0.6': 'https://ftp.mozilla.org/pub/firefox/releases/38.0.6/linux-x86_64/en-US/firefox-38.0.6.tar.bz2',
    '43.0.4': 'https://ftp.mozilla.org/pub/firefox/releases/43.0.4/linux-x86_64/en-US/firefox-43.0.4.tar.bz2',
    '44.0.2': 'https://ftp.mozilla.org/pub/firefox/releases/44.0.2/linux-x86_64/en-US/firefox-44.0.2.tar.bz2',
    '47.0.1': 'https://ftp.mozilla.org/pub/firefox/releases/47.0.1/linux-x86_64/en-US/firefox-47.0.1.tar.bz2',
    '49.0.2': 'http://archive.mozilla.org/pub/firefox/tinderbox-builds/mozilla-release-linux64-add-on-devel/1474711644/firefox-49.0.2.en-US.linux-x86_64-add-on-devel.tar.bz2'
])

def getGitCommit() {
  def gitCommit = sh(returnStdout: true, script: "git rev-parse HEAD").trim()
  def parents = sh(returnStdout: true, script: "git show --format='%P' $gitCommit | head -1").trim()
  def parentCount = sh(returnStdout: true, script: "echo $parents | tr ' ' '\n' | wc -l").trim()

  if (parentCount == "1") {
    // one parent means there was a fast-forward merge
    return gitCommit
  } else {
    // there was merge commit, check it parent
    return sh(returnStdout: true, script: "echo $parents | tr ' ' '\n' | head -1").trim()
  }
}

def withCache(Closure body=null) {
  def cleanCache = {
    sh 'rm -fr node_modules'
    sh 'rm -fr bower_components'
    sh 'rm -fr ./subprojects/fresh-tab-frontend/node_modules'
    sh 'rm -fr ./subprojects/fresh-tab-frontend/bower_components'
  }

  try {
    cleanCache()
    // Main dependencies
    sh 'cp -fr /home/jenkins/node_modules .'
    sh 'cp -fr /home/jenkins/bower_components .'

    // Freshtab dependencies
    sh 'cp -fr /home/jenkins/freshtab/node_modules subprojects/fresh-tab-frontend/'
    sh 'cp -fr /home/jenkins/freshtab/bower_components subprojects/fresh-tab-frontend/'

    body()
  } finally {
    cleanCache()
  }
}

def reportStatusToGithub(String name, String commit, String pending, Closure test) {
  setGithubCommitStatus(name, 'pending', pending, commit)
  def report = ''
  try {
    report = test()
  } catch(err) {
    setGithubCommitStatus(name, 'error', err, commit)
    return
  }
  if (report == '') {
    setGithubCommitStatus(name, 'error', 'no results found', commit)
  } else {
    try {
      // check if there are no errors
      def status = sh(returnStatus: true, script: 'grep -v \'failures="0" errors="0"\' ' + report)

      if (status == 0) {
        setGithubCommitStatus(name, 'success', 'finished without errors', commit)
      } else {
        throw new Exception()
      }
    } catch (err) {
      setGithubCommitStatus(name, 'failure', 'some tests failed', commit)
    }
  }
}

def setGithubCommitStatus(context, status, description, COMMIT_ID) {
  withCredentials([[$class: 'StringBinding', credentialsId: '5d3e0a3c-2490-491b-8a67-aa5eab2f27f2', variable: 'GITHUB_TOKEN']]) {
    sh """
      curl -XPOST \
           -H "Authorization: token \$GITHUB_TOKEN" \
           https://api.github.com/repos/cliqz/navigation-extension/statuses/${COMMIT_ID} \
           -d '{ \
                "state": "${status}", \
                "target_url": "${env.BUILD_URL}", \
                "description": "${description}", \
                "context": "${context}" \
              }'
    """
  }
}

return this
