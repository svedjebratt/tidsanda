#!/bin/bash

zip lambda.zip *.js
aws lambda update-function-code --function-name accounts-api --zip-file fileb://lambda.zip
