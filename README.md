# proto-bow-buddy

A mobile app for keeping track of your score in archery for 3D parcours.

This is a web-based prototype for an Android app called BowBuddy.

## Install all dependencies after a fresh checkout:

### (Optional) Configure npm to install packages globally without being root

`mkdir ~/.npm-global`

`npm config set prefix ~/.npm-global`

`echo "export PATH=\$PATH:\$HOME/.npm-global/bin" >> ~/.bashrc`

`source ~/.bashrc`

### Install build dependencies and required libraries

`npm install`

## Run web server locally for testing

`npm run webpack-server`

## Build everything using webpack

For development: `npm run dev` (better use `npm run webpack-server` instead)

For production: `npm run build`

## Clean `/dist` directory from generated files

`npm run clean`

## Run local HTTP server for serving files in `/dist`

`npm run server`
