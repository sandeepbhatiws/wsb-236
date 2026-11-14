const mongoose = require('mongoose')

const schema = mongoose.Schema({
    name: {
        type: String,
        required: true
    }
})
const defaultModel = mongoose.model('newTables', schema)
module.exports = defaultModel