# EPyTodo Setup Guide

## Setup Instructions

1. Create the `epytodo` database in MySQL
    `cat epytodo.sql | mysql -u root -p`

2. Install dependencies and start the server:
    `npm install`
    `npm start`

## Installation

Run the following commands to install dependencies:
```bash
npm install express --save
npm install dotenv --save
npm install mysql2
npm install jsonwebtoken
npm install bcryptjs
```