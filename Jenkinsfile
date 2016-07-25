node('docker') {
  stage 'checkout'
  checkout scm

  def imgName = "cliqz/navigation-extension:${env.BUILD_TAG}"

  stage 'docker build'
  sh "docker build -t ${imgName} --build-arg UID=`id -u` --build-arg GID=`id -g` ."
  dockerFingerprintFrom dockerfile: "./Dockerfile", image: imgName, toolName: env.DOCKER_TOOL_NAME

  docker.image(imgName).inside() {
    withEnv(["CLIQZ_CONFIG_PATH=./configs/browser.json"]) {
      stage 'fern install'
      sh './fern.js install'

      stage 'fern test'
      sh 'rm -rf tests.xml'
      sh './fern.js test --ci tests.xml'
      step([$class: 'JUnitResultArchiver', allowEmptyResults: false, testResults: 'tests.xml'])
    }
  }
}
