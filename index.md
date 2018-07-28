---
layout: default

config: Ubuntu 18.04 + Nginx + PHP7

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
          add-apt-repository ppa:nginx/$nginx
          ```
          This allows to install the latest versions of PHP and nginx

      - title: Install nginx and PHP
        code: |
          ```sh
          apt-get install nginx
          apt-get install php
          ```

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
          usermod -aG sudo example
          ```

      - title: Generate the ssh keys
        code: |
          ```sh
          su - example
          ssh-keygen
          ```

          Insert the authorized keys in `.ssh/authorized_keys`

      - title: Create the directories to web and logs
        code: |
          ```sh
          mkdir www
          mkdir logs
          ```

  - title: Mysql database
    steps:
      - title: Install Mysql and PHP driver
        code: |
          ```sh
          apt-get install mysql-server
          apt-get install php-mysql
          ```

      - title: Create the database
        code: |
          ```sql
          CREATE DATABASE `example` DEFAULT CHARACTER SET utf8 DEFAULT COLLATE utf8_general_ci;
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
          apt-get install python-certbot-apache
          ```

      - title: Create the certificate
        code: |
          Note that we are creating the certificates to both `www.example.com` and `example.com`.

          ```sh
          service apache2 stop
          certbot certonly --standalone --agree-tos --renew-by-default -d example.com -d www.example.com
          ```

      - title: Renew the certificate automatically
        class: is-optional
        code: |
          Create the file `/root/cert-renew.sh`:

          ```sh
          #!/bin/sh

          service apache2 stop
          certbot certonly --standalone --agree-tos --renew-by-default -d example.com -d www.example.com
          service apache2 start
          ```

          Then, execute:

          ```sh
          mkdir /root/logs
          chmod +x cert-renew.sh
          crontab -e
          ```

          Add the following line:

          ```
          50  04  01  *  *  /root/cert-renew.sh >> /root/logs/cert-renew.log 2>&1
          ```
  - title: Server configuration
    steps:
      - title: Download basic nginx config
        code: |
          ```sh
          service nginx stop
          cd /etc
          mv nginx nginx-previous
          git clone git@github.com:h5bp/server-configs-nginx.git nginx

          ```
          Thanks to [h5bp/server-configs-nginx](https://github.com/h5bp/server-configs-nginx/)
---