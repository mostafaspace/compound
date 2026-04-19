#!/usr/bin/env sh
set -e

if [ ! -f .env ]; then
  cp .env.example .env
fi

set_env_value() {
  key="$1"
  value="$(printenv "$key" || true)"

  if [ -z "$value" ]; then
    return
  fi

  escaped_value="$(printf '%s' "$value" | sed 's/[&]/\\&/g')"

  if grep -q "^$key=" .env; then
    sed -i "s|^$key=.*|$key=$escaped_value|" .env
  else
    printf '\n%s=%s\n' "$key" "$value" >> .env
  fi
}

for key in \
  APP_ENV APP_DEBUG APP_URL ADMIN_APP_URL \
  DB_CONNECTION DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD \
  REDIS_HOST REDIS_PORT CACHE_STORE QUEUE_CONNECTION SESSION_DRIVER \
  BROADCAST_CONNECTION FILESYSTEM_DISK \
  AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION AWS_BUCKET AWS_ENDPOINT AWS_USE_PATH_STYLE_ENDPOINT \
  MAIL_MAILER MAIL_HOST MAIL_PORT \
  REVERB_APP_ID REVERB_APP_KEY REVERB_APP_SECRET REVERB_HOST REVERB_PORT REVERB_SCHEME
do
  set_env_value "$key"
done

if [ ! -f vendor/autoload.php ]; then
  mkdir -p storage/framework
  lock_dir="/var/www/html/storage/framework/composer-install.lock"

  while ! mkdir "$lock_dir" 2>/dev/null; do
    echo "Waiting for Composer install lock..."
    sleep 2
  done

  trap 'rmdir "$lock_dir" 2>/dev/null || true' EXIT

  if [ ! -f vendor/autoload.php ]; then
    composer install --no-interaction --prefer-dist
  fi

  rmdir "$lock_dir" 2>/dev/null || true
  trap - EXIT
fi

if ! grep -q '^APP_KEY=base64:' .env; then
  php artisan key:generate --force
fi

exec "$@"
