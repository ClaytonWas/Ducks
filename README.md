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
Using the client side 'onMouseClick' function, get the position of the mouse click and apply that position to an object of Player class for the user with that ID.
This will need to be verified by the gameServer, which will then need to emit that players position update to all connected sockets.