const express = require('express')
const session = require('express-session')

const Sequelize = require('sequelize')

// Setup Sequelize to use a local SQLite database, located at ./database.sqlite
const sequelize = new Sequelize('sqlite:./database.sqlite', {
    logging: console.log
})

// Setup Express instance
const app = express()

// Handle JSON requests
app.use(express.json())

// Setup express-session
app.use(session({
    secret: 'random string'
}))

// Custom authentication middleware
// Documentation: https://expressjs.com/en/guide/writing-middleware.html
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return res.json({
            message: 'You need to be authenticated!'
        })
    }

    next()
}

// Message model
const Message = sequelize.define('message', {
    text: {
        type: Sequelize.STRING,
        allowNull: false
    }
})

// User model
const User = sequelize.define('user', {
    username: {
        type: Sequelize.STRING,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    }
})

// Model associations
User.hasMany(Message)
Message.belongsTo(User)

// Endpoint to register a new user
app.post('/signup', (req, res) => {
    // Object destructuring
    let { username, password } = req.body

    User.create({
        username,
        password
    })
    .then(user => {
        res.json({
            message: 'You have been registered'
        })
    })
    .catch(error => {
        res.status(422).json({
            message: 'An error accured'
        })
    })
})

// Endpoint to authenticate a user
app.post('/login', (req, res) => {
    let { username, password } = req.body

    let query = {
        where: {
            username,
            password
        }
    }

    User.findOne(query)
    .then(user => {
        if (!user) {
            // If no user was found, return a error response
            // with HTTP status code 422 (Unprocessable Entity)
            return res.status(422).json({
                message: 'Invalid login'
            })
        }

        // Set session to user's ID
        req.session.user = user.id

        res.json({
            message: 'OK'
        })
    })
})

// Endpoint to display all messages
app.get('/messages', (req, res) => {
    // SQL: SELECT * FROM `messages`
    Message.findAll()
    .then(messages => {
        // Do something with the messages
        res.json(messages)
    })
})

// Endpoint to generate a random message
// Uses isAuthenticated middleware
app.get('/messages/generate', isAuthenticated, (req, res) => {
    let randomText = 'Hello ' + Math.floor(Math.random() * 9999999)

    // SQL: INSERT INTO `messages` (`text`, `createdAt`) VALUES ('randomText content', NOW())
    Message.create({
        text: randomText,
        userId: req.session.user
    })
    .then(message => {
        res.json(message)
    })
})

// Endpoint to display a specific message
app.get('/messages/:message_id', (req, res) => {
    // Build query to find the specific message
    let query = {
        where: {
            id: req.params.message_id
        }
    }

    // Find a single message based on the above query
    Message.findOne(query)
    .then(message => {
        if (!message) {
            return res.status(404).json({
                message: 'Not found'
            })
        }

        res.json(message)
    })
})


// Endpoint to display a specific user's messages
app.get('/users/:id/messages', (req, res) => {
    let query = {
        where: {
            userId: req.params.id
        }
    }

    Message.findAll(query)
    .then(messages => {
        res.json(messages)
    })
})

// Synchronize models to database
// then start the Express server
sequelize.sync({ force: true }).then(() => {
    app.listen(3000, () => {
        console.log('Databased synced and server is running..')
    })
})