# Spustenie Ganner aplikácie na serveri

Návod na nasadenie a spustenie celej aplikácie (Next.js + Prisma + PostgreSQL) na serveri.

---

## Požiadavky

- **Node.js** 18+ (odporúčaná LTS)
- **PostgreSQL** 14+
- **npm** (prichádza s Node.js)

---

## 1. Príprava servera

### Inštalácia Node.js (ak chýba)

```bash
# Ubuntu/Debian – cez NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Overenie
node -v
npm -v
```

### Inštalácia PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Spustenie služby
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Vytvorenie databázy a používateľa

```bash
sudo -u postgres psql
```

V konzole PostgreSQL:

```sql
CREATE USER ganner WITH PASSWORD 'tvoje_heslo';
CREATE DATABASE ganner OWNER ganner;
\q
```

---

## 2. Nasadenie aplikácie

### Klonovanie / kopírovanie projektu

```bash
cd /var/www   # alebo iný adresár
git clone https://github.com/TVOJ_USER/ganner.git
cd ganner
```

Alebo nahraj projekt (napr. cez SCP/SFTP) do zvoleného adresára.

### Inštalácia závislostí

```bash
npm ci
```

*(`npm ci` je vhodnejší na server – inštaluje presne podľa `package-lock.json`.)*

---

## 3. Konfigurácia prostredia

Vytvor súbor `.env` v koreni projektu (môžeš vychádzať z `.env.example`):

```bash
cp .env.example .env
nano .env
```

Vyplň:

```env
# Databáza – uprav host, user, heslo a názov DB podľa servera
DATABASE_URL="postgresql://ganner:tvoje_heslo@localhost:5432/ganner?schema=public"

# JWT – V PRODUKCII POUŽI NOVÝ BEZPEČNÝ KLÚČ!
JWT_SECRET="tvoj-dlhy-nahodny-secret-min-32-znakov"

# Adresár pre súbory (katalóg, zákazky) – musí existovať a mať práva na zápis
STORAGE_ROOT="/data/gannomat"
```

Dôležité:

- **JWT_SECRET**: v produkcii vygeneruj silný náhodný reťazec (napr. `openssl rand -base64 32`).
- **STORAGE_ROOT**: vytvor adresár a nastav práva, napr. `sudo mkdir -p /data/gannomat && sudo chown $USER:$USER /data/gannomat`.

---

## 4. Databáza

### Generovanie Prisma klienta

```bash
npm run db:generate
```

### Migrácie (vytvorenie tabuliek)

```bash
npm run db:push
```

Alebo ak používaš migrácie:

```bash
npx prisma migrate deploy
```

### Voliteľne: seed (úvodné dáta, admin používateľ)

```bash
npm run db:seed
```

*(Predtým skontroluj, čo presne robí `prisma/seed.ts` – napr. vytvorenie admin účtu.)*

---

## 5. Build a spustenie

### Build produkčnej verzie

```bash
npm run build
```

### Spustenie aplikácie

```bash
npm run start
```

Aplikácia beží štandardne na **http://localhost:3000**.

---

## 6. Spustenie na pozadí (produkcia)

### Možnosť A: PM2

```bash
# Inštalácia PM2 globálne
sudo npm install -g pm2

# Spustenie
pm2 start npm --name "ganner" -- start

# Automatický štart po reštarte servera
pm2 startup
pm2 save
```

Užitočné príkazy:

- `pm2 status` – stav
- `pm2 logs ganner` – logy
- `pm2 restart ganner` – reštart

### Možnosť B: systemd

Vytvor súbor `/etc/systemd/system/ganner.service`:

```ini
[Unit]
Description=Ganner Next.js App
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ganner
Environment=NODE_ENV=production
EnvironmentFile=/var/www/ganner/.env
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Potom:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ganner
sudo systemctl start ganner
sudo systemctl status ganner
```

*(Uprav `User`, `WorkingDirectory` a cestu k `.env` podľa svojho servera.)*

---

## 7. Reverse proxy (Nginx, HTTPS)

Pre verejný prístup a HTTPS odporúčame Nginx pred Next.js:

```nginx
server {
    listen 80;
    server_name tvoja-domena.sk;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Pre HTTPS použi napr. certbot: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx`.

---

## Rýchly prehľad príkazov

| Krok              | Príkaz                 |
|-------------------|------------------------|
| Závislosti        | `npm ci`               |
| Prisma client     | `npm run db:generate`  |
| DB tabuľky        | `npm run db:push`      |
| Seed (voliteľné)  | `npm run db:seed`      |
| Build             | `npm run build`        |
| Spustenie         | `npm run start`        |

---

## Riešenie problémov

- **Databáza sa nepripája**: skontroluj `DATABASE_URL`, že PostgreSQL beží (`sudo systemctl status postgresql`) a že user má práva na DB.
- **Chyby pri migrácii**: over, či v `DATABASE_URL` je správny názov databázy a že používateľ je owner alebo má potrebné práva.
- **STORAGE_ROOT**: ak aplikácia nevie čítať/zapisovať súbory, skontroluj existenciu adresára a práva (`ls -la /data/gannomat`).
- **Port 3000 obsadený**: zmeň port cez `PORT=3001 npm run start` alebo v systemd/PM2 pridaj `Environment=PORT=3001`.
