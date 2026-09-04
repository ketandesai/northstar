FROM node:22-alpine

WORKDIR /app

# Install libc6-compat for Alpine compatibility with Next.js & native modules, and postgresql-client for DB operations
RUN apk add --no-cache libc6-compat postgresql-client

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=development

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
