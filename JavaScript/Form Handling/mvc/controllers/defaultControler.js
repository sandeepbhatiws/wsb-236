const defaultModel = require("../models/defaultModel")

exports.view = (request, response) => {
    defaultModel(request.body).save()
    

}