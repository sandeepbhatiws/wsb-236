const express= require('express')
const { view } = require('../controllers/defaultControler')
const Route=express.Router()
module.exports=(app)=>{

Route.post('/create',view)

}