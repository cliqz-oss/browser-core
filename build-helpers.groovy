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

return this
