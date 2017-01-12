#!/usr/bin/env bash

npm run build:dev;
npm run build;
git add dist/;
git commit -m ":package: Build dist.";

