const express =require('express')
const app= express()


require('./routes/defaultROutes.js')


app.post("/about",(request,response)=>{
    // response.send("About Us.")
    var data1 = [{
        name : "Gaurav"
    }]
    // const body=request.body;

    const data = {
        _status : true,
        _message : "Server is working fine.",
        _data : []
    }
    return response.send(data)
    // return response.send(data1)
})

app.listen(5000, () => {
    // mongoose.connect('mongodb+srv://manmeetsingh28827_db_user:MTy6xZNUKhlpB9Em@qwertyhgf.qvonsrp.mongodb.net/mongoose_db?appName=qwertyhgf').then(() => console.log('Connected!'));
})