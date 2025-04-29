# EPyTodo Setup Guide

## Setup Instructions

1. Create a `.env` file in the project root with the following content:
    ```
    PORT=3000
    SQL_HOST=localhost
    SQL_USER=root
    SQL_PWD=password
    SQL_DB=epytodo
    JWT_SECRET=your_jwt_secret_key
    ```

2. Create the `epytodo` database in MySQL
    `cat epytodo.sql | mysql -u root -p`

## Installation

Run the following commands to install dependencies:
```bash
npm install express --save
npm install dotenv --save
npm install mysql2
npm install jsonwebtoken
npm install bcryptjs
```