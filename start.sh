#!/bin/bash
node src/app/app.js &
node src/sql/sql.js &
wait