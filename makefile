all:
	@echo "--------------------------------"
	@echo "Multiplayer addresss:"
	@ifconfig | grep "inet " | grep -v 127.0.0.1
	@echo "--------------------------------"
	@echo "Press Enter to continue..."
	@read _

	@echo "RUNNING"
	docker compose up -d --build
	docker compose logs -f backend
	@echo "work work work"

clean:
	@echo "Cleaning up..."
	docker compose down --volumes --remove-orphans