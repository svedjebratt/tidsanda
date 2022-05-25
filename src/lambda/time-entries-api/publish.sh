#!/bin/bash

zip lambda.zip *.js
aws lambda update-function-code --function-name time-entries-api --zip-file fileb://lambda.zip
