// import db from '../db/config';

// const bcrypt = require('bcryptjs');
// const saltRounds = 10;
// const jwt = require('jsonwebtoken');
// const nodemailer = require('nodemailer');

// const secretKey = process.env.JWT_SECRET_KEY;
// const tokenExpiration = '7d'; // Token expiration time
// const refreshTokenExpiration = '7d'; // Refresh token expiration time
// const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

// // signup route
// export const SignUpRoute = async (body) => {
//   const { email, password, mode } = body;

//   try {
//     // Check if email already exists
//     const existingUser = await db.query('SELECT * FROM register_data WHERE email = $1', [email]);
//     if (existingUser.rows.length > 0) {
//       // Email exists — throw an error to be caught by the route handler
//       throw new Error('Email already exists');
//     }

//     // Insert user
//     const credits = 10;
//     const result = await db.query(
//       'INSERT INTO register_data (email, password, credits, mode) VALUES ($1, $2, $3,$4) RETURNING *',
//       [email, password, credits, mode]
//     );

//     return {
//       message: 'Signup successful',
//       user: result.rows[0],
//     };
//   } catch (error) {
//     // Just throw the error to handle it in the route
//     throw error;
//   }
// };

// //signin route
// export const SignInRoute = async ({ email, password, otp, user }) => {
//   const otpRow = await db.query('SELECT * FROM otp_data WHERE email = $1', [email]);
//   const generatedOtp = otpRow.rows[0]?.otp;

//   try {
//     const registerData = await db.query('SELECT * FROM register_data WHERE email = $1', [email]);
//     if (registerData.rows.length === 0) throw new Error('Invalid email or password');

//     if (!generatedOtp || generatedOtp !== otp) {
//       await db.query('DELETE FROM otp_data WHERE email = $1', [email]);
//       throw new Error('Invalid OTP');
//     }

//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     const access_token = generateToken(user);
//     const refreshToken = generateRefreshToken(user);

//     console.log('mode:', registerData.rows[0].mode);

//     await db.query('DELETE FROM otp_data WHERE email = $1', [email]);
//     await db.query('INSERT INTO login_data (email, password , mode ) VALUES ($1, $2 , $3)', [email, hashedPassword, registerData.rows[0].mode]);

//     return { access_token, refreshToken ,mode:registerData.rows[0].mode};
//   }
//   catch (error) {
//     console.error('Error fetching OTP from database:', error.message);
//     throw new Error(error.message);
//   }
// };

// // Middleware to hash password
// export const hashPassword = async (plainPassword) => {
//   try {
//     const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
//     return hashedPassword;
//   } catch (error) {
//     throw new Error('Error hashing password');
//   }
// };

// //middleware to compare password

// export const comparePasswords = async (email, inputPassword) => {
//   const user = await db.query('SELECT * FROM register_data WHERE email = $1', [email]);
//   if (user.rows.length === 0) throw new Error('Invalid email or password');

//   const isMatch = await bcrypt.compare(inputPassword, user.rows[0].password);
//   if (!isMatch) throw new Error('Enter valid password'); // Corrected syntax

//   return user.rows[0];
// };
// // export const comparePasswords = async (email, inputPassword) => {
// //   const user = await db.query('SELECT * FROM register_data WHERE email = $1', [email]);
// //   if (user.rows.length === 0) throw new Error('Invalid email or password');

// //   console.log('inputPassword:', inputPassword);
// //   console.log('hashedPassword:', user.rows[0].password);

// //   const isMatch = await bcrypt.compare(inputPassword, user.rows[0].password);
// //   if (!isMatch) throw new ('Enter valid password');

// //   return user.rows[0];
// // };

// //middleware to generate otp
// export const generateOtp = () => {
//   const otp = Math.floor(100000 + Math.random() * 900000);
//   // console.log('Generated OTP:', otp);
//   return otp;
// };

// //send-otp route
// export const sendOtp = async (email) => {
//   const otp = generateOtp();

//   try {
//     await db.query('INSERT INTO otp_data (email, otp) VALUES ($1, $2)', [email, otp]);
//     // console.log('OTP stored successfully');
//   } catch (error) {
//     console.error('Error storing OTP in database:', error);
//     throw new Error('Error storing OTP');
//   }

//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: process.env.EMAIL,
//       pass: process.env.PASSWORD,
//     },
//   });

//   const mailOptions = {
//     from: process.env.EMAIL,
//     to: email,
//     subject: 'OTP Verification',
//     html: `
//     <p> Dear User,</p>
//     <p>Your OTP for verification is <strong>${otp}</strong>.</p>
//     <p>Please use this OTP to complete your verification process.</p>
//     <p>Thank you</p>
//     <p>Best regards,</p>
//     <p>Neom Scientific Solutions Pvt. Ltd.</p>
//     `,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     // console.log('OTP sent successfully');
//     return otp;
//   } catch (error) {
//     console.error('Error sending OTP:', error);
//     throw new Error('Failed to send OTP');
//   }
// };


