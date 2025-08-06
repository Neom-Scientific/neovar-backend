// import { hashPassword, SignUpRoute } from '@/lib/auth/authController';
// import { NextResponse } from 'next/server';

// export async function POST(request) {
//   try {
//     const body = await request.json();

//     // Hash the password
//     const hashedPassword = await hashPassword(body.password);
//     const modifiedBody = { ...body, password: hashedPassword };

//     // Call the signup logic
//     const result = await SignUpRoute(modifiedBody);

//     return NextResponse.json(result, { status: 201 });
//   } catch (error) {
//     console.error('Error during signup:', error);
//     const isEmailExists = error.message.includes('Email already exists');
//     return NextResponse.json(
//       { message: 'email already exists' },
//       { status: isEmailExists ? 409 : 500 }
//     );
//   }
// }


const { hashPassword, SignUpRoute } = require('../../../lib/authControllers');
const signUpController = async (req, res) => {
  try {
    const body = req.body;

    // Hash the password
    const hashedPassword = await hashPassword(body.password);
    const modifiedBody = { ...body, password: hashedPassword };

    // Call the signup logic
    const result = await SignUpRoute(modifiedBody);

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error during signup:', error);
    const isEmailExists = error.message.includes('Email already exists');
    return res.status(isEmailExists ? 409 : 500).json({ message: 'email already exists' });
  }
};

module.exports = signUpController;