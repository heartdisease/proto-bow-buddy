# proto-bow-buddy

A mobile app for keeping track of your score in archery for 3D parcours.

This is a web-based prototype for an Android app called BowBuddy.

== Install all dependencies after a fresh checkout:
```mkdir ~/.npm-global
npm config set prefix ~/.npm-global
echo "export PATH=\$PATH:\$HOME/.npm-global/bin" >> ~/.bashrc
source ~/.bashrc
npm install -g typescript node-sass
npm install```

== Generate CSS files from SCSS
`node-sass -o css --source-map true --output-style compact src/styles`

== Generate JavaScript code from TypeScript
`tsc -w`