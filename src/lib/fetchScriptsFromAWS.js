// import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
// import fs from 'fs';
// import path from 'path';
// import crypto from 'crypto';

// function randomName() {
//     return `${crypto.randomBytes(8).toString('hex')}`;
// }

// export async function fetchScriptsFromAWS(fileKey, distDir) {
//     try {
//         const client = new S3Client({
//             region: 'ap-south-1',
//             credentials: {
//                 accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
//                 secretAccessKey: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_SECRET
//             }
//         });

//         const command = new GetObjectCommand({
//             Bucket: 'neovar',
//             Key: fileKey
//         });
//         const response = await client.send(command);

//         // Convert stream to buffer
//         const streamToBuffer = async (stream) => {
//             return new Promise((resolve, reject) => {
//                 const chunks = [];
//                 stream.on("data", (chunk) => chunks.push(chunk));
//                 stream.on("end", () => resolve(Buffer.concat(chunks)));
//                 stream.on("error", reject);
//             });
//         };
//         const fileBuffer = await streamToBuffer(response.Body);
//         if (distDir) {
//             let fileName = path.basename(fileKey);
//             // If .bed or .interval_list, generate random name without extension
//             if (fileName.endsWith('.bed') || fileName.endsWith('.interval_list')) {
//                 fileName = randomName();
//             }
//             const filePath = path.join(distDir, fileName);
//             fs.writeFileSync(filePath, fileBuffer);
//             fs.chmodSync(filePath, 0o644); // Not executable for data files
//             // console.log(`File saved to ${filePath}`);
//             return filePath;
//         }
//         return 1;
//     } catch (error) {
//         console.error('Error in fetchScriptsFromAWS:', error);
//         throw error;
//     }
// }

const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function randomName() {
    return `${crypto.randomBytes(8).toString('hex')}`;
}

async function fetchScriptsFromAWS(fileKey, distDir) {
    try {
        const client = new S3Client({
            region: 'ap-south-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET
            }
        });

        const command = new GetObjectCommand({
            Bucket: 'neovar',
            Key: fileKey
        });
        const response = await client.send(command);

        // Convert stream to buffer
        const streamToBuffer = async (stream) => {
            return new Promise((resolve, reject) => {
                const chunks = [];
                stream.on("data", (chunk) => chunks.push(chunk));
                stream.on("end", () => resolve(Buffer.concat(chunks)));
                stream.on("error", reject);
            });
        };
        const fileBuffer = await streamToBuffer(response.Body);
        if (distDir) {
            let fileName = path.basename(fileKey);
            // If .bed or .interval_list, generate random name without extension
            if (fileName.endsWith('.bed') || fileName.endsWith('.interval_list')) {
                fileName = randomName();
            }
            const filePath = path.join(distDir, fileName);
            fs.writeFileSync(filePath, fileBuffer);
            fs.chmodSync(filePath, 0o644); // Not executable for data files
            return filePath;
        }
        return 1;
    } catch (error) {
        console.error('Error in fetchScriptsFromAWS:', error);
        throw error;
    }
}

module.exports = { fetchScriptsFromAWS };