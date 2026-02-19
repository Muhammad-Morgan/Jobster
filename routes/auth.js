const express = require('express')
const router = express.Router()
const { register, login, updateUser } = require('../controllers/auth');
const authenticateUser = require("../middleware/authentication");

const testUser = require("../middleware/test-user")

router.post('/register', register)
router.post('/login', login)
router.patch('/updateUser', authenticateUser, testUser, updateUser)
module.exports = router
