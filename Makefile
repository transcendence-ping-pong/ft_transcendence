frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev -- --host

frontend-build:
	cd frontend && npm run build

frontend-preview:
	cd frontend && npm run preview

backend-install:
	cd backend && npm install

backend-initdb:
	cd backend && sh ./database/script.sh

backend-dev: backend-initdb
	cd backend && npm run dev

# backend-test:
# 	cd backend && npm test

dev: frontend-dev backend-dev

build: frontend-build

.PHONY: frontend-install frontend-dev frontend-build frontend-preview backend-install backend-dev backend-test dev build
