pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 45, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  environment {
    APP_NAME     = 'skillsewa'
    COMPOSE_PROJECT_NAME = 'skillsewa'
    WEB_CONTAINER = 'skillsewa-web'
    DB_CONTAINER  = 'skillsewa-db'
    PORT         = '3000'
    NODE_IMAGE   = 'node:22-alpine'
    NEXT_TELEMETRY_DISABLED = '1'

    IMAGE_TAG    = "${env.GIT_COMMIT?.take(7) ?: env.BUILD_NUMBER}"
    IMAGE_LATEST = "${APP_NAME}:latest"
    IMAGE_BUILD  = "${APP_NAME}:${IMAGE_TAG}"
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
        sh 'git rev-parse --short HEAD'
      }
    }

    stage('Install Dependencies') {
      agent {
        docker {
          image "${NODE_IMAGE}"
          reuseNode true
          args '-u root:root'
        }
      }
      steps {
        sh '''
          node -v
          npm -v
          npm ci --no-audit --no-fund
        '''
      }
    }

    stage('Prisma Generate') {
      agent {
        docker {
          image "${NODE_IMAGE}"
          reuseNode true
          args '-u root:root'
        }
      }
      steps {
        sh 'npx prisma generate'
      }
    }

    stage('Lint') {
      agent {
        docker {
          image "${NODE_IMAGE}"
          reuseNode true
          args '-u root:root'
        }
      }
      steps {
        sh 'npm run lint || true'
      }
    }

    stage('Build App') {
      agent {
        docker {
          image "${NODE_IMAGE}"
          reuseNode true
          args '-u root:root'
        }
      }
      steps {
        sh 'npm run build'
      }
    }

    stage('Docker Build') {
      steps {
        sh """
          docker build \
            -t ${IMAGE_BUILD} \
            -t ${IMAGE_LATEST} .
        """
      }
    }

    stage('Deploy Production') {
      steps {
        withCredentials([
          string(credentialsId: 'skillsewa-mysql-root-password', variable: 'MYSQL_ROOT_PASSWORD'),
          string(credentialsId: 'skillsewa-jwt-secret',           variable: 'JWT_SECRET'),
          string(credentialsId: 'skillsewa-nextauth-secret',      variable: 'NEXTAUTH_SECRET')
        ]) {
          sh '''
            set -e

            echo "Bringing stack up via docker compose..."
            docker compose up -d --build

            echo "Running containers:"
            docker compose ps
          '''
        }
      }
    }

    stage('Health Check') {
      steps {
        sh '''
          set +e

          echo "Waiting for application on host port ${PORT}..."

          for i in $(seq 1 60); do
            curl -fs http://127.0.0.1:${PORT} >/dev/null 2>&1
            if [ $? -eq 0 ]; then
              echo "Application healthy on port ${PORT}."
              exit 0
            fi
            sleep 3
          done

          echo "Health check failed."
          docker logs --tail=200 ${WEB_CONTAINER} || true
          docker logs --tail=100 ${DB_CONTAINER} || true
          exit 1
        '''
      }
    }

  }

  post {

    success {
      echo "Deployment successful: ${APP_NAME} (${IMAGE_TAG})"
    }

    failure {
      echo "Build failed."

      sh '''
        echo "Last web container logs:"
        docker logs --tail=200 ${WEB_CONTAINER} || true
        echo "Last db container logs:"
        docker logs --tail=100 ${DB_CONTAINER} || true
      '''
    }

    always {
      sh '''
        echo "Cleaning old unused images..."
        docker image prune -af || true
      '''
    }
  }
}
