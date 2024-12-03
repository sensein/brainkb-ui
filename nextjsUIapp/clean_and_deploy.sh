#!/bin/bash

# Application variables
APP_NAME="nextjsuiapp-web"
DOCKER_COMPOSE_FILE="docker-compose.yml"

# Function to clean up Docker resources
cleanup() {
    echo "Stopping and removing containers for $APP_NAME..."
    docker ps -a | grep "$APP_NAME" | awk '{print $1}' | xargs -r docker stop
    docker ps -a | grep "$APP_NAME" | awk '{print $1}' | xargs -r docker rm

    echo "Removing volumes associated with $APP_NAME..."
    docker volume ls | grep "$APP_NAME" | awk '{print $2}' | xargs -r docker volume rm

    echo "Removing images associated with $APP_NAME..."
    docker images | grep "$APP_NAME" | awk '{print $3}' | xargs -r docker rmi -f

    echo "Cleanup completed."
}

# Function to redeploy the application
redeploy() {
    echo "Redeploying $APP_NAME..."
    docker-compose -f $DOCKER_COMPOSE_FILE up --build -d
    if [ $? -eq 0 ]; then
        echo "$APP_NAME has been successfully redeployed."
    else
        echo "Failed to redeploy $APP_NAME."
        exit 1
    fi
}

# Main script execution
echo "Starting cleanup and redeployment process for $APP_NAME..."
cleanup
redeploy
echo "Done."
