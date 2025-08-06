const expresss = require('express');
const app = expresss();
const cors = require('cors');
const router = require('./src/app');

app.use(expresss.json());
app.use(cors())

app.use('/api',router);

app.listen(5670,()=>{
    console.log('Server is running on port 5670');
});