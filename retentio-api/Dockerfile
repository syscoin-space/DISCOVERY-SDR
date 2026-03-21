FROM node:22-alpine
WORKDIR /app

# Install ALL dependencies (tsx is in devDependencies)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source
COPY . .

EXPOSE 3001

CMD ["npm", "start"]
