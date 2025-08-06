// export const runtime = 'nodejs'
// import { NextResponse } from "next/server";
// import db from "@/lib/db";



// export async function GET(req) {
//     const email = req.nextUrl.searchParams.get('email'); // Correctly extract the emai  l
//     try {
//         if (!email) {
//             return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
//         }

//         const counterData = await db.query('SELECT * FROM CounterTasks WHERE email = $1', [email]);
//         // console.log('counterData:', counterData);
//         if (counterData.rowCount === 0) {
//             return NextResponse.json({ error: 'No project found' }, { status: 200 });
//         }
//         const counter = counterData.rows;

//         // Return the email in the response
//         return NextResponse.json(counter);
//     } catch (err) {
//         console.error('Error in fetching the counter data:', err);
//         return NextResponse.json({ error: 'Error in fetching the counter data' }, { status: 500 });
//     }
// }

const db = require("../../db/config");

const readCounterController = async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    const counterData = await db.query('SELECT * FROM CounterTasks WHERE email = $1', [email]);
    if (counterData.rowCount === 0) {
      return res.status(200).json({ error: 'No project found' });
    }
    const counter = counterData.rows;
    return res.status(200).json(counter);
  } catch (err) {
    console.error('Error in fetching the counter data:', err);
    return res.status(500).json({ error: 'Error in fetching the counter data' });
  }
};

module.exports = readCounterController;

// const express = require('express');
// const readCounterController = require('./readCounterController');
// const router = express.Router();

// router.get('/read-counter', readCounterController);

// module.exports = router;