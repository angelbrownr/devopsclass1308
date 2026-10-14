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
                bat '''
                    @echo off
                    docker run --rm ^
                      --mount "type=bind,source=%WORKSPACE%,target=/work" ^
                      --mount "type=volume,target=/work/node_modules" ^
                      -w /work node:20-alpine ^
                      sh -lc "npm install --no-package-lock --no-audit --no-fund && npm test"
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Build Image') {
            steps {
                bat '''
                    @echo off
                    docker build -t "%IMAGE_NAME%:%BUILD_NUMBER%" -t "%IMAGE_NAME%:latest" .
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('E2E Test') {
            steps {
                bat 'docker rm -f "%CONTAINER_NAME%" 2>NUL || exit /b 0'
                bat '''
                    @echo off
                    docker run -d --name "%CONTAINER_NAME%" -p "%E2E_PORT%:3000" "%IMAGE_NAME%:%BUILD_NUMBER%"
                    if errorlevel 1 exit /b 1

                    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $ready=$false; for ($i=0; $i -lt 30; $i++) { try { Invoke-WebRequest -UseBasicParsing 'http://localhost:%E2E_PORT%/health' -TimeoutSec 2 | Out-Null; $ready=$true; break } catch { Start-Sleep -Seconds 1 } }; if (-not $ready) { docker logs '%CONTAINER_NAME%'; exit 1 }"
                    if errorlevel 1 exit /b 1

                    docker run --rm ^
                      --mount "type=bind,source=%WORKSPACE%,target=/work" ^
                      -w /work ^
                      -e BASE_URL=http://host.docker.internal:%E2E_PORT% ^
                      node:20-alpine npm run test:e2e
                    if errorlevel 1 exit /b 1
                '''
            }
            post {
                always {
                    bat 'docker logs "%CONTAINER_NAME%" 2>NUL || exit /b 0'
                    bat 'docker rm -f "%CONTAINER_NAME%" 2>NUL || exit /b 0'
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
                    bat '''
                        @echo off
                        powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:REG_PASS | docker login $env:REGISTRY_HOST --username $env:REG_USER --password-stdin"
                        if errorlevel 1 exit /b 1

                        docker tag "%IMAGE_NAME%:%BUILD_NUMBER%" "%REGISTRY_HOST%/%IMAGE_REPOSITORY%:%BUILD_NUMBER%"
                        if errorlevel 1 exit /b 1
                        docker push "%REGISTRY_HOST%/%IMAGE_REPOSITORY%:%BUILD_NUMBER%"
                        if errorlevel 1 exit /b 1

                        docker logout "%REGISTRY_HOST%"
                    '''
                }
            }
        }

        stage('Deploy') {
            when {
                expression { return isMainBranch() }
            }
            steps {
                bat '''
                    @echo off
                    docker rm -f "%IMAGE_NAME%" 2>NUL

                    docker run -d --name "%IMAGE_NAME%" --restart unless-stopped -p 3000:3000 "%IMAGE_NAME%:%BUILD_NUMBER%"
                    if errorlevel 1 exit /b 1

                    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $ready=$false; for ($i=0; $i -lt 30; $i++) { try { Invoke-WebRequest -UseBasicParsing 'http://localhost:3000/health' -TimeoutSec 2 | Out-Null; $ready=$true; break } catch { Start-Sleep -Seconds 1 } }; if (-not $ready) { docker logs '%IMAGE_NAME%'; docker rm -f '%IMAGE_NAME%'; exit 1 }"
                    if errorlevel 1 exit /b 1
                '''
            }
        }
    }

    post {
        failure {
            echo 'Pipeline failed - check the stage logs above.'
        }
        cleanup {
            bat 'docker image prune -f || exit /b 0'
        }
    }
}

def isMainBranch() {
    return env.BRANCH_NAME == 'main' ||
           env.GIT_BRANCH == 'main' ||
           env.GIT_BRANCH == 'origin/main'
}