// // Middleware to authenticate JWT tokens
// export const authenticateRefreshToken = (authHeader) => {
//   if (!authHeader) throw new Error('Authorization header missing');

//   const token = authHeader.split(' ')[1];
//   if (!token) throw new Error('Token not found');

//   try {
//     const user = jwt.verify(token, refreshTokenSecret);
//     return user;
//   } catch (error) {
//     throw new Error('Invalid or expired refresh token');
//   }
// };

// // Middleware to authenticate JWT tokens
// export const authenticateToken = (authHeader) => {
//   if (!authHeader) throw new Error('Authorization header missing');

//   const token = authHeader.split(' ')[1];
//   if (!token) throw new Error('Token not found');

//   try {
//     const user = jwt.verify(token, secretKey);
//     return user;
//   } catch (error) {
//     throw new Error('Invalid or expired token');
//   }
// };

// // Middleware to generate access_token
// export const generateToken = (user) => {
//   return jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: tokenExpiration });
// }

// // Middleware to generate refresh_token
// export const generateRefreshToken = (user) => {
//   return jwt.sign({ id: user.id, email: user.email }, refreshTokenSecret, { expiresIn: refreshTokenExpiration });
// }

// // verify refresh token
// export const verifyRefreshToken = (token) => {
//   return new Promise((resolve, reject) => {
//     jwt.verify(token, refreshTokenSecret, (err, user) => {
//       if (err) return reject(err);
//       resolve(user);
//     });
//   });
// };

// // In-memory store for refresh tokens
// export const RefreshTokenRoute = async (token) => {
//   if (!token || !refreshTokens[token]) {
//     throw new Error('Invalid refresh token');
//   }

//   const user = await verifyRefreshToken(token);
//   const newToken = generateToken(user);
//   return { token: newToken };
// };


// //   signout route
// export const SignOutRoute = async (token, email) => {
//   if (!token) {
//     throw new Error('No token provided');
//   }

//   // Delete refresh token from memory

//   try {
//     delete refreshTokens[token];
//     // await db.query('DELETE FROM login_data WHERE email = $1', [email]);
//     return { message: 'Logged out successfully' };
//   } catch (error) {
//     throw new Error('Error logging out user');
//   }
// };

// //   forgot password route
// export const ForgotPasswordRoute = async (email) => {
//   const otp = generateOtp();

//   try {
//     await db.query('INSERT INTO otp_data (email, otp) VALUES ($1, $2)', [email, otp]);
//     // console.log('OTP stored successfully');
//   } catch (error) {
//     console.error('Error storing OTP in database:', error);
//     throw new Error('Error storing OTP');
//   }

//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: process.env.EMAIL,
//       pass: process.env.PASSWORD,
//     },
//   });

//   const mailOptions = {
//     from: process.env.EMAIL,
//     to: email,
//     subject: 'Password Reset OTP',
//     text: `Your OTP for password reset is ${otp}`,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     // console.log('OTP sent successfully');
//     return otp;
//   } catch (error) {
//     console.error('Error sending OTP:', error);
//     throw new Error('Failed to send OTP');
//   }
// };
// // reset password route
// export const ResetPasswordRoute = async (email, newPassword, otp) => {
//   const otpRow = await db.query('SELECT * FROM otp_data WHERE email = $1', [email]);
//   const generatedOtp = otpRow.rows[0]?.otp;

//   if (!generatedOtp || generatedOtp !== otp) {
//     await db.query('DELETE FROM otp_data WHERE email = $1', [email]);
//     throw new Error('Invalid OTP');
//   }

//   const hashedPassword = await hashPassword(newPassword);

//   try {
//     await db.query('UPDATE register_data SET password = $1 WHERE email = $2', [hashedPassword, email]);
//     await db.query('DELETE FROM otp_data WHERE email = $1', [email]);
//     return { message: 'Password reset successfully' };
//   } catch (error) {
//     throw new Error('Error resetting password');
//   }
// };

const db = require('../db/config');
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const secretKey = process.env.JWT_SECRET_KEY;
const tokenExpiration = '7d';
const refreshTokenExpiration = '7d';
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

// In-memory store for refresh tokens
const refreshTokens = {};

// signup route
const SignUpRoute = async (body) => {
  const { email, password, mode } = body;

  try {
    const existingUser = await db.query('SELECT * FROM register_data WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new Error('Email already exists');
    }

    const credits = 10;
    const result = await db.query(
      'INSERT INTO register_data (email, password, credits, mode) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, password, credits, mode]
    );

    return {
      message: 'Signup successful',
      user: result.rows[0],
    };
  } catch (error) {
    throw error;
  }
};

