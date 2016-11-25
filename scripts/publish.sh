#!/usr/bin/env bash

# use patch as default version mode
MODE=${1:-patch}

# formatting
# http://stackoverflow.com/a/20983251/4530566
RED=$(tput setaf 1);
GREEN=$(tput setaf 2);
BOLD=$(tput bold);

if  [ $MODE != major ] && [ $MODE != minor ] && [ $MODE != patch ] && [ $MODE != premajor ] && [ $MODE != preminor ] && [ $MODE != prepatch ] && [ $MODE != prerelease ]; then
  echo "${RED}\"${MODE}\" does not match any of the possible bump verion modes:";
  echo '';
  echo "${GREEN}${BOLD}Please use one of the following: major | minor | patch | premajor | preminor | prepatch | prerelease";
  echo '';
  exit 1;
fi

if [ $(git name-rev --name-only HEAD) = "master" ]; then
  echo "${GREEN}Starting publish process...";
  echo '';

  # run tests & build
  npm run eslint;
  lintStatus=$?;
  npm run test;
  testStatus=$?;

  if [ $lintStatus -ne 0 ] || [ $testStatus -ne 0 ]; then
    exit 1;
  fi

  npm version ${MODE} -m ":bookmark: ${MODE} version bump.";

  npm run build;
  git add dist/;
  git commit -m ":package: Build dist.";

  npm publish;
  git push origin master;
  git push --tags;

  echo '';
  echo "${BOLD}${GREEN}Published successfully \\o/";

else
  echo "${BOLD}${RED}Please switch to master branch and then publish...";
  echo '';
fi
