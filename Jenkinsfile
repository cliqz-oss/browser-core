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

node('ubuntu && docker && !gpu') {
  stage 'checkout'
  checkout scm
  def gitCommit = getGitCommit()

  stage 'docker build'
  def imgName = "cliqz/navigation-extension:latest"
  sh "docker build -t ${imgName} --build-arg UID=`id -u` --build-arg GID=`id -g` ."
  fingerprintDocker(imgName, "Dockerfile")

  timeout(60) {
    try {
      docker.image(imgName).inside() {
        // Main dependencies
        sh "rm -fr node_modules"
        sh "rm -fr bower_components"
        sh "cp -fr /home/jenkins/node_modules ."
        sh "cp -fr /home/jenkins/bower_components ."

        // Freshtab dependencies
        sh "rm -fr ./subprojects/fresh-tab-frontend/node_modules"
        sh "rm -fr ./subprojects/fresh-tab-frontend/bower_components"
        sh "cp -fr /home/jenkins/freshtab/node_modules subprojects/fresh-tab-frontend/"
        sh "cp -fr /home/jenkins/freshtab/bower_components subprojects/fresh-tab-frontend/"

        // Unit tests
        withEnv(["CLIQZ_CONFIG_PATH=./configs/browser.json"]) {
          stage 'fern install'
          sh './fern.js install'
        }

        // Build extension for integration tests
        withEnv(["CLIQZ_CONFIG_PATH=./configs/jenkins.json"]) {
          stage 'fern build'
          sh 'rm -fr build/'
          sh './fern.js build'

          stage 'fern test'
          try {
            sh 'rm -rf unittest-report.xml'
            sh './fern.js test --ci unittest-report.xml'
          } catch(err) {
            print "TESTS FAILED"
            currentBuild.result = "FAILURE"
          } finally {
            step([$class: 'JUnitResultArchiver', allowEmptyResults: false, testResults: 'unittest-report.xml'])
          }
        }

        stage 'package'
        sh "cd build; fab package:beta=True,version=${gitCommit}"
      }
    } catch (err) {
      cleanup()
      throw err
    }
    cleanup()
  }

  stage 'publish artifacts'
  archive "build/Cliqz.${gitCommit}.xpi"
  archive "Dockerfile.firefox"
  archive "run_tests.sh"

  stage 'tests'
  // Define version of firefox we want to test
  // Full list here: https://ftp.mozilla.org/pub/firefox/releases/
  def firefoxVersions = [
    "38.0.6",
    "43.0.4",
    "44.0.2",
    "47.0.1"
  ]

  // The extension will be tested on each specified firefox version in parallel
  def stepsForParallel = [:]
  for (int i = 0; i < firefoxVersions.size(); i++) {
    def version = firefoxVersions.get(i)
    stepsForParallel[version] = { build job: 'nav-ext-browser-matrix',
      parameters: [
        [$class: 'StringParameterValue', name: 'FIREFOX_VERSION', value: version],
        [$class: 'StringParameterValue', name: 'TRIGGERING_BUILD_NUMBER', value: env.BUILD_NUMBER],
        [$class: 'StringParameterValue', name: 'TRIGGERING_JOB_NAME', value: env.JOB_NAME]
      ]
    }
  }

  // Run tests in parallel
  parallel stepsForParallel
}

def fingerprintDocker(imgName, dockerfile) {
  dockerFingerprintFrom dockerfile: "./" + dockerfile, image: imgName, toolName: env.DOCKER_TOOL_NAME
}

// Clean-up workspace
def cleanup() {
  sh "rm -fr node_modules"
  sh "rm -fr bower_components"
  sh "rm -fr ./subprojects/fresh-tab-frontend/node_modules"
  sh "rm -fr ./subprojects/fresh-tab-frontend/bower_components"
}
