# Todo App - Jenkins on Windows + Docker Desktop

This pipeline is intended for **Jenkins installed directly on Windows** and **Docker Desktop using Linux containers**. It uses Windows `bat` steps and runs Node.js 20 inside Linux containers, avoiding the `/bin/bash CreateProcess` problem caused by `sh` on a native Windows agent.

## Prerequisites

1. Docker Desktop is installed and running.
2. Docker Desktop is set to **Linux containers** (the Dockerfile is based on `node:20-alpine`).
3. The Windows account running Jenkins can run `docker version` successfully.
4. Jenkins has Pipeline and Credentials plugins installed.
5. The repository contains this `Jenkinsfile` at its root.

Open Command Prompt as the same Windows account that runs Jenkins and check:

```bat
docker version
docker run --rm node:20-alpine node --version
```

Both commands must succeed. If Jenkins runs as a Windows service, make sure that service account can access the Docker Desktop engine. Docker Desktop is commonly tied to the interactive user's session; for a reliable setup, run Jenkins under the same authorized account or use a dedicated Linux agent.

## Create the Jenkins job

Recommended: create a **Multibranch Pipeline** job and point it at your Git repository. This ensures `BRANCH_NAME` is populated for `main` branch conditions.

Alternatively, create a Pipeline job configured as **Pipeline script from SCM**, select Git, set repository URL/credentials and branch specifier, and use `Jenkinsfile` as the script path.

## Configure image push (optional)

The pipeline always runs checkout, unit tests, image build and E2E tests. Image push and deployment are restricted to the `main` branch.

For registry push:

1. In **Manage Jenkins → Credentials**, add a **Username with password** credential with ID `docker-registry`.
2. Set job parameters:
   - `REGISTRY_HOST`: for Docker Hub use `docker.io`; for GitHub Container Registry use `ghcr.io`.
   - `IMAGE_REPOSITORY`: for Docker Hub use `your-dockerhub-username/todo-app`; for GHCR use `your-github-username/todo-app`.
3. Ensure the credential has permission to push to that repository.

Leave `IMAGE_REPOSITORY` empty to skip push. Never put registry passwords in the Jenkinsfile or repository.

## What each stage does

- **Checkout**: checks out the repository.
- **Unit Tests**: runs Jest/Supertest using Node.js 20 in a disposable container.
- **Build Image**: builds `todo-app:<BUILD_NUMBER>` and `todo-app:latest`.
- **E2E Test**: starts the image on host port 3100, waits for `/health`, runs the real-container E2E test from a Node.js container using `host.docker.internal`, then removes the test container.
- **Push Image**: pushes the build-number tag when running on `main` and registry parameters are supplied.
- **Deploy**: on `main`, replaces the local Docker Desktop container on port 3000 and verifies `/health`.

## Important notes

- Port **3100** is reserved for the temporary E2E container; port **3000** is used by the deployed app.
- Ensure those ports are not already occupied.
- Deployment is a simple local Docker deployment and has a brief interruption while replacing the container. It is not a zero-downtime production rollout.
- The Todo API stores items in memory, so data is lost when the app container is recreated.
- For repeatable dependency resolution, commit a `package-lock.json` and switch the Docker-based install to `npm ci` once the lockfile is available.
- The Dockerfile uses Linux containers. Do not switch Docker Desktop to Windows containers for this project.
