# proto-bow-buddy

A mobile app for keeping track of your score in archery for 3D parcours.

This is a web-based prototype for an Android app called BowBuddy.

## Install all dependencies after a fresh checkout:
```mkdir ~/.npm-global
npm config set prefix ~/.npm-global
echo "export PATH=\$PATH:\$HOME/.npm-global/bin" >> ~/.bashrc
source ~/.bashrc
npm install -g typescript node-sass
npm install```

## Generate CSS files from SCSS (starts SASS compiler in watch mode)
`node-sass -w -o css --source-map true --output-style expanded --indent-type space --indent-width 2 src/styles`

## Generate JavaScript code from TypeScript (starts TypeScript compiler in watch mode)
`tsc -w`