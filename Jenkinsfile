try {
  CLIQZ_PRE_RELEASE
} catch (all) {
  CLIQZ_PRE_RELEASE = "False"
}

try {
  CLIQZ_BETA
} catch (all) {
  CLIQZ_BETA = "True"
}

node(NODE_LABELS) {
  
  stage 'checkout'
  checkout([
    $class: 'GitSCM',
    branches: [[name: '*/cliqz-ci']],
    doGenerateSubmoduleConfigurations: false,
    extensions: [[
      $class: 'RelativeTargetDirectory',
      relativeTargetDir: '../workspace@script/xpi-sign'
    ]],
    submoduleCfg: [],
    userRemoteConfigs: [[
      credentialsId: XPI_SIGN_CREDENTIALS,
      url: XPI_SIGN_REPO_URL
    ]]
  ])
  
  def imgName = "cliqz/navigation-extension:${env.BUILD_TAG}"

  dir("../workspace@script") {
    sh '''#!/bin/bash +x
      rm -fr certs
      cp -R /cliqz certs
    '''
    
    stage 'docker build'
    docker.build(imgName, ".")

    try {

      docker.image(imgName).inside() {
        stage 'fern install'
        sh './fern.js install'
        
        stage 'fern build'
        sh "./fern.js build ./configs/${CLIQZ_CHANNEL}.json"

        stage 'fab publish'
        sh """#!/bin/bash
          cd build/
          set +x
          source ../certs/beta-upload-creds.sh
          set -x
          fab publish:beta=${CLIQZ_BETA},channel=${CLIQZ_CHANNEL},pre=${CLIQZ_PRE_RELEASE}
        """
      }
    
    } finally {
      sh 'rm -rf certs'
    }
  }
}
