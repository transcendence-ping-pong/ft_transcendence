# transcendence
This project was developed for 42 school. For comprehensive information regarding the requirements, please consult the PDF file in the subject folder of the repository. Furthermore, we have provided our notes and a concise summary below.

```diff
+ keywords: single page application (SPA)
+ Pong game (1972)
+ ...
```

## High-level Overview

```
ft_transcendence/
├── README.md                # Project documentation
├── docker-compose.yml       # Docker configuration for the entire project

├── backend/                 # Optional backend (pure PHP)
│   ├── Dockerfile           # Dockerfile for the backend
│   ├── index.php            # Entry point for the backend
│   ├── api/                 # API endpoints
│   │   ├── game.php         # Game-related API logic
│   │   ├── auth.php         # Authentication logic
│   │   └── users.php        # User management logic
│   ├── database/            # Database-related files (if using a database)
│   │   ├── schema.sql       # Database schema
│   │   └── seed.sql         # Seed data
│   ├── modules/             # Modularized backend logic
│   │   ├── Game/
│   │   │   ├── GameService.php  # Game-related business logic
│   │   │   ├── GameRepository.php # Database interactions for the game
│   │   │   └── GameValidator.php  # Validation logic for game-related requests
│   │   ├── Auth/
│   │   │   ├── AuthService.php   # Authentication logic
│   │   │   └── AuthValidator.php # Validation logic for authentication
│   │   └── Users/
│   │       ├── UserService.php   # User-related business logic
│   │       └── UserRepository.php # Database interactions for users
│   └── utils/               # Utility functions
│       └── helpers.php      # Helper functions for the backend

├── frontend/                # Frontend application
│   ├── Dockerfile           # Dockerfile for the frontend
│   ├── src/
│   │   ├── index.html       # Main HTML file
│   │   ├── styles/          # Tailwind CSS styles
│   │   │   ├── base.css     # Base styles (e.g., resets, typography)
│   │   │   ├── components.css # Styles for components
│   │   │   ├── pages.css    # Styles for specific pages
│   │   │   └── tailwind.css # Tailwind CSS entry point
│   │   ├── assets/          # Folder for static assets
│   │   │   ├── images/      # Images (e.g., logo, icons, backgrounds)
│   │   │   │   ├── logo.png
│   │   │   │   ├── background.jpg
│   │   │   │   └── icons/
│   │   │   │       ├── play.svg
│   │   │   │       └── pause.svg
│   │   │   └── fonts/       # Fonts (if needed)
│   │   ├── app.ts           # Main TypeScript entry point
│   │   ├── components/      # UI components
│   │   │   ├── Game/
│   │   │   │   ├── GameCanvas.ts    # Canvas rendering for the game
│   │   │   │   ├── GameControls.ts # Controls for the game (e.g., buttons)
│   │   │   │   └── GameScore.ts    # Scoreboard component
│   │   │   ├── Layout/
│   │   │   │   ├── Navbar.ts       # Navigation bar
│   │   │   │   └── Footer.ts       # Footer component
│   │   │   └── Shared/
│   │   │       ├── Button.ts       # Reusable button component
│   │   │       └── Modal.ts        # Reusable modal component
│   │   ├── pages/           # SPA pages
│   │   │   ├── Home.ts      # Home page
│   │   │   ├── Game.ts      # Game page
│   │   │   └── About.ts     # About page
│   │   ├── utils/           # Utility functions
│   │   │   ├── router.ts    # SPA router logic
│   │   │   └── navigation.ts # Navigation helpers
│   │   └── types/           # TypeScript types
│   │       └── game.d.ts    # Game-related types
│   └── package.json         # Frontend dependencies

├── shared/                  # Shared logic between frontend and backend
│   ├── gameEngine.ts        # Core game logic (physics, scoring, etc.)
│   ├── types.ts             # Shared types/interfaces
│   ├── constants.ts         # Shared constants (e.g., game settings, API URLs)
│   ├── validators.ts        # Shared validation logic
│   └── utils.ts             # Shared utility functions (e.g., date formatting)

├── security/                # Security-related files
│   ├── xss_protection.php   # XSS protection logic
│   ├── sql_injection.php    # SQL injection prevention
│   └── https_config.php     # HTTPS configuration
```

### Build the project
```
<!-- build docker image -->
sudo docker build -t ft_frontend ./frontend
<!-- start container -->
sudo docker-compose up --build
<!-- FE available at http://localhost:3000 -->
```

## Concepts

| Task | Prototype | Description |
|:----|:-----:|:--------|
| **Installing dependencies** | `cat /home/ubuntu/.npm/_logs/$(ls -t /home/ubuntu/.npm/_logs/ \| head -n1)` | Check for errors in `npm log`. |

### References Game History
![pong_references](https://github.com/user-attachments/assets/0511ef7a-d335-4721-bd3a-d0e399efb321)
[Pong Game (1972)](https://www.ponggame.org/)</br>
[Pong, Computer History Museum](https://www.computerhistory.org/revolution/computer-games/16/183)</br>
[Pong - Video Game Console/TV Game Commercial 1976](https://www.youtube.com/watch?v=uCqIkgFKHr4)</br>
[Original Atari PONG (1972) arcade machine gameplay video](https://www.youtube.com/watch?v=fiShX2pTz9A)</br>
[PONG - First documented Video Ping-Pong game - 1969](https://www.youtube.com/watch?v=XNRx5hc4gYc)
### References Technology
[HTML5 Canvas Tutorial](https://www.youtube.com/watch?v=EO6OkltgudE)</br>
### References Design
[Gufram website](https://gufram.it/)
