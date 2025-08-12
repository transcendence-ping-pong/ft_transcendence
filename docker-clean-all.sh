#!/bin/bash
# Usage: chmod +x docker-clean-all.sh 
# Usage: ./docker-clean-all.sh
# Cleans all Docker containers, images, volumes, networks, and build cache.

echo "Stopping all running containers..."
docker ps -aq | xargs -r docker stop

echo "Removing all containers..."
docker ps -aq | xargs -r docker rm -f

echo "Removing all images..."
docker images -q | xargs -r docker rmi -f

echo "Removing all volumes..."
docker volume ls -q | xargs -r docker volume rm -f

echo "Removing all networks (except default, bridge, host, none)..."
docker network ls --format '{{.ID}} {{.Name}}' | grep -vE ' bridge|host|none|default' | awk '{print $1}' | xargs -r docker network rm

echo "Pruning unused Docker objects..."
docker system prune -af

echo "Removing dangling images..."
docker images -f "dangling=true" -q | xargs -r docker rmi -f

echo "Removing unused build cache..."
docker builder prune -af

echo "Docker cleanup complete."