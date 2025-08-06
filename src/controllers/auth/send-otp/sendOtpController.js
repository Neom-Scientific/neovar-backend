// import { comparePasswords, sendOtp } from '@/lib/auth/authController';
// import { NextResponse } from 'next/server';

// export async function POST(request) {
//   try {
//     const response = [];
//     const body = await request.json();
//     // console.log('body:', body);

//     // Compare passwords
//     try {
//       const passwords = await comparePasswords(body.email, body.password);
//       if (!passwords) {
//         response.push({
//           message: 'Invalid email or password',
//           status: 401
//         })
//         return NextResponse.json(response);
//       }
//     } catch (error) {
//       // Handle specific error from comparePasswords
//       if (error.message === 'Enter valid password') {
//         response.push({
//           message: 'Enter valid password',
//           status: 401
//         });
//       }
//       else if (error.message === 'Invalid email or password') {
//         response.push({
//           message: 'Invalid email or password',
//           status: 401
//         });
//       }
//       else{
//         response.push({
//           message: 'An unexpected error occurred while comparing passwords',
//           status: 500
//         });
//       }
//       console.error('Unexpected error in comparePasswords:', error);
//      return NextResponse.json(response);
//     }

//     // Generate and send OTP
//     const otp = await sendOtp(body.email);
//     response.push({
//       message: 'OTP sent successfully',
//       otp: otp, // Include OTP in the response for testing purposes
//       status: 200
//     });

//     return NextResponse.json(response)
//   } catch (error) {
//     console.error('Error in send-otp route:', error);
//     return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
//   }
// }

const { comparePasswords, sendOtp } = require('../../../lib/authControllers');

const sendOtpController = async (req, res) => {
  try {
    const response = [];
    const body = req.body;

    // Compare passwords
    try {
      const passwords = await comparePasswords(body.email, body.password);
      if (!passwords) {
        response.push({
          message: 'Invalid email or password',
          status: 401
        });
        return res.status(401).json(response);
      }
    } catch (error) {
      if (error.message === 'Enter valid password') {
        response.push({
          message: 'Enter valid password',
          status: 401
        });
      } else if (error.message === 'Invalid email or password') {
        response.push({
          message: 'Invalid email or password',
          status: 401
        });
      } else {
        response.push({
          message: 'An unexpected error occurred while comparing passwords',
          status: 500
        });
      }
      console.error('Unexpected error in comparePasswords:', error);
      return res.status(401).json(response);
    }

    // Generate and send OTP
    const otp = await sendOtp(body.email);
    response.push({
      message: 'OTP sent successfully',
      otp: otp, // Remove in production for security
      status: 200
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in send-otp route:', error);
    return res.status(500).json({ error: error.message || 'Failed to send OTP' });
  }
};

module.exports = sendOtpController;

// const express = require('express');
// const sendOtpController = require('./sendOtpController');
// const router = express.Router();

// router.post('/send-otp', sendOtpController);

// module.exports = router;