frontend-install:
	cd frontend && npm install

# set environment variable directly in Makefile
# it will be used only for local development (i.e. for running on port 3000, vite hot reload)
frontend-dev:
	@cd frontend && VITE_API_BASE_URL="http://localhost:4000/api" npm run dev -- --host

frontend-dev-dani:
	@cd frontend && VITE_API_BASE_URL="http://localhost:4000/api" npm run dev

frontend-build:
	@cd frontend && VITE_API_BASE_URL="/api" npm run build

frontend-preview:
	cd frontend && npm run preview

backend-install:
	cd backend && npm install

backend-initdb:
	cd backend && sh ./database/script.sh

backend-dev: backend-initdb
	@cd backend && npm run dev

# backend-test:
# 	cd backend && npm test

dev: frontend-dev backend-dev

build: frontend-build

a: clean
	@echo "--------------------------------"
	@echo "Multiplayer addresss:"
	@ifconfig | grep "inet " | grep -v 127.0.0.1
	@echo "--------------------------------"
	@echo "Press Enter to continue..."

	@echo "RUNNING"
	docker compose up -d --build
	docker compose logs -f backend frontend

clean:
	@echo "Cleaning up..."
	docker compose down
	docker system prune -af
	docker volume prune -f
	docker network prune -f
	clear

clean-db:
	@echo "Cleaning up with database reset..."
	docker compose down -v
	docker system prune -af
	docker volume prune -f
	docker network prune -f
	clear

fresh-start: clean-db
	@echo "Starting fresh with clean database..."
	docker compose up -d --build
	docker compose logs -f backend frontend

.PHONY: frontend-install frontend-dev frontend-build frontend-preview backend-install backend-dev backend-test dev build a clean clean-db fresh-start