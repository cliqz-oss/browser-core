#!/bin/env groovy

def gitCommit = ''


node('ubuntu && docker && !gpu') {
  stage('checkout') {
    checkout scm
  }

  helpers = load 'build-helpers.groovy'

  props = helpers.entries([
    'DOCKER_REGISTRY_URL': 'https://141047255820.dkr.ecr.us-east-1.amazonaws.com',
    'AWS_REGION': 'us-east-1'
  ])

  params = []

  for (int i = 0; i < props.size(); i++) {
    def prop  = props.get(i)
    def propName = prop[0]
    def propValue = prop[1]
    def binding = getBinding()

    if (!binding.hasVariable(propName)) {
      binding.setVariable(propName, propValue)
    }

    params.push(
      string(defaultValue: propValue, description: '', name: propName)
    )
  }

  properties([
    disableConcurrentBuilds(),
    parameters(params)
  ])

  if (helpers.hasNewerQueuedJobs()) {
    error("Has Jobs in queue, aborting")
  }

  if (helpers.hasWipLabel()) {
    error "Branch is wip"
  }
  
  gitCommit = helpers.getGitCommit()

  // stash dockerfile for use on other nodes without checkout
  stash name: "test-helpers", includes: "build-helpers.groovy,run_tests_testem.sh"

  def imgName = "navigation-extension/base"

  sh "`aws ecr get-login --region=$AWS_REGION`"

  docker.withRegistry(DOCKER_REGISTRY_URL) {
    timeout(60) {
      def image = docker.image(imgName)
      image.pull()
      docker.image(image.imageName()).inside() {

        helpers.withCache {
          stage('fern install') {
            sh './fern.js install'
          }

          // mobile build and stash
          withEnv(['CLIQZ_CONFIG_PATH=./configs/mobile-dev.json']) {
            stage('fern build mobile') {
              sh './fern.js build > /dev/null'
              // stage built files for mobile testem test
              stash name: "mobile-testem-build", includes: "bower_components/,build/,tests/,testem.json"
            }
          }

          // desktop build & test
          withEnv(['CLIQZ_CONFIG_PATH=./configs/jenkins.json']) {
            stage('fern build desktop') {
              sh './fern.js build > /dev/null'
              // stage built files for mobile testem test
              stash name: "content-testem-build", includes: "bower_components/,build/,tests/,testem.json"
            }

            stage('fern test') {
              sh 'rm -rf unittest-report.xml'
              try {
                sh './fern.js test --ci unittest-report.xml > /dev/null'
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

          stage('fresh-tab-frontend tests') {
            helpers.reportStatusToGithub 'fresh-tab-frontend', gitCommit, "pending", {
              try {
                sh 'rm -rf subprojects/fresh-tab-frontend/ember-report.xml'
                sh '''
                  cd subprojects/fresh-tab-frontend
                  ember test ci --silent > ember-report.xml
                '''
                return 'subprojects/fresh-tab-frontend/ember-report.xml'
              } catch(err) {
                print "Ember TESTS FAILED"
                currentBuild.result = "FAILURE"
                throw err
              } finally {
                step([
                  $class: 'JUnitResultArchiver',
                  allowEmptyResults: false,
                  testResults: 'subprojects/fresh-tab-frontend/ember-report.xml',
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
  }

  stage('publish artifacts') {
    archive "build/Cliqz.${gitCommit}.xpi"
    archive 'run_tests.sh'
  }

}

stage('tests') {
  // Define version of firefox we want to test
  // Full list here: https://ftp.mozilla.org/pub/firefox/releases/
  // The extension will be tested on each specified firefox version in parallel
  def stepsForParallel = [:]
  def firefoxVersions = helpers.firefoxVersions

  for (int i = 0; i < firefoxVersions.size(); i++) {
    def entry = firefoxVersions.get(i)
    def version = entry[0]
    def url = entry[1]
    stepsForParallel['Firefox ' + version] = {
      build(
        job: 'cliqz/navigation-extension/nav-ext-browser-matrix-v3',
        parameters: [
          string(name: 'FIREFOX_VERSION', value: version),
          string(name: 'TRIGGERING_BUILD_NUMBER', value: env.BUILD_NUMBER),
          string(name: 'TRIGGERING_JOB_NAME', value: env.JOB_NAME),
        ]
      )
    }
  }

  stepsForParallel['testem mobile'] = {
    node('ubuntu-docker-gpu') {
      def HOST = sh(returnStdout: true, script: '/sbin/ifconfig eth0 | grep "inet addr:" | cut -d: -f2 | awk \'{ print $1}\'').trim()
      def NUMBER = env.BUILD_NUMBER.padLeft(5, "00000")
      def VNC_PORT = "20${NUMBER[-3..-1]}"

      // load files for test into workspace
      unstash "mobile-testem-build"
      unstash "test-helpers"

      def helpers = load 'build-helpers.groovy'
      def imgName = "navigation-extension/testem"

      sh "`aws ecr get-login --region=$AWS_REGION`"

      docker.withRegistry(DOCKER_REGISTRY_URL) {
        timeout(20) {
          helpers.reportStatusToGithub 'testem mobile', gitCommit, "VNC $HOST:$VNC_PORT", {
            def image = docker.image(imgName)
            image.pull()
            docker.image(image.imageName()).inside("-p $VNC_PORT:5900 --device /dev/nvidia0 --device /dev/nvidiactl") {
              sh 'rm -rf report.xml'
              try {
                sh './run_tests_testem.sh'
                return 'report.xml'
              } catch(err) {
                print "TESTS FAILED"
                currentBuild.result = "FAILURE"
                throw err
              } finally {
                step([
                  $class: 'JUnitResultArchiver',
                  allowEmptyResults: false,
                  testResults: 'report.xml',
                ])
              }
            }
          }
        }
      }
    }
  }

  stepsForParallel['testem desktop content'] = {
    node('ubuntu-docker-gpu') {
      def HOST = sh(returnStdout: true, script: '/sbin/ifconfig eth0 | grep "inet addr:" | cut -d: -f2 | awk \'{ print $1}\'').trim()
      def NUMBER = env.BUILD_NUMBER.padLeft(5, "00000")
      def VNC_PORT = "21${NUMBER[-3..-1]}"

      // load files for test into workspace
      unstash "content-testem-build"
      unstash "test-helpers"

      def helpers = load 'build-helpers.groovy'
      def imgName = "navigation-extension/testem"

      sh "`aws ecr get-login --region=$AWS_REGION`"

      docker.withRegistry(DOCKER_REGISTRY_URL) {
        timeout(20) {
          helpers.reportStatusToGithub 'testem desktop content', gitCommit, "VNC $HOST:$VNC_PORT", {
            def image = docker.image(imgName)
            image.pull()
            docker.image(image.imageName()).inside("-p $VNC_PORT:5900 --device /dev/nvidia0 --device /dev/nvidiactl") {
              sh 'rm -rf report.xml'
              try {
                sh './run_tests_testem.sh'
                return 'report.xml'
              } catch(err) {
                print "TESTS FAILED"
                currentBuild.result = "FAILURE"
                throw err
              } finally {
                step([
                  $class: 'JUnitResultArchiver',
                  allowEmptyResults: false,
                  testResults: 'report.xml',
                ])
              }
            }
          }
        }
      }
    }
  }

  parallel stepsForParallel
}