// signin route
const SignInRoute = async ({ email, password, otp, user }) => {
  const otpRow = await db.query('SELECT * FROM otp_data WHERE email = $1', [email]);
  const generatedOtp = otpRow.rows[0]?.otp;

  try {
    const registerData = await db.query('SELECT * FROM register_data WHERE email = $1', [email]);
    if (registerData.rows.length === 0) throw new Error('Invalid email or password');

    if (!generatedOtp || generatedOtp !== otp) {
      await db.query('DELETE FROM otp_data WHERE email = $1', [email]);
      throw new Error('Invalid OTP');
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const access_token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    await db.query('DELETE FROM otp_data WHERE email = $1', [email]);
    await db.query('INSERT INTO login_data (email, password, mode) VALUES ($1, $2, $3)', [email, hashedPassword, registerData.rows[0].mode]);

    return { access_token, refreshToken, mode: registerData.rows[0].mode };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Middleware to hash password
const hashPassword = async (plainPassword) => {
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

// Middleware to compare password
const comparePasswords = async (email, inputPassword) => {
  const user = await db.query('SELECT * FROM register_data WHERE email = $1', [email]);
  if (user.rows.length === 0) throw new Error('Invalid email or password');

  const isMatch = await bcrypt.compare(inputPassword, user.rows[0].password);
  if (!isMatch) throw new Error('Enter valid password');

  return user.rows[0];
};

// Middleware to generate otp
const generateOtp = () => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp;
};

// send-otp route
const sendOtp = async (email) => {
  const otp = generateOtp();

  try {
    await db.query('INSERT INTO otp_data (email, otp) VALUES ($1, $2)', [email, otp]);
  } catch (error) {
    throw new Error('Error storing OTP');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'OTP Verification',
    html: `
      <p> Dear User,</p>
      <p>Your OTP for verification is <strong>${otp}</strong>.</p>
      <p>Please use this OTP to complete your verification process.</p>
      <p>Thank you</p>
      <p>Best regards,</p>
      <p>Neom Scientific Solutions Pvt. Ltd.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return otp;
  } catch (error) {
    throw new Error('Failed to send OTP');
  }
};

// Middleware to authenticate JWT tokens
const authenticateRefreshToken = (authHeader) => {
  if (!authHeader) throw new Error('Authorization header missing');
  const token = authHeader.split(' ')[1];
  if (!token) throw new Error('Token not found');
  try {
    const user = jwt.verify(token, refreshTokenSecret);
    return user;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

const authenticateToken = (authHeader) => {
  if (!authHeader) throw new Error('Authorization header missing');
  const token = authHeader.split(' ')[1];
  if (!token) throw new Error('Token not found');
  try {
    const user = jwt.verify(token, secretKey);
    return user;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: tokenExpiration });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, refreshTokenSecret, { expiresIn: refreshTokenExpiration });
};

const verifyRefreshToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, refreshTokenSecret, (err, user) => {
      if (err) return reject(err);
      resolve(user);
    });
  });
};

const RefreshTokenRoute = async (token) => {
  if (!token || !refreshTokens[token]) {
    throw new Error('Invalid refresh token');
  }
  const user = await verifyRefreshToken(token);
  const newToken = generateToken(user);
  return { token: newToken };
};

const SignOutRoute = async (token, email) => {
  if (!token) {
    throw new Error('No token provided');
  }
  try {
    delete refreshTokens[token];
    return { message: 'Logged out successfully' };
  } catch (error) {
    throw new Error('Error logging out user');
  }
};

const ForgotPasswordRoute = async (email) => {
  const otp = generateOtp();

  try {
    await db.query('INSERT INTO otp_data (email, otp) VALUES ($1, $2)', [email, otp]);
  } catch (error) {
    throw new Error('Error storing OTP');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'Password Reset OTP',
    text: `Your OTP for password reset is ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return otp;
  } catch (error) {
    throw new Error('Failed to send OTP');
  }
};

const ResetPasswordRoute = async (email, newPassword, otp) => {
  const otpRow = await db.query('SELECT * FROM otp_data WHERE email = $1', [email]);
  const generatedOtp = otpRow.rows[0]?.otp;

  if (!generatedOtp || generatedOtp !== otp) {
    await db.query('DELETE FROM otp_data WHERE email = $1', [email]);
    throw new Error('Invalid OTP');
  }

  const hashedPassword = await hashPassword(newPassword);

  try {
    await db.query('UPDATE register_data SET password = $1 WHERE email = $2', [hashedPassword, email]);
    await db.query('DELETE FROM otp_data WHERE email = $1', [email]);
    return { message: 'Password reset successfully' };
  } catch (error) {
    throw new Error('Error resetting password');
  }
};

module.exports = {
  SignUpRoute,
  SignInRoute,
  hashPassword,
  comparePasswords,
  generateOtp,
  sendOtp,
  authenticateRefreshToken,
  authenticateToken,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  RefreshTokenRoute,
  SignOutRoute,
  ForgotPasswordRoute,
  ResetPasswordRoute,
};