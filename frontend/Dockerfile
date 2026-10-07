# syntax=docker/dockerfile:1

# Build : Node 24 + Angular CLI
FROM node:24-slim AS build
WORKDIR /workspace

# Dépendances d'abord : la couche reste en cache tant que package-lock.json ne change pas
COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig.json tsconfig.app.json ./
COPY public public
COPY src src
# Les tests tournent en CI (Vitest), pas dans l'image
RUN npx ng build

# Exécution : nginx sert l'appli compilée et relaie /api vers le backend (nginx.conf)
FROM nginx:1.30-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
