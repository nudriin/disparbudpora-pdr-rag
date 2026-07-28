# ================================================================
# Dockerfile - Chatbot Pariwisata Palangka Raya
# Multi-stage build untuk image produksi yang ringan.
# Target deployment: Google Cloud Run
# ================================================================

# ----------------------------------------------------------------
# Stage 1: Dependencies
# Install semua npm dependencies
# ----------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Install libc compat untuk Alpine (dibutuhkan beberapa native modules)
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (production + dev untuk build)
RUN npm ci --frozen-lockfile

# ----------------------------------------------------------------
# Stage 2: Builder
# Build aplikasi Next.js
# ----------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies dari stage sebelumnya
COPY --from=deps /app/node_modules ./node_modules

# Copy semua source code
COPY . .

# Set environment untuk build
# Variabel placeholder — nilai asli diset di Cloud Run saat runtime
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
ENV NEXT_PUBLIC_APP_URL=https://placeholder.run.app

# Build Next.js — output: standalone untuk ukuran image minimal
RUN npm run build

# ----------------------------------------------------------------
# Stage 3: Runner
# Image produksi yang ringan — hanya berisi file yang diperlukan
# ----------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Buat user non-root untuk keamanan
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy file publik
COPY --from=builder /app/public ./public

# Buat direktori .next/cache dan set permission
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy output standalone Next.js
# next.config.ts harus punya output: 'standalone' untuk ini bekerja
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud Run mengirim PORT sebagai env var (default 8080)
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Start server
CMD ["node", "server.js"]
