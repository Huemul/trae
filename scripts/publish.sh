#!/usr/bin/env bash

npm run build:dev;
npm run build;
git add dist/;
npm run contributors;
git commit README.md -m ':ghost: Update contributors.'
git commit -m ":package: Build dist.";
