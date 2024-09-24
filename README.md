Copyright (c) 2024 kodestan

# tank-ops

Multiplayer turn-based browser game. Client side in Typescript, backend in Go.

The more developed version of this game available at [tankops.xyz](https://tankops.xyz).

Code only up to the point

![scene from the game](/docs/game.png)

## Usage

### Manual

You need to have Go and TypeScript installed to build and run project.

Run these commands from the project's root dir.

1. Build .js files
```
tsc
```

2. Run server on port 8000
```
go run .
```

3. Open your browser on `127.0.0.1:8000`

### Docker

1. Build container (once)
```
docker build -t tank-ops:latest .
```

2. Run server on port 8000
```
docker run -it -p 8000:8000 tank-ops:latest
```

3. Open your browser on `127.0.0.1:8000`
