pipeline {
    agent any

    stages {
        stage('Checkout GitHub') {
            steps {
                checkout scm
            }
        }
        stage('Build auth-service') {
            steps {
                sh 'docker build -t auth-service:ci ./auth-service'
            }
        }
        stage('Build product-service') {
            steps {
                sh 'docker build -t product-service:ci ./product-service'
            }
        }
        stage('Build frontend') {
            steps {
                sh 'docker build -t frontend:ci ./frontend'
            }
        }
        stage('Verification') {
            steps {
                sh 'docker images | grep ":ci"'
            }
        }
    }

    post {
        success { echo 'Pipeline OK : les 3 images ont ete construites.' }
        failure { echo 'Pipeline en echec.' }
    }
}
