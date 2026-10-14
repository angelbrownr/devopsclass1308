# Todo App – Docker + Jenkins CI/CD + E2E

## Run locally
```
npm install
npm test                      # unit tests
docker build -t todo-app .
docker run -d -p 3000:3000 --name todo-app todo-app
BASE_URL=http://localhost:3000 npm run test:e2e   # end-to-end test vs. the container
```
Or `docker compose up --build`. UI: http://localhost:3000

## Jenkins setup
- Linux agent with Docker installed; Jenkins user in the `docker` group; plugins: Pipeline, Docker Pipeline, Git.
- New item -> Multibranch Pipeline (or Pipeline from SCM) pointing at this repo; it picks up `Jenkinsfile`.
- Optional push: set `REGISTRY` in the Jenkinsfile and create a `docker-registry` username/password credential.

## Pipeline stages
Checkout -> Unit Tests -> Build Image -> E2E (start container, run tests against it, tear down) -> Push (main) -> Deploy (main)
