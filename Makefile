frontend-install:
	cd frontend && npm install

# set environment variable directly in Makefile
# it will be used only for local development (i.e. for running on port 3000, vite hot reload)
frontend-dev:
	@cd frontend && VITE_API_BASE_URL="http://localhost:4000/api" npm run dev -- --host

# frontend-build:
# 	@cd frontend && VITE_API_BASE_URL="/api" npm run build

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

.PHONY: frontend-install frontend-dev frontend-build frontend-preview backend-install backend-dev backend-test dev build
