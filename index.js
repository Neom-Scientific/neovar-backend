// const expresss = require('express');
// const app = expresss();
// const cors = require('cors');
// const router = require('./src/app');

// const port = process.env.PORT || 5670;

// app.use(expresss.json());
// app.use(cors())

// app.use('/api',router);

// app.listen(port,()=>{
//     console.log(`Server is running on port ${port}`);
// });

const express = require('express');
const app = express();
const cors = require('cors');
const router = require('./src/app');

const port = process.env.PORT || 5670;

app.use(cors());

// ✅ Custom middleware to skip JSON parsing for `/api/uploads`
app.use((req, res, next) => {
    if (req.url.startsWith('/api/uploads')) {
        next(); // skip body parsing for this route
    } else {
        express.json()(req, res, next);
    }
});

app.use('/api', router);

app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
});
