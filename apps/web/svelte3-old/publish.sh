#!/bin/bash

npm run build
aws s3 cp ./public/ s3://tidsanda-web/. --recursive
