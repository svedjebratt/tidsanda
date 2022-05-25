#!/bin/bash

zip lambda.zip *.js
aws lambda update-function-code --function-name http-crud-tutorial-function --zip-file fileb://lambda.zip
