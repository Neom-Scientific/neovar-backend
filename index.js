const expresss = require('express');
const app = expresss();
const cors = require('cors');
const router = require('./src/app');

const port = process.env.PORT || 5670;

app.use(expresss.json());
app.use(cors())

app.use('/api',router);

app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
});