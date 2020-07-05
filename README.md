# Ceramic CLI

## Simple to install:
```sh
# With Yarn
yarn global add gufoe/ceramic-cli

# Or with NPM
npm -g i gufoe/ceramic-cli
```


## Simple to use
Set current project for current directory (will put config in `.ceramic`).
```sh
ceramic set PROJECT-SECRET
```

Zip folder, upload to server, queue build, and download apk when ready:
```sh
ceramic build ./www/
Zipping ./www/
Build queued
      building
      built
Downloading apk...
/tmp/41074beb-1d47-51cd-b422-e76011701a75.apk
```
