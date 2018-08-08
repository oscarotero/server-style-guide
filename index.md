---
layout: default

config: Ubuntu 18.04 + Nginx + PHP 7.2

sections:
  - title: Getting started
    steps:
      - title: Update & upgrade system
        code: |
          ```sh
          apt update
          apt upgrade
          ```

      - title: Install basic packages
        code: |
          ```sh
          apt install language-pack-es-base
          apt install unzip
          apt install nginx
          apt install mysql-server
          apt install php7.2-common php7.2-cli php7.2-fpm
          apt install php7.2-curl php7.2-gd php-imagick php7.2-mbstring php7.2-xml php7.2-mysql
          apt install composer
          apt install certbot
          apt install python3-certbot-nginx
          ```

      - title: Disable SSH password authentication
        optional: true
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
        optional: true
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

  - title: Server configuration
    steps:
      - title: Download nginx snippets to use later
        code: |
          ```sh
          service nginx stop
          cd /etc/nginx
          git clone https://github.com/oscarotero/nginx-snippets.git snippets/nginx-snippets
          ```

      - title: Set the default php config
        code: |
          ```sh
          cd /etc/php/7.2/fpm/pool.d/
          mv www.conf default
          ```

  - title: Deploy user
    steps:
      - title: Create the user
        code: |
          ```sh
          adduser --home /var/www/mydomain.com myuser
          ```

      - title: Generate the ssh keys
        code: |
          ```sh
          su - myuser
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
          exit # exit of user
          chmod 710 /var/www/mydomain.com
          chmod 770 /var/www/mydomain.com/logs
          chgrp www-data /var/www/mydomain.com /var/www/mydomain.com/logs
          ```

  - title: Site configuration
    steps:
      - title: Create the database
        code: |
          Create also the user and configure the privileges

          ```sql
          CREATE DATABASE `myuser` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_general_ci;
          CREATE USER 'myuser'@'localhost' IDENTIFIED BY 'mypassword';
          GRANT ALL PRIVILEGES ON `myuser`.* TO 'myuser'@'localhost';
          FLUSH PRIVILEGES;
          ```

      - title: Configure the PHP
        code: |
          Rename the default conf file and create a pool for this domain:

          ```sh
          cd /etc/php/7.2/fpm/pool.d/
          cp default myuser.conf
          vi myuser.conf
          ```

          Edit the `myuser.conf` file with the following changes:

          ```
          ; pool name ('www' here)
          [myuser]

          user = myuser
          group = myuser

          listen = /run/php/php7.2-fpm-$pool.sock

          php_admin_value[error_log] = /var/www/mydomain.com/logs/php.error
          ```

          ```sh
          service php7.2-fpm restart
          ```

      - title: Configure the server
        code: |
          ```sh
          cd /etc/nginx/sites-available
          vi mydomain.com
          ```

          ```
          # http -> https
          server {
            listen [::]:80;
            listen 80;

            server_name mydomain.com www.mydomain.com;

            return 301 https://$host$request_uri;
          }

          # www -> non-www
          server {
            listen [::]:443 ssl http2;
            listen 443 ssl http2;

            server_name www.mydomain.com;

            return 301 https://$host$request_uri;
          }

          server {
            listen [::]:443 ssl http2;
            listen 443 ssl http2;

            server_name mydomain.com;

            root /var/www/mydomain.com/www;

            include snippets/nginx-snippets/common.conf;

            location / {
              include snippets/nginx-snippets/html.conf;
            }

            # Media: images, icons, video, audio, HTC
            location ~* \.(?:jpg|jpeg|gif|png|ico|cur|gz|svg|mp4|ogg|ogv|webm|htc)$ {
              include snippets/nginx-snippets/media.conf;
            }

            # Fonts
            location ~* \.(?:ttf|ttc|otf|eot|woff|woff2)$ {
              include snippets/nginx-snippets/fonts.conf;
            }

            # CSS
            location ~* \.css$ {
              include snippets/nginx-snippets/css.conf;
            }

            # Javascript
            location ~* \.js$ {
              include snippets/nginx-snippets/js.conf;
            }

            location ~ \.php$ {
              fastcgi_split_path_info ^(.+\.php)(/.+)$;
              fastcgi_pass unix:/var/run/php/php7.2-fpm-myuser.sock;
              fastcgi_index index.php;
              fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
              include fastcgi_params;
              include snippets/nginx-snippets/html.conf;
            }

            access_log /var/www/mydomain.com/logs/nginx.log combined buffer=32k flush=60;
            error_log  /var/www/mydomain.com/logs/nginx.error;
          }
          ```

      - title: Enable the site
        code: |
          ```sh
          cd /etc/nginx/sites-enabled/
          ln -s ../sites-available/mydomain.com mydomain.com
          ```

      - title: Create the certificate
        code: |
          ```sh
          certbot --nginx
          ```
          Note: Choose do not redirect from http to https because it's already configured
          Execute `certbot renew` to renew the certificates.
---