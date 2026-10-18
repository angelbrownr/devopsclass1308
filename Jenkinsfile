pipeline {
    agent any

    parameters {
        string(name: 'REGISTRY_HOST', defaultValue: 'docker.io',
               description: 'Registry hostname, e.g. docker.io or ghcr.io')
        string(name: 'IMAGE_REPOSITORY', defaultValue: '',
               description: 'Full repository path, e.g. your-dockerhub-user/todo-app. Leave blank to skip image push.')
    }

    environment {
        IMAGE_NAME     = 'todo-app'
        CONTAINER_NAME = "todo-app-e2e-${BUILD_NUMBER}"
        E2E_PORT       = '3100'
    }

    options {
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Unit Tests') {
            steps {
                // Run Linux Node.js inside Docker Desktop; no Windows Node.js installation required.
                sh '''
                    
                    docker run --rm \
                      --mount "type=bind,source=${WORKSPACE},target=/work" \
                      --mount "type=volume,target=/work/node_modules" \
                      -w /work node:20-alpine \
                      sh -lc "npm install --no-package-lock --no-audit --no-fund && npm test"
                    
                '''
            }
        }

        stage('Build Image') {
            steps {
                sh '''
                    
                    docker build -t "${IMAGE_NAME}:${BUILD_NUMBER}" -t "${IMAGE_NAME}:latest" .
                   
                '''
            }
        }

        stage('E2E Test') {
            steps {
                sh '''docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true'''
                sh '''
                    
                    docker run -d --name "${CONTAINER_NAME}" -p "${E2E_PORT}:3000" "{IMAGE_NAME}:${BUILD_NUMBER}"
                    

                    

                    docker run --rm \
                      --mount "type=bind,source=${WORKSPACE},target=/work" \
                      -w /work \
                      -e BASE_URL=http://host.docker.internal:${E2E_PORT} \
                      node:20-alpine npm run test:e2e
                    
                '''
            }
            post {
                always {
                    sh '''docker logs "${CONTAINER_NAME}" 2>/dev/null || true'''
                    sh '''docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true'''
                }
            }
        }

        stage('Push Image') {
            when {
                allOf {
                    expression {
                        return isMainBranch() && params.IMAGE_REPOSITORY?.trim()
                    }
                }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry',
                    usernameVariable: 'REG_USER',
                    passwordVariable: 'REG_PASS'
                )]) {

    sh '''
        echo "$REG_PASS" | docker login $REGISTRY_HOST --username $REG_USER --password-stdin
        docker tag "${IMAGE_NAME}:${BUILD_NUMBER}" "${REGISTRY_HOST}/${IMAGE_REPOSITORY}:${BUILD_NUMBER}"
        docker tag "${IMAGE_NAME}:${BUILD_NUMBER}" "${REGISTRY_HOST}/${IMAGE_REPOSITORY}:latest"
        docker push "${REGISTRY_HOST}/${IMAGE_REPOSITORY}:${BUILD_NUMBER}"
        docker push "${REGISTRY_HOST}/${IMAGE_REPOSITORY}:latest"
        docker logout "${REGISTRY_HOST}"
    '''
}
            }
        }

        
                stage('Deploy') {
    when {
        expression { return isMainBranch() }
    }
    steps {
        sh '''
            docker rm -f "${IMAGE_NAME}" 2>/dev/null || true
            docker run -d --name "${IMAGE_NAME}" --restart unless-stopped -p 3000:3000 "${IMAGE_NAME}:${BUILD_NUMBER}"
            
            echo "Waiting for app to be ready..."
            for i in $(seq 1 30); do
                if curl -f http://localhost:3000/health 2>/dev/null; then
                    echo "App is ready!"
                    ready=true
                    break
                fi
                echo "Not ready yet, waiting $i sec..."
                sleep 1
            done
            
            if [ "$ready" != "true" ]; then
                echo "App failed to start, logs:"
                docker logs "${IMAGE_NAME}"
                docker rm -f "${IMAGE_NAME}"
                exit 1
            fi
        '''
    }
}
}

def isMainBranch() {
    return env.BRANCH_NAME == 'main' ||
           env.GIT_BRANCH == 'main' ||
           env.GIT_BRANCH == 'origin/main'
}
}