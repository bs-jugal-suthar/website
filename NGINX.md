# Nginx — Complete Guide for This Project

## What is Nginx?

Nginx (pronounced "engine-x") is a **web server** — its job is to receive requests from browsers and send back files or responses.

### Simple Analogy

Think of it like a **receptionist** at an office:
- A visitor (browser) comes and asks for something
- The receptionist (Nginx) checks what they need
- Hands them the right file or directs them to the right person

---

## Why Do We Need Nginx?

Your browser types `http://<EC2-IP>` — something needs to **listen on port 80** and return `index.html`. That's Nginx's job.

Without Nginx, you'd have to type `http://<EC2-IP>:3000` for everything, and your Node.js server would have to serve both the website and the API.

**With Nginx (our setup):**

```
Browser → http://<EC2-IP>       → Nginx (port 80)   → returns index.html, style.css, app.js
Browser → http://<EC2-IP>:3000  → Node.js (port 3000) → returns API JSON
```

---

## Nginx vs Node.js

| | Nginx | Node.js |
|---|---|---|
| Best at | Serving static files (HTML, CSS, images) | Running logic, APIs, databases |
| Speaks | Files from disk | JavaScript code |
| Our port | 80 | 3000 |
| Our use | Serve the website | Serve `/api/health`, `/api/info` |

---

## Our nginx.conf — Line by Line

```nginx
server {                          # defines one "virtual server" (like one website)
    listen 80;                    # listen for requests on port 80 (default HTTP port)
    server_name _;                # _ means "accept any domain or IP"

    root /var/www/basic-application/website;   # where your HTML/CSS/JS files are
    index index.html;             # default file to serve when someone visits /

    location / {                  # when someone requests any URL path
        try_files $uri $uri/ /index.html;
        # try to find the exact file → if not found → fallback to index.html
    }
}
```

---

## What is server_name?

`server_name` tells Nginx **which requests to accept** based on the domain name or IP in the request.

### In our config:
```nginx
server_name _;
```
`_` is a **wildcard** — it means *"accept requests from any domain or IP"*.

So whether someone visits:
- `http://54.123.45.67` (EC2 IP)
- `http://mywebsite.com`
- `http://anything`

Nginx will respond to all of them.

### When would you use a real server_name?

If you have a **domain name** pointing to your EC2, you'd write:
```nginx
server_name mywebsite.com www.mywebsite.com;
```

This tells Nginx — *"only respond when the request is for this specific domain"*.

---

## Virtual Hosting — Two Sites on Same Port 80

You can run **multiple websites on the same EC2** using one port. This is called **Virtual Hosting**.

```nginx
server {
    listen 80;
    server_name siteA.com;
    root /var/www/siteA;
}

server {
    listen 80;
    server_name siteB.com;
    root /var/www/siteB;
}
```

### How does Nginx tell them apart?

When your browser makes a request, it automatically sends the **domain name in the Host header**:

```
GET / HTTP/1.1
Host: siteA.com        ← browser includes this automatically
```

Nginx reads this `Host` header and routes to the matching `server_name`.

### Step by Step Flow

```
Browser visits siteA.com
        ↓
Request hits EC2 on port 80
        ↓
Nginx reads Host: siteA.com
        ↓
Nginx matches server_name siteA.com
        ↓
Serves files from /var/www/siteA
```

```
Browser visits siteB.com
        ↓
Request hits EC2 on port 80
        ↓
Nginx reads Host: siteB.com
        ↓
Nginx matches server_name siteB.com
        ↓
Serves files from /var/www/siteB
```

### Simple Analogy

Think of an **apartment building**:
- Building address = EC2 IP (same for everyone)
- Port 80 = the main entrance (same door)
- `server_name` = apartment number (tells you which flat to go to)

Same building, same door — different apartments.

### Why IP Alone is Not Enough for Multiple Sites

| | Single Site | Multiple Sites |
|---|---|---|
| Port | 80 | 80 (same) |
| IP | same | same |
| Differentiated by | nothing needed | `server_name` / Host header |

This is exactly how thousands of websites run on shared hosting — **one server, many domains, one port**.

---

## Deployment Steps (Ubuntu)

> These steps target **Ubuntu** EC2 (default SSH user `ubuntu`). Ubuntu uses
> `apt` and the `sites-available` / `sites-enabled` layout. The instance also
> ships a stock "default" site that **must be removed**, or you get a
> `duplicate default server` error and the nginx welcome page.

### 1. Install Node.js + Nginx

```bash
sudo apt update
sudo apt install -y nginx

# Node.js 20 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Get the code onto the server

```bash
cd ~
git clone https://github.com/jugalsuthar4/website.git basic-application
# (or: scp -i your-key.pem -r ~/.../basic-application ubuntu@<EC2-IP>:~/)
```

### 3. Run the Node API as a service

The API must keep running after you log out, so run it under systemd:

```bash
cd ~/basic-application/server
npm install --omit=dev

sudo tee /etc/systemd/system/basic-api.service > /dev/null <<'EOF'
[Unit]
Description=Basic Application API
After=network.target

[Service]
WorkingDirectory=/home/ubuntu/basic-application/server
ExecStart=/usr/bin/node index.js
Environment=PORT=3000
Restart=always
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now basic-api
curl http://localhost:3000/api/health   # should return JSON
```

### 4. Copy website files

```bash
sudo mkdir -p /var/www/basic-application
sudo cp -r ~/basic-application/website /var/www/basic-application/
```

### 4b. Generate the runtime config (API URL)

`app.js` reads the API URL from `window.APP_CONFIG.API_URL` (set in `config.js`).
Generate `config.js` from the template with the environment's API URL:

```bash
cd /var/www/basic-application/website
export API_URL=http://<EC2-IP>:3000
sudo -E bash -c 'envsubst < config.js.template > config.js'
```

Leave `API_URL` empty (or skip this step) to fall back to
`http://<current-host>:3000` automatically.

### 5. Place the Nginx config and remove the default site

```bash
# Enable our site
sudo cp ~/basic-application/nginx.conf /etc/nginx/sites-available/basic-application
sudo ln -sf /etc/nginx/sites-available/basic-application /etc/nginx/sites-enabled/

# Remove the stock default site (prevents "duplicate default server")
sudo rm -f /etc/nginx/sites-enabled/default
```

> `rm` only deletes the **symlink** in `sites-enabled` — the original stays in
> `/etc/nginx/sites-available/default`, so it's reversible. Keep `nginx.conf`
> as `listen 80; server_name _;` (do **not** add `default_server`); removing
> the default site already clears the conflict.

### 6. Test and start Nginx

```bash
sudo nginx -t                 # test config for errors
sudo systemctl reload nginx   # apply without downtime
sudo systemctl enable nginx   # auto-start on reboot
```

---

## Troubleshooting

**You see the "Welcome to nginx!" page instead of your site.**
The stock default site is still active. Confirm and fix:

```bash
ls -l /etc/nginx/sites-enabled/        # should NOT list "default"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

**`nginx -t` reports `duplicate default server for 0.0.0.0:80`.**
Two server blocks claim `default_server`. Remove the default site (above) and
make sure your `nginx.conf` does **not** also set `default_server`.

**Site loads but the Ping button says "Server unreachable".**
The Node API isn't running or port 3000 is closed. Check:

```bash
sudo systemctl status basic-api
curl http://localhost:3000/api/health
```

Also confirm port 3000 is open in the EC2 security group.

---

## EC2 Security Group Ports

| Port | Purpose |
|---|---|
| 22 | SSH |
| 80 | Static website (Nginx) |
| 3000 | Node.js API server |

---

## Access URLs

| What | URL |
|---|---|
| Static Website | `http://<EC2-IP>` |
| API Health | `http://<EC2-IP>:3000/api/health` |
| API Info | `http://<EC2-IP>:3000/api/info` |
