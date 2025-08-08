all: clean
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