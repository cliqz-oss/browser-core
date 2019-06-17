#!/bin/env groovy
import groovy.time.*

@Library('cliqz-shared-library@v1.2') _

properties([
    [$class: 'JobRestrictionProperty'],
    parameters([
        string(name: 'DOCKER_REGISTRY_URL', defaultValue: '141047255820.dkr.ecr.us-east-1.amazonaws.com'),
        string(name: 'AWS_REGION', defaultValue: 'us-east-1'),
    ]),
])

def matrix = [
    'unit tests': [
        'gpu': false,
        'config': 'configs/ci/unit-tests.js',
        'testParams': '-l unit-node',
    ],
    'amo': [
        'gpu': true,
        'config': 'configs/ci/amo.js',
        'testParams': '-l firefox-web-ext --firefox ~/firefox60/firefox/firefox',
    ],
    'browser: content': [
        'gpu': true,
        'config': 'configs/ci/browser.js',
        'testParams': '-l chromium',
    ],
    'cliqz-beta': [
        'gpu': true,
        'config': 'configs/ci/browser.js',
        'testParams': '-l firefox-web-ext --firefox ~/cliqzBeta/cliqz/cliqz',
    ],
    'cliqz-stable': [
        'gpu': true,
        'config': 'configs/ci/browser.js',
        'testParams': '-l firefox-web-ext --firefox ~/cliqzStable/cliqz/cliqz',
    ],
    'firefox 62': [
        'gpu': true,
        'config': 'configs/ci/browser.js',
        'testParams': '-l firefox-web-ext --firefox ~/firefox62/firefox/firefox',
    ],
    'firefox 62 offers': [
        'gpu': true,
        'config': 'configs/ci/offers.js',
        'testParams': '-l firefox-web-ext --firefox ~/firefox62/firefox/firefox',
    ],
    'firefox 66 offers': [
        'gpu': true,
        'config': 'configs/ci/offers.js',
        'testParams': '-l firefox-web-ext --firefox ~/firefox66/firefox/firefox',
    ],
    'firefox 66': [
        'gpu': true,
        'config': 'configs/ci/browser.js',
        'testParams': '-l firefox-web-ext --firefox ~/firefox66/firefox/firefox',
    ],
    'firefox beta': [
        'gpu': true,
        'config': 'configs/ci/browser.js',
        'testParams': '-l firefox-web-ext --firefox ~/firefoxBeta/firefox/firefox',
    ],
    'firefox nightly': [
        'gpu': true,
        'config': 'configs/ci/browser.js',
        'testParams': '-l firefox-web-ext --firefox ~/firefoxNightly/firefox/firefox',
        'ignoreFailure': true
    ],
    'cliqz-tab': [
        'gpu': true,
        'config': 'configs/ci/cliqz-tab.js',
        'testParams': '-l chromium-headless',
    ],
    'mobile-cards': [
        'gpu': true,
        'config': 'configs/ci/mobile-cards.js',
        'testParams': '-l firefox-web-ext --firefox ~/firefox60/firefox/firefox',
    ],
    'ghostery': [
        'gpu': false,
        'config': 'configs/ci/ghostery.js',
        'testParams': '-l ghostery-headless',
    ],
    'cliqz-ios': [
        'gpu': false,
        'config':'configs/ci/cliqz-ios.js',
        'testParams': '-l react-native',
    ],
]

String triggeringCommitHash = github.getCommitHash()
String currentCommitHash
String codeDockerImage

def setGithubCommitStatus(commit, context, status, message) {
    withCredentials([[
        $class: 'StringBinding',
        credentialsId: '5d3e0a3c-2490-491b-8a67-aa5eab2f27f2',
        variable: 'GITHUB_TOKEN'
    ]]) {
        github.setCommitStatus(
            env.GITHUB_TOKEN,
            'cliqz/navigation-extension',
            commit,
            context,
            status,
            message
        )
    }
}

parallel helpers.entries(matrix).collectEntries {
    [("Github Status ${it[0]}"): {
        setGithubCommitStatus(triggeringCommitHash, it[0], 'pending', 'pending')
    }]
}

