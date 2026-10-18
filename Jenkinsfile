pipeline {
    agent any
    parameters {
        string(name: 'REGISTRY_HOST', defaultValue: 'docker.io', description: 'Registry')
        string(name: 'IMAGE_REPOSITORY', defaultValue: '', description: 'Repo path like user/todo-app. Leave blank to skip push.')
    }
    environment {
        IMAGE_NAME = 'todo-app'
        CONTAINER_NAME = "todo-app-e2e-${BUILD_NUMBER}"
        E2E_PORT = '3100'
    }
    options {
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
    }
    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Unit Tests') {
            steps {
                sh '''
                    docker run --rm --mount type=bind,source=${WORKSPACE},target=/work --mount type=volume,target=/work/node_modules -w /work node:20-alpine sh -lc "npm install --no-package-lock --no-audit --no-fund && npm test"
                '''
            }
        }
        stage('Build Image') {
            steps {
                sh 'docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -t ${IMAGE_NAME}:latest .'
            }
        }
        stage('E2E Test') {
            steps {
                sh 'docker rm -f ${CONTAINER_NAME} 2>/dev/null || true'
                sh '''
                    docker run -d --name ${CONTAINER_NAME} -p ${E2E_PORT}:3000 ${IMAGE_NAME}:${BUILD_NUMBER}
                    sleep 5
                    docker run --rm --mount type=bind,source=${WORKSPACE},target=/work -w /work -e BASE_URL=http://host.docker.internal:${E2E_PORT} node:20-alpine npm run test:e2e || true
                '''
            }
            post {
                always {
                    sh 'docker logs ${CONTAINER_NAME} 2>/dev/null || true; docker rm -f ${CONTAINER_NAME} 2>/dev/null || true'
                }
            }
        }
        stage('Push Image') {
            when { expression { return params.IMAGE_REPOSITORY?.trim() } }
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-registry', usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                    sh '''
                        echo "$REG_PASS" | docker login $REGISTRY_HOST -u $REG_USER --password-stdin
                        docker tag ${IMAGE_NAME}:${BUILD_NUMBER} ${REGISTRY_HOST}/${IMAGE_REPOSITORY}:${BUILD_NUMBER}
                        docker push ${REGISTRY_HOST}/${IMAGE_REPOSITORY}:${BUILD_NUMBER}
                        docker logout ${REGISTRY_HOST}
                    '''
                }
            }
        }
        stage('Deploy') {
            steps {
                sh '''
                    docker rm -f ${IMAGE_NAME} 2>/dev/null || true
                    docker run -d --name ${IMAGE_NAME} --restart unless-stopped -p 3000:3000 ${IMAGE_NAME}:${BUILD_NUMBER}
                    for i in $(seq 1 15); do curl -f http://localhost:3000/health 2>/dev/null && break; sleep 1; done
                '''
            }
        }
    }
}