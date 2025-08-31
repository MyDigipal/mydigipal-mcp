# Utiliser l'image Node.js officielle
FROM node:18-alpine

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . ./

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Exposer le port
EXPOSE $PORT

# Commande de démarrage
CMD ["node", "server.js"]