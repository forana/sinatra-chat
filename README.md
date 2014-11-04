# sinatra-chat

A web chat implementation using knockout, Falcon.js, Sinatra, and Sequel. Backed by postgres.

Very simple - doesn't have authentication and does some very un-sane things. Don't actually run this anywhere in public.

## Setup

Requirements:

* ruby
* bundler (`gem install bundler`)
* sass (`gem install sass`)
* bower
* postgres running somewhere with its connection string stored in the environment variable `DATABASE_URL`

First-time Setup:

1. Clone this repo
2. `bower install`
3. `bundle install`

Starting the server: `ruby src/serve.rb` (or `foreman start`)

To watch for scss changes: `sass --watch src/public/assets/sass:src/public/assets/css`

## Deploying to heroku

Heroku doesn't automatically run bower installs without a custom buildback - here's a workaround. Assuming you're on `master` and have an app already created with the Heroku Postgres addon:

```
git checkout -b heroku
bower install
git add -f src/public/assets/bower_components
git commit -m "heroku assets"
git push heroku heroku:master
```

## Improvements

Somebody could make these, if they really wanted.

* Show the nickname in a more obvious way
* Track active users
* Implement long polling instead of polling every single second (would mean `setInterval` can't be used, but that's not a terribly difficult thing)
* Replace the `mergeFetch` workaround with a more sane usage of Falcon
* Resolve the TODO in app.js
* Split app.js up into sane chunks
* Have sinatra process sass rather than have to watch/commit
