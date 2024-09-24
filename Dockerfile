# Prepare assets and js
FROM docker.io/library/node:slim AS ts-compiler

WORKDIR /usr/src/app
COPY tsconfig.json .
COPY web/ web/

RUN npm install -g typescript@5.6
RUN tsc


# Prepare a standalone binary that is not dependent on golang anymore
FROM docker.io/library/golang:alpine AS go-compiler

WORKDIR /usr/src/app
COPY . .

RUN go build


# Copy assets and js as well as the standalone binary into a final image
FROM docker.io/library/alpine:3.20

WORKDIR /usr/src/app
COPY --from=ts-compiler /usr/src/app/web/dist/ ./web/dist/
COPY --from=go-compiler /usr/src/app/tank-ops .

EXPOSE 8000

ENTRYPOINT ["/usr/src/app/tank-ops"]
