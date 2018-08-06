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
      - title: Download basic nginx config
        code: |
          ```sh
          service nginx stop
          cd /etc
          mv nginx nginx-previous
          git clone https://github.com/h5bp/server-configs-nginx.git nginx
          cp nginx-previous/fastcgi* nginx/
          ```
          Thanks to [h5bp/server-configs-nginx](https://github.com/h5bp/server-configs-nginx/)

      - title: Edit some default configuration
        code: |
          ```sh
          cd nginx
          vi nginx.conf
          ```

          Make the following changes:

          ```conf
          user www-data www-data;

          error_log  /var/log/nginx/error.log warn;
          access_log /var/log/nginx/access.log main;
          ```

      - title: Load config not loaded by default
        code: |
          ```sh
          vi h5bp/full.conf
          ```
          
          Copy the following code:

          ```conf
          include h5bp/directive-only/no-transform.conf;
          include h5bp/directive-only/cache-file-descriptors.conf;
          include h5bp/directive-only/ssl.conf;
          include h5bp/directive-only/extra-security.conf;
          include h5bp/directive-only/x-ua-compatible.conf;
          include h5bp/directive-only/ssl-stapling.conf;
          include h5bp/location/cache-busting.conf;
          include h5bp/location/expires.conf;
          include h5bp/location/protect-system-files.conf;
          include h5bp/location/cross-domain-fonts.conf;
          ```

          Open the file:

          ```sh
          vi h5bp/directive-only/ssl.conf;
          ```

          And uncomment the line containing the text:

          ```
          add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
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
          mv www.conf default # this only the first time
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
          cp ssl.example.com mydomain.com
          sed -i 's/example.com/mydomain.com/g' mydomain.com
          vi mydomain.com
          ```

          Edit the file to enable php-pfm and configure the logs: 

          ```
          server {
            # Here the other config

            index index.php index.html index.htm;

            location / {
              try_files $uri $uri/ /index.php;
            }

            location ~ \.php$ {
              fastcgi_split_path_info ^(.+\.php)(/.+)$;
              fastcgi_pass unix:/var/run/php/php7.2-fpm-myuser.sock;
              fastcgi_index index.php;
              fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
              include fastcgi_params;
            }

            access_log /var/www/mydomain.com/logs/nginx.log combined buffer=32k flush=60;
            error_log  /var/www/mydomain.com/logs/nginx.error;

            include h5bp/full.conf;
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