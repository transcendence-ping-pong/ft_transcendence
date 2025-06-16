# transcendence
This project was developed for 42 school. For comprehensive information regarding the requirements, please consult the PDF file in the subject folder of the repository. Furthermore, we have provided our notes and a concise summary below.

```diff
+ keywords: single page application (SPA)
+ Pong game (1972)
+ Babylon.js open web rendering engine
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
```
AppController (main application orchestrator)
│
├── BabylonCanvas (3D scene, mesh, engine, render loop)
│     └── uses GameCanvas (2D game logic & rendering)
│     └── uses BabylonGUI (menus, overlays)
│
├── GameCanvas (2D Pong game logic & rendering)
│
└── BabylonGUI (Babylon.js GUI overlays)
```

```
frontend/
└── src/
    ├── app.ts
    ├── appController.ts
    ├── game/
    │   ├── BabylonCanvas.ts
    │   ├── GameCanvas.ts
    │   ├── GameManager.ts
    │   ├── Ball.ts
    │   ├── Paddle.ts
    │   ├── GameCourtBounds.ts
    │   └── ... (other game logic)
    ├── gui/
    │   └── BabylonGUI.ts
    ├── utils/
    │   ├── gameUtils/
    │   │   ├── types.ts
    │   │   ├── CrtFragmentShader.ts
    │   │   └── ...
    │   └── ...
    ├── pages/
    │   ├── Home.ts
    │   ├── Game.ts
    │   └── About.ts
    ├── styles/
    └── assets/
```

### Build the project
```
<!-- build docker image && start container, add -d for detached mode -->
sudo docker-compose up --build frontend
<!-- FE available at http://localhost:3000 -->
```

## Concepts

| Task | Prototype | Description |
|:----|:-----:|:--------|
| **Installing dependencies** | `cat /home/ubuntu/.npm/_logs/$(ls -t /home/ubuntu/.npm/_logs/ \| head -n1)` | Check for errors in `npm log`. |
| **Bundler** | `Webpack, Vite, Parcel` | Prepares the code (JS and other assets e.g. CSS, images, etc) for the browser, ready to be loaded. Using vite as bundler, don't need to manually compile tailwind CSS or Typescript. No need of `RUN npx tailwindcss -i ./src/styles/tailwind.css -o ./src/styles/output.css` `RUN npx tsc`. Moreover, now hot reload is available. |
| **Material JPG 1K** | `Ambient Occlusion(AO)` `Normal` `Specular` `Diffuse` | |
| **HDRI 2K HDR** | `` | |
| **Convert HDRI image** | [Babylon IBL tool](https://www.babylonjs.com/tools/ibl/) | After processing you should see something like an unwrapped box (environment file). |
| **Exporting Blender 3D models** | [Babylon Sandbox](https://sandbox.babylonjs.com/) | Check that location (x, y, z, set to zero), rotation (x, y, z, set to zero) and scale (x, y, z, set to one) are all normalised. If these values need to be changed, `CMD + A` `Apply all transforms`. Moreover, it is important to review the meshes naming (so it is possible to reference it properly in the code). Include selected objects, press `A` for selecting all. **VISUALISE MODEL FIRST IN BABYLON SANDBOX.** <img width="441" alt="Screenshot 2025-06-01 at 18 27 54" src="https://github.com/user-attachments/assets/cab197b8-41a5-4519-ac78-b712eaac6ba1" /> |
| **Blender basic commands** | | Create new mesh `SHIFT + A`. |
| **[Babylon Node Material Editor](https://nme.babylonjs.com/)** | | |
Z axis is pointing forward, babylon has different coordinate system than Blender
| **requestAnimationFrame** | [MDN web docs](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) | Constantly updates the scene, i.e. animations. Running two loops, one for Babylon.js and other for GameCanvas should be avoided. In Babylon render loop, call a method to update the 2D game (that acts as a dynamic texture in Babylon, applied to a plane). |
| **Prune/remove docker** | `docker system prune -af` `docker volume prune -f` | Prune unused resources. Clean unused volumes and images/containers `docker rmi` `docker rm` `docker-compose down`. |
| **node_modules** | `docker-compose exec backend ls node_modules` `docker-compose exec frontend ls -l /app/dist` | See backend/frontend `node_modules`, you can exec into the container. |

### References Game History
[Pong Game (1972)](https://www.ponggame.org/)</br>
[Pong, Computer History Museum](https://www.computerhistory.org/revolution/computer-games/16/183)</br>
[Pong - Video Game Console/TV Game Commercial 1976](https://www.youtube.com/watch?v=uCqIkgFKHr4)</br>
[Original Atari PONG (1972) arcade machine gameplay video](https://www.youtube.com/watch?v=fiShX2pTz9A)</br>
[The space age pinball machine (The New York Times, 1974)](https://www.nytimes.com/1974/09/15/archives/the-space-age-pinball-machine.html)</br>
[Woolco - TV Fun Pong Game (Commercial, 1976)](https://www.youtube.com/watch?v=6i5kZV_KOCU)</br>
[PONG - First documented Video Ping-Pong game - 1969](https://www.youtube.com/watch?v=XNRx5hc4gYc)</br></br>

![pong_references](https://github.com/user-attachments/assets/fb10b1ef-2034-45d7-99a7-49ba54800b8d)

### References Technology
[HTML5 Canvas Tutorial](https://www.youtube.com/watch?v=EO6OkltgudE)</br>
[Babylon Documentation](https://doc.babylonjs.com/features/featuresDeepDive/importers/loadingFileTypes)</br>
[Basic Scene in BabylonJS](https://www.youtube.com/watch?v=NLZuUtiL50A&list=PLym1B0rdkvqhuCNSXzxw6ofEkrpYI70P4&index=1)</br>
[Fun with Light Textures](https://www.youtube.com/watch?v=n2DLnMa21K0)</br>
[Babylon 2D controlers](https://www.youtube.com/watch?v=dISLIZ4SdAM)</br>
[Retro CRT Shader — A post processing effect study](https://babylonjs.medium.com/retro-crt-shader-a-post-processing-effect-study-1cb3f783afbc)
### References Design
[Gufram website](https://gufram.it/)</br>
[Atari Super Pong](https://www.turbosquid.com/3d-models/atari-super-pong-1859697)</br>
[Using procedural textures with Texture Space](https://www.youtube.com/watch?v=UBOZF5FPx7c)</br>
[Modeling an Atari Game Controller, Part 1](https://www.youtube.com/watch?v=Kq_H6yO2DrA)</br>
[Atari 2600 Model](https://sketchfab.com/3d-models/atari-2600-d02fe33dee524447b7dd00e7ca939cc4)</br>
[Poly Haven](https://polyhaven.com/)</br>
[Game Textures](https://gametextures.com/)</br>
