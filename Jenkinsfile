node {

  stage 'checkout'

  checkout([$class: 'GitSCM', branches: [[name: '*/cliqz-ci']], doGenerateSubmoduleConfigurations: false, extensions: [[$class: 'RelativeTargetDirectory', relativeTargetDir: '../workspace@script/xpi-sign']], submoduleCfg: [], userRemoteConfigs: [[credentialsId: '27da958c-432d-4255-bb57-abf00bb670d6', url: 'git@github.com:cliqz/xpi-sign']]])

  stage 'build'

  def imgName = "cliqz/navigation-extension:${env.BUILD_TAG}"

  dir("../workspace@script") {
    sh 'rm -fr certs'
    sh 'cp -R /cliqz certs'

    docker.build(imgName, ".")

    docker.image(imgName).inside("-u 0:0") {
      sh 'su travis; /bin/bash -l -c "npm install"'
      sh 'su travis; /bin/bash -l -c "bower install --allow-root"'
      sh 'su travis; /bin/bash -l -c "./fern.js build ./configs/browser.json"'
      sh 'su travis; cd build/firefox; /bin/bash -l -c "source ../../certs/beta-upload-creds.sh ; PATH=/openssl-0.9.8zg/apps/:$PATH fab publish:channel='+CLIQZ_CHANNEL+',pre=False"'
    }

    sh 'rm -rf certs'
  }
}
