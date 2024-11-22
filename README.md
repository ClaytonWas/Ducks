# Ducks
The open world fun fest where you can talk to other players *AND* walk around!

## Installation
To get started with this project, you'll need to install the necessary dependencies. Follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ClaytonWas/Ducks.git
   ```

2. **Navigate to repository directory**

3. **Install dependancies** <br />
    In the directory terminal:
    ```bash
    npm install
    ```

## Getting Started

1. **Instance database** <br />
    In the directory terminal:
    ```bash
    sqlite3 ./db/accounts.db < ./db/schema.sql
    ```
    This instantiates a database with two template users.
    | username    | password |
    | -------- | ------- |
    | clay  | foobar    |
    | parsa | foobar     |


2. **Run the server** <br />
    In directory terminal 1:
    ```bash
    node profileServer.js
    ```
    In directory terminal 2:
    ```bash
    node gameServer.js
    ```

3. **Navigate to host** <br /> 
    Currently localhost:3000/



# TODO:
Scene transitions

Player customization (shape colour)

Typeracer

Tic-Tac-Toe

Movement cancellation updates current position to server

Systems Testing

UML diagrams

Dockerization