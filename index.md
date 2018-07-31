---
layout: default

config: Ubuntu 18.04 + Nginx + PHP 7.2

sections:
  - title: Getting started
    steps:
      - title: Update & upgrade system
        code: |
          ```sh
          apt-get update
          apt-get upgrade
          ```

      - title: Add extra repositories
        class: is-optional
        code: |
          ```sh
          add-apt-repository ppa:ondrej/php
          add-apt-repository ppa:nginx/stable
          ```
          This allows to install the latest versions of PHP and nginx

      - title: Install nginx and PHP
        code: |
          ```sh
          apt-get install nginx
          apt-get install php7.2 php7.2-cli php7.2-fpm php7.2-curl php7.2-gd php7.2-json
          ```
          To see all php7.2 packages available, execute `apt-cache search php7.2 | grep ^php7.2`

      - title: Disable SSH password authentication
        class: is-optional
        code: |
          Edit `/etc/ssh/sshd_config`:

          ```
          PasswordAuthentication no
          PubkeyAuthentication yes
          ChallengeResponseAuthentication no
          ```
          ```sh
          service ssh reload
          ```

      - title: Add Swap file
        class: is-optional
        code: |
          Example with 1GB file saved as `/swapfile`, but that [depends of your needs](http://askubuntu.com/a/5933).

          ```sh
          fallocate -l 1G /swapfile
          chmod 600 /swapfile
          mkswap /swapfile
          swapon /swapfile
          echo "/swapfile none swap sw 0 0" >> /etc/fstab
          sysctl vm.swappiness=10
          sysctl vm.vfs_cache_pressure=50
          ```

          Edit the file `/etc/sysctl.conf` with the following values:

          ```conf
          vm.swappiness=10
          vm.vfs_cache_pressure=50
          ```

  - title: Deploy user
    steps:
      - title: Create the user
        code: |
          ```sh
          adduser --home /var/www/example.com example
          ```

      - title: Generate the ssh keys
        code: |
          ```sh
          su - example
          ssh-keygen
          ```

          Insert your public key in `.ssh/authorized_keys` to login to this server with this username

      - title: Create the directories to web and logs
        code: |
          ```sh
          mkdir www
          mkdir logs
          ```
      - title: Assign the correct permissions to the directory
        code: |
          ```sh
          exit # exit of user example
          chmod 710 /var/www/example.com
          chmod 770 /var/www/example.com/logs
          chgrp www-data /var/www/example.com /var/www/example.com/logs
          ```

  - title: Mysql database
    steps:
      - title: Install Mysql and PHP driver
        code: |
          ```sh
          apt-get install mysql-server
          apt-get install php7.2-mysql
          ```

      - title: Create the database
        code: |
          ```sql
          CREATE DATABASE `example` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_general_ci;
          ```

      - title: Create the user and configure the privileges
        code: |
          ```sql
          CREATE USER 'example'@'localhost' IDENTIFIED BY 'password';
          GRANT ALL PRIVILEGES ON `example`.* TO 'example'@'localhost';
          FLUSH PRIVILEGES;
          ```
  - title: Certificate authority
    steps:
      - title: Install certbot
        code: |
          ```sh
          apt-get install certbot
          ```

      - title: Create a sh script to create or renew certificates
        code: |
          Note that we are creating the certificates to both `www.example.com` and `example.com`.
          Create the file `/root/certbot.sh`:

          ```sh
          #!/bin/bash

          /usr/bin/certbot certonly \
            --renew-by-default \
            --agree-tos \
            --email example@gmail.com \
            --webroot \
            -w /var/www/example.com/www \
            -d example.com \
            -d www.example.com

          /usr/sbin/service nginx reload
          ```
          For additional subdomains, just add new `-w` and `-d` arguments.
          For additional domains, it's better to create a different script.

          Add permission to execute the script:
          ```sh
          chmod +x certbot.sh
          ```

      - title: Renew the certificate automatically
        class: is-optional
        code: |
          ```sh
          mkdir /root/logs
          crontab -e
          ```

          Add the following line:

          ```
          50  04  01  *  *  /root/certbot.sh >> /root/logs/certbot.log 2>&1
          ```
  - title: Server configuration
    steps:
      - title: Download basic nginx config
        code: |
          ```sh
          service nginx stop
          cd /etc
          mv nginx nginx-previous
          git clone https://github.com/h5bp/server-configs-nginx.git nginx
          ```
          Thanks to [h5bp/server-configs-nginx](https://github.com/h5bp/server-configs-nginx/)

      - title: Copy fastcgi files from original nginx config
        code: |
          ```bash
          cp nginx-previous/fastcgi* nginx/
          ```

      - title: Edit some default configuration
        code: |
          Change username and log filepath in `/etc/nginx/nginx.conf`:

          ```conf
          user www-data www-data;

          error_log  /var/log/nginx/error.log warn;
          access_log /var/log/nginx/access.log main;
          ```

      - title: Configure the default server
        code: |
          Edit the file `/etc/nginx/sites-available/default`:

          ```conf
          server {
              listen 80 default_server;
              listen [::]:80 default_server;

              server_name _;

              return 301 https://example.com;
          }
          ```

      - title: Load config not loaded by default
        code: |
          Create the file `/etc/nginx/h5bp/full.conf`:

          ```conf
          include h5bp/directive-only/no-transform.conf;
          include h5bp/directive-only/cache-file-descriptors.conf;
          include h5bp/directive-only/ssl.conf;
          include h5bp/directive-only/extra-security.conf;
          include h5bp/directive-only/x-ua-compatible.conf;
          include h5bp/directive-only/cross-domain-insecure.conf;
          include h5bp/directive-only/ssl-stapling.conf;
          include h5bp/location/cache-busting.conf;
          include h5bp/location/expires.conf;
          include h5bp/location/protect-system-files.conf;
          include h5bp/location/cross-domain-fonts.conf;
          ```


  - title: Domain configuration
    steps:
      - title: Configure the php pool
        code: |
          Rename the default conf file and create a pool for this domain:

          ```sh
          cd /etc/php/7.2/fpm/pool.d/
          mv www.conf default
          cp default example.conf
          ```

          Edit the `example.conf` file with the following changes:
          ```conf
          ; pool name ('www' here)
          [example]

          user = example
          group = example

          listen = /run/php/php7.2-fpm-$pool.sock

          php_admin_value[error_log] = /var/www/example.com/logs/php.error
          ```

      - title: Configure the server domain
        code: |
          Edit the file `/etc/nginx/sites-available/example.com`:

          ```conf
          # Redirect from http to https
          server {
              listen 80;

              server_name example.com www.example.com;

              return 301 https://example.com$request_uri;
          }

          # Redirect from www to domain
          server {
            listen 443 ssl http2;

            server_name www.example.com;

            return 301 https://example.com$request_uri;

            ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
            ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
          }

          # Server config
          server {
            listen 443 ssl http2 default_server;

            server_name example.com;

            root /var/www/example.com/www;
            index index.html index.php;

            location / {
              try_files $uri $uri/ /index.php?$query_string;

              if ($request_method = "OPTIONS") {
                add_header "Access-Control-Max-Age" 1728000;
                add_header "Content-Type" "text/plain; charset=UTF-8";
                add_header "Content-Length" 0;

                return 204;
              }
            }

            location ~ \.php$ {
              fastcgi_split_path_info ^(.+\.php)(/.+)$;
              fastcgi_pass unix:/var/run/php/php7.2-fpm-example.sock;
              fastcgi_index index.php;
              fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
              include fastcgi_params;
            }

            ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
            ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

            access_log /var/www/example.com/logs/nginx.log combined buffer=32k flush=60;
            error_log  /var/www/example.com/logs/nginx.error;

            include h5bp/full.conf;
          }
          ```
      - title: Configure a alias to a subdirectory
        class: is-optional
        code: |
          Inside the server config:

          ```conf
          location /subdirectory {
                alias /var/www/example.com/www-subdirectory/public;

                location ~ \.php$ {
                        fastcgi_split_path_info ^(.+\.php)(/.+)$;
                        fastcgi_pass unix:/var/run/php/php7.2-fpm-example.sock;
                        fastcgi_index index.php;
                        fastcgi_param SCRIPT_FILENAME $request_filename;
                        fastcgi_param REQUEST_URI $uri?$args;
                        include fastcgi_params;
                }
          }
          ``

---