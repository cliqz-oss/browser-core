#!/bin/env groovy

@NonCPS def entries(m) {m.collect {k, v -> [k, v]}}

node('ubuntu && docker && !gpu') {
  stage('checkout') {
    checkout scm
  }

  def helpers = load 'build-helpers.groovy'
  def gitCommit = helpers.getGitCommit()
  def imgName = "cliqz/navigation-extension:${env.BUILD_TAG}"

  stage('docker build') {
    sh "docker build -t ${imgName} --build-arg UID=`id -u` --build-arg GID=`id -g` ."
    dockerFingerprintFrom dockerfile: './Dockerfile', image: imgName, toolName: env.DOCKER_TOOL_NAME
  }

  timeout(60) {
    docker.image(imgName).inside() {

      helpers.withCache {
        stage('fern install') {
          sh './fern.js install'
        }

        // Build extension for integration tests
        withEnv(['CLIQZ_CONFIG_PATH=./configs/jenkins.json']) {
          stage('fern build') {
            sh './fern.js build'
          }

          stage('fern test') {
            try {
              sh 'rm -rf unittest-report.xml'
              sh './fern.js test --ci unittest-report.xml'
            } catch(err) {
              print "TESTS FAILED"
              currentBuild.result = "FAILURE"
            } finally {
              step([
                $class: 'JUnitResultArchiver',
                allowEmptyResults: false,
                testResults: 'unittest-report.xml',
              ])
            }
          }
        }
      }

      stage('package') {
        sh """
          cd build
          fab package:beta=True,version=${gitCommit}
        """
      }
    }
  }

  stage('publish artifacts') {
    archive "build/Cliqz.${gitCommit}.xpi"
    archive 'Dockerfile.firefox'
    archive 'run_tests.sh'
  }

}

stage('tests') {
  // Define version of firefox we want to test
  // Full list here: https://ftp.mozilla.org/pub/firefox/releases/
  def firefoxVersions = entries([
    '38.0.6': 'https://ftp.mozilla.org/pub/firefox/releases/38.0.6/linux-x86_64/en-US/firefox-38.0.6.tar.bz2',
    '43.0.4': 'https://ftp.mozilla.org/pub/firefox/releases/43.0.4/linux-x86_64/en-US/firefox-43.0.4.tar.bz2',
    '44.0.2': 'https://ftp.mozilla.org/pub/firefox/releases/44.0.2/linux-x86_64/en-US/firefox-44.0.2.tar.bz2',
    '47.0.1': 'https://ftp.mozilla.org/pub/firefox/releases/47.0.1/linux-x86_64/en-US/firefox-47.0.1.tar.bz2',
    '49.0.2': 'http://archive.mozilla.org/pub/firefox/tinderbox-builds/mozilla-release-linux64-add-on-devel/1474711644/firefox-49.0.2.en-US.linux-x86_64-add-on-devel.tar.bz2'
  ])

  // The extension will be tested on each specified firefox version in parallel
  def stepsForParallel = [:]
  for (int i = 0; i < firefoxVersions.size(); i++) {
    def entry = firefoxVersions.get(i)
    def version = entry[0]
    def url = entry[1]
    stepsForParallel[version] = {
      build(
        job: 'nav-ext-browser-matrix-v2',
        parameters: [
          string(name: 'FIREFOX_VERSION', value: version),
          string(name: 'FIREFOX_URL', value: url),
          string(name: 'TRIGGERING_BUILD_NUMBER', value: env.BUILD_NUMBER),
          string(name: 'TRIGGERING_JOB_NAME', value: env.JOB_NAME),
        ]
      )
    }
  }

  // Run tests in parallel
  parallel stepsForParallel
}