node('docker && !gpu && us-east-1') {
    stage('checkout') {
        def scmInfo = checkout scm
        currentCommitHash = scmInfo.GIT_COMMIT
        codeDockerImage = "navigation-extension/tests:${currentCommitHash}"
    }

    def dockerfileChecksum = sh(returnStdout: true, script: 'md5sum Dockerfile.ci | cut -d" " -f1').trim()
    def packageJsonChecksum = sh(returnStdout: true, script: 'md5sum package.json | cut -d" " -f1').trim()
    // add date to the tag in order to download FF beta and nightly at least once per day and stay up-to-date
    def today = new Date().format('yyyyMMdd')
    def dockerTag = "${dockerfileChecksum}-${packageJsonChecksum}-${today}"

    // authorize docker deamon to access registry - no longer needed for GP nodes
    // sh "`aws ecr get-login --no-include-email --region=${params.AWS_REGION}`"

    docker.withRegistry("https://${params.DOCKER_REGISTRY_URL}") {

        stage('prepare docker base image') {
            ansiColor('xterm') {
                def baseImageName = "navigation-extension/build:${dockerTag}"

                try {
                    def image = docker.image(baseImageName)
                    image.pull()
                } catch (e) {
                    print e
                    def baseImage = docker.build(
                        baseImageName,
                        '-f Dockerfile.ci .'
                    )
                    baseImage.push dockerTag
                }
            }
        }

        stage('prepare docker code image') {
            writeFile file: 'Dockerfile.code', text: """
                FROM ${params.DOCKER_REGISTRY_URL}/navigation-extension/build:${dockerTag}
                COPY  --chown=node:node . /app/
            """

            def codeImage = docker.build(
                codeDockerImage,
                '-f Dockerfile.code .'
            )

            codeImage.push currentCommitHash
        }
    }
}

def build(Map m) {
    def context = m.context
    def getCodeDockerImage = m.getCodeDockerImage
    def config = m.config
    def stashName = "${env.JOB_BASE_NAME}_${env.BUILD_NUMBER}_${config.bytes.encodeBase64().toString()}"
    echo "Saving to stash ${stashName} #1"
    return {
        node('docker && !gpu && us-east-1') {
            def codeDockerImage = getCodeDockerImage()

            stage('Build an image') {
                docker.withRegistry("https://${params.DOCKER_REGISTRY_URL}") {
                    def image = docker.image(codeDockerImage)

                    image.pull()
                    withEnv(["CLIQZ_CONFIG_PATH=${config}",
                             "CLIQZ_OUTPUT_PATH=${env.WORKSPACE}/${stashName}"
                        ]) {
                        docker.image(image.imageName()).inside() {
                            sh """#!/bin/bash
                                set -x
                                cd /app
                                ./fern.js build --environment testing
                            """
                        }
                        stash includes: "${stashName}/**/*", name: "${stashName}"
                    }
                }
            }
        }
    }
}


