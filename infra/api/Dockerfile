FROM php:8.3-cli-alpine

RUN apk add --no-cache \
        bash \
        curl \
        git \
        icu-dev \
        libzip-dev \
        linux-headers \
        oniguruma-dev \
        unzip \
        zip \
        $PHPIZE_DEPS \
    && docker-php-ext-install \
        bcmath \
        intl \
        pcntl \
        pdo_mysql \
        sockets \
        zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY infra/api/entrypoint.sh /usr/local/bin/api-entrypoint

RUN chmod +x /usr/local/bin/api-entrypoint

WORKDIR /var/www/html

ENTRYPOINT ["api-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
