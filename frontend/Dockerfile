FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install --legacy-peer-deps

COPY . .

# CRA bakes REACT_APP_* vars in at build time, so it must be passed as a
# build arg (e.g. `docker build --build-arg REACT_APP_BACKEND_URL=https://api.example.com`).
ARG REACT_APP_BACKEND_URL=http://localhost:8000
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
RUN yarn build

# Production image
FROM node:18-alpine

WORKDIR /app
RUN npm install -g serve

COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