def test(Map m) {
    def context = m.context
    def config = m.config
    def testParams = m.testParams
    def gpu = m.gpu
    def stashName = "${env.JOB_BASE_NAME}_${env.BUILD_NUMBER}_${config.bytes.encodeBase64().toString()}"
    def getCodeDockerImage = m.getCodeDockerImage
    def getTriggeringCommitHash = m.getTriggeringCommitHash
    def ignoreFailure = m.ignoreFailure

    def nodeLabels = gpu ? 'us-east-1 && docker && gpu' : 'us-east-1 && docker && !gpu'

    return {
        node(nodeLabels) {
            def codeDockerImage = getCodeDockerImage()
            def triggeringCommitHash = getTriggeringCommitHash()
            def HOST = helpers.getIp()
            def VNC_PORT = helpers.getFreePort(lower: 20000, upper: 20999)
            def dockerParams = "-p ${VNC_PORT}:5900 --add-host cliqztest.com:127.0.0.1"

            if (gpu) {
                dockerParams += ' --device /dev/nvidia0 --device /dev/nvidiactl --cpus=2'
            }

            // authorize docker deamon to access registry - no longer needed for GP nodes
            // sh "`aws ecr get-login --no-include-email --region=${params.AWS_REGION}`"

            docker.withRegistry("https://${params.DOCKER_REGISTRY_URL}") {
                def image = docker.image(codeDockerImage)

                stage('tests: get image') {
                    image.pull()
                }
                withEnv(["CLIQZ_CONFIG_PATH=${config}"]) {
                    dir("${stashName}") {
                        unstash name: "${stashName}"
                    }

                    docker.image(image.imageName()).inside(dockerParams) {

                        setGithubCommitStatus(
                            triggeringCommitHash,
                            context,
                            'pending',
                            "VNC ${HOST}:${VNC_PORT}"
                        )

                        stage('tests: run') {
                            def report
                            def hasErrors

                            try {
                                timeout(15) {
                                    def timeBefore = new Date()

                                    sh """#!/bin/bash
                                        set -x

                                        cd /app

                                        cp -r ${env.WORKSPACE}/${stashName}/${stashName} build
                                        rm -f report.xml

                                        export DISPLAY=:0
                                        Xvfb \$DISPLAY -screen 0 1024x768x24 -ac &
                                        openbox&

                                        x11vnc -storepasswd vnc /tmp/vncpass
                                        x11vnc -rfbport 5900 -rfbauth /tmp/vncpass -forever > /dev/null 2>&1 &

                                        ./fern.js test ${testParams} --no-build --environment testing --ci report.xml > /dev/null; true

                                        cp report.xml ${env.WORKSPACE}
                                    """
                                    def timeAfter = new Date()
                                    def duration = "${TimeCategory.minus(timeAfter, timeBefore).getHours()}h, ${TimeCategory.minus(timeAfter, timeBefore).getMinutes()}m"

                                    Map r = xunit.parse('/app/report.xml')
                                    if (!r.containsKey('errors')) {
                                      r.errors = '0'
                                    }
                                    report = "tests: ${r.tests}, f/e: ${r.failures}/${r.errors}, time: ${duration}"

                                    // Set status as green for test suites we want to ignore
                                    // in the global job status (e.g. Nightly)
                                    if (ignoreFailure == true) {
                                        hasErrors = false;
                                    } else {
                                        hasErrors = (r.failures != '0') || (r.errors != '0')
                                    }

                                    if (r.tests == '0') {
                                        throw new Exception('No tests have been run!')
                                    }

                                    junit(
                                        allowEmptyResults: true,
                                        healthScaleFactor: 0.0,
                                        testResults: 'report.xml'
                                    )
                                }  // end timeout

                            } catch (e) {
                                report = e
                                if (ignoreFailure == true) {
                                    hasErrors = false;
                                } else {
                                    hasErrors = true
                                }
                            }

                            setGithubCommitStatus(
                                triggeringCommitHash,
                                context,
                                hasErrors ? 'failure' : 'success',
                                report
                            )
                        } // end stage
                    } // end docker
                }
            }
        }
    }
}

def getStepsForParallel(matrix) {
    def buildSteps = [:]

    matrix.each { name, params ->
        buildSteps[params.get('config')] = 1
    }

    return buildSteps
}

def stepsForParallelTests = helpers.entries(matrix).collectEntries {
    [(it[0]): test(
        context: it[0],
        config: it[1]['config'],
        testParams: it[1]['testParams'],
        gpu: it[1]['gpu'],
        getCodeDockerImage: { codeDockerImage },
        getTriggeringCommitHash: { triggeringCommitHash },
        ignoreFailure: it[1]['ignoreFailure']
    )]
}

def stepsForParallelBuilds = helpers.entries(getStepsForParallel(matrix)).collectEntries {
    [("Build ${it[0]}"): build(
        config: it[0],
        getCodeDockerImage: { codeDockerImage }
    )]
}

parallel stepsForParallelBuilds


parallel stepsForParallelTests
