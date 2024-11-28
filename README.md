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
    npm ci
    ```
    OR
    ```bash
    npm install
    ```


## Getting Started

1. **Instance database** <br />
    In the directory terminal:
    ```bash
    node ./db/dbs.js
    ```
    This instantiates a database with two template users.
    | username    | password | salt | hash | shape | color | created_at |
    | -------- | ------- | ------- | ------- | ------- | ------- | ------- | 
    | clay  | foobar    | $2b$10$Tpc0EjrF2TegTwUUB7MP5e | $2b$10$Tpc0EjrF2TegTwUUB7MP5eSHZ4M/Knq3FrMDRzpyhiTdpDe5jS8Y2 | sphere | #613583 | 2024-12-25 09:15:00 |
    | parsa | foobar     | $2b$10$NjYK7EhH7jCqRE.rd/TGk. | $2b$10$NjYK7EhH7jCqRE.rd/TGk.IPN6Va2bshvhzKpZ7KommM7yN2JaK5a | cone | #00aa00 | 2024-12-25 09:15:00 |


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
Systems Testing

UML diagrams

Dockerization