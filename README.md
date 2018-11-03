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

## Generate CSS files from SCSS

`node-sass -o css --source-map true --output-style expanded --indent-type space --indent-width 2 src/styles`

For development, just run `npm run watch-sass` instead.

## Generate JavaScript code from TypeScript

`tsc`

For development, just run `npm run watch-ts` instead.

## Run web server locally for testing

`npm run server`

## Build everything using webpack

For production: `npm run build`
For development: `npm run dev`
