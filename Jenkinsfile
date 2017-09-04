#!/bin/env groovy

@Library('cliqz-shared-library@v1.2') _

if (job.hasNewerQueuedJobs()) {
    error('Has Jobs in queue, aborting')
}

properties([
    [$class: 'JobRestrictionProperty'],
    disableConcurrentBuilds(),
    parameters([
        string(name: 'DOCKER_REGISTRY_URL', defaultValue: '141047255820.dkr.ecr.us-east-1.amazonaws.com'),
        string(name: 'AWS_REGION', defaultValue: 'us-east-1'),
    ]),
])

def matrix = [
    'browser: unit': [
        'gpu': false,
        'testParams': 'configs/browser.json -l unit-node',
    ],
    'mobile: unit': [
        'gpu': false,
        'testParams': 'configs/mobile.json -l unit-node',
    ],
    'react-native: unit': [
        'gpu': false,
        'testParams': 'configs/react-native.json -l unit-node',
    ],
    'webextension: unit': [
        'gpu': false,
        'testParams': 'configs/webextension.json -l unit-node',
    ],
    'amo: unit': [
        'gpu': false,
        'testParams': 'configs/amo.json -l unit-node',
    ],
    'browser: content': [
        'gpu': true,
        'testParams': 'configs/browser.json -l chromium',
    ],
    'mobile: content': [
        'gpu': true,
        'testParams': 'configs/mobile.json -l chromium',
    ],
    'firefox 42': [
        'gpu': true,
        'testParams': 'configs/jenkins.json -l firefox-selenium --firefox ~/firefox42/firefox/firefox',
    ],
    'firefox 52': [
        'gpu': true,
        'testParams': 'configs/jenkins.json -l firefox-web-ext --firefox ~/firefox52/firefox/firefox',
    ],
    'chromium': [
        'gpu': true,
        'testParams': 'configs/cliqzium.json -l chromium-selenium',
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
    [(it[0]): {
        setGithubCommitStatus(triggeringCommitHash, it[0], 'pending', 'penging')
    }]
}

node('docker') {
    stage('checkout') {
        def scmInfo = checkout scm
        currentCommitHash = scmInfo.GIT_COMMIT
        codeDockerImage = "navigation-extension/tests:${currentCommitHash}"
    }

    def dockerfileChecksum = sh(returnStdout: true, script: 'md5sum Dockerfile.ci | cut -d" " -f1').trim()
    def packageJsonChecksum = sh(returnStdout: true, script: 'md5sum package.json | cut -d" " -f1').trim()
    def bowerJsonChecksum = sh(returnStdout: true, script: 'md5sum bower.json | cut -d" " -f1').trim()
    def dockerTag = "${dockerfileChecksum}-${packageJsonChecksum}-${bowerJsonChecksum}"

    // authorize docker deamon to access registry
    sh "`aws ecr get-login --region=${params.AWS_REGION}`"

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
                ADD . /app/
            """

            def codeImage = docker.build(
                codeDockerImage,
                '-f Dockerfile.code .'
            )
            codeImage.push currentCommitHash
        }

    }
}

def test(Map m) {
    def context = m.context
    def testParams = m.testParams
    def gpu = m.gpu
    def getCodeDockerImage = m.getCodeDockerImage
    def getTriggeringCommitHash = m.getTriggeringCommitHash

    def nodeLabels = gpu ? 'docker && gpu' : 'docker'

    return {
        node(nodeLabels) {
            def codeDockerImage = getCodeDockerImage()
            def triggeringCommitHash = getTriggeringCommitHash()
            def HOST = helpers.getIp()
            def VNC_PORT = helpers.getFreePort(lower: 20000, upper: 20999)
            def dockerParams = "-p ${VNC_PORT}:5900"

            if (gpu) {
                dockerParams += ' --device /dev/nvidia0 --device /dev/nvidiactl'
            }

            // authorize docker deamon to access registry
            sh "`aws ecr get-login --region=${params.AWS_REGION}`"

            docker.withRegistry("https://${params.DOCKER_REGISTRY_URL}") {
                def image = docker.image(codeDockerImage)

                stage('tests: get image') {
                    image.pull()
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
                            sh """#!/bin/bash
                                set -x

                                cd /app
                                rm -f report.xml

                                export DISPLAY=:0
                                Xvfb \$DISPLAY -screen 0 1024x768x24 -ac &
                                openbox&

                                x11vnc -storepasswd vnc /tmp/vncpass
                                x11vnc -rfbport 5900 -rfbauth /tmp/vncpass -forever > /dev/null 2>&1 &

                                ./fern.js test ${testParams} --ci report.xml > /dev/null; true

                                cp report.xml ${env.WORKSPACE}
                            """

                            Map r = xunit.parse('/app/report.xml')
                            report = "tests: ${r.tests}, failures: ${r.failures}"
                            hasErrors = r.failures != '0'

                            //xunit.setJUnitPackageName(context, 'report.xml', 'report.xml')

                            junit(
                                allowEmptyResults: true,
                                healthScaleFactor: 0.0,
                                testResults: 'report.xml'
                            )
                        } catch (e) {
                            report = e
                            hasErrors = true
                        }

                        setGithubCommitStatus(
                            triggeringCommitHash,
                            context,
                            hasErrors ? 'failure' : 'success',
                            report
                        )
                    }
                }
            }
        }
    }
}

def stepsForParallel = helpers.entries(matrix).collectEntries {
    [(it[0]): test(
        context: it[0],
        testParams: it[1]['testParams'],
        gpu: it[1]['gpu'],
        getCodeDockerImage: { codeDockerImage },
        getTriggeringCommitHash: { triggeringCommitHash }
    )]
}

parallel stepsForParallel
