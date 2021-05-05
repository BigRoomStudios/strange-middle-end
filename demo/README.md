Usage demo, using UMD build

To run,

```sh
# where cwd is this directory
npm run build
cp ../dist/strange-middle-end.umd.min.js .
npx http-server # Or your http server of choice e.g. python -m SimpleHTTPServer
```