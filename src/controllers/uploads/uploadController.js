// // v3.2.0

// import { NextResponse } from 'next/server';
// import fs from 'fs';
// import os from 'os';
// import path from 'path';
// import { Readable } from 'stream';
// import formidable from 'formidable';
// import * as XLSX from 'xlsx';
// import db from '@/lib/db';

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// // Helper: Convert Fetch API request to Node-compatible stream
// function toNodeRequest(request) {
//   const readable = Readable.from(request.body);
//   return Object.assign(readable, {
//     headers: Object.fromEntries(request.headers), // <- manually provide headers
//   });
// }

// export async function POST(request) {

//   try {
//     const matchIds = [];
//     const nodeRequest = toNodeRequest(request); // stream + headers
//     // const {inputDirectory} = await request.json();
//     // let response;


//     const { fields, files } = await new Promise((resolve, reject) => {
//       const form = formidable({
//         multiples: true,
//         keepExtensions: true,
//         maxTotalFileSize: 150 * 1024 * 1024 * 1024, // 150GB
//         maxFileSize: 150 * 1024 * 1024 * 1024, // 150GB
//       });

//       form.parse(nodeRequest, (err, fields, files) => {
//         if (err) reject(err);
//         else resolve({ fields, files });
//       });
//     });
//     const email = fields.email[0];
//     console.log('email:', email);

//     const tempDir = path.join(os.tmpdir(), 'uploads');
//     if (!fs.existsSync(tempDir)) {
//       fs.mkdirSync(tempDir, { recursive: true });
//     }

//     // Create a single upload directory for the session

//     const folderName = path.dirname(files.file[1].originalFilename);
//     const uploadDir = path.join(tempDir, folderName);
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }
//     //console.log('uploadDir:', uploadDir);

//     const fileList = Array.isArray(files.file) ? files.file : [files.file];

//     const referenceSampleIds = [];
//     let result = [];
//     // Phase 1: Process Excel files first
//     for (const file of fileList) {
//       const destPath = path.join(uploadDir, path.basename(file.originalFilename || 'default'));
//       const lowerCaseDestPath = destPath.toLowerCase();

//       if (lowerCaseDestPath.endsWith('.xls') || lowerCaseDestPath.endsWith('.xlsx')) {
//         try {
//           fs.copyFileSync(file.filepath, destPath);
//           // console.log('Excel copied to:', destPath);
//           const fileBuffer = fs.readFileSync(destPath);
//           const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
//           const sheetName = workbook.SheetNames[0];
//           const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
//           const numberofsamples = sheetData.length;
//           if (numberofsamples > 25) {
//             result.push({
//               message: `You can only upload 25 samples at a time`,
//               status: 400,
//             })
//             return NextResponse.json(result);
//           }
//           const fastqFiles = fileList.filter(file =>
//             file.originalFilename.toLowerCase().endsWith('.fastq') ||
//             file.originalFilename.toLowerCase().endsWith('.fastq.gz') ||
//             file.originalFilename.toLowerCase().endsWith('.fq') ||
//             file.originalFilename.toLowerCase().endsWith('.fq.gz')
//           );

//           // if (numberofsamples !== fastqFiles.length) {
//           //   result.push({
//           //     message: `Number of samples in Excel (${numberofsamples}) does not match number of FASTQ files (${fastqFiles.length})`,
//           //     status: 400,
//           //   });
//           //   return NextResponse.json(result);
//           // }
//           const credits = await db.query('SELECT credits from register_data where email = $1', [email]);
//           const counter = credits.rows[0].credits;
//           if (counter < numberofsamples) {
//             result.push({
//               message: `You have ${counter} Counters left`,
//               status: 400,
//             })
//           }
//           else {
//             db.query('UPDATE register_data SET credits = $1 WHERE email = $2', [counter - numberofsamples, email]);
//           }

//           const sampleIds = sheetData
//             // .map(row => row['Sample ID']?.toString().trim())
//             .map(row => {
//               const rawId = row['Sample ID']?.toString().trim().normalize();
//               return rawId?.replace(/(_R[12]|_[12])$/, ''); // Normalize here!
//             })
//             .filter(Boolean);

//           referenceSampleIds.push(...sampleIds);
//           //console.log('Extracted Sample IDs:', referenceSampleIds);
//         } catch (err) {
//           console.error('Error processing Excel file:', err);
//         } finally {
//           try {
//             fs.unlinkSync(file.filepath);
//           } catch (err) {
//             console.warn('Temp file deletion failed:', err.message);
//           }
//         }
//       }
//     };

//     // Phase 2: Process FASTQ files with populated referenceSampleIds

//     for (const file of fileList) {
//       const destPath = path.join(uploadDir, path.basename(file.originalFilename || 'default'));
//       const lowerCaseDestPath = destPath.toLowerCase();

//       if (
//         lowerCaseDestPath.endsWith('.fastq') ||
//         lowerCaseDestPath.endsWith('.fastq.gz') ||
//         lowerCaseDestPath.endsWith('.fq') ||
//         lowerCaseDestPath.endsWith('.fq.gz')
//       ) {
//         try {
//           fs.copyFileSync(file.filepath, destPath);

//           // Extract baseName and normalize it
//           let baseName = path.basename(file.originalFilename || '').replace(/\.(fastq|fq)(\.gz)?$/i, '');
//           baseName = baseName.replace(/(_R[12]|_[12])$/, '').trim().normalize();

//           // Normalize referenceSampleIds and find a match
//           let normalizedId;
//           // console.log('Looking for match for:', baseName);
//           // console.log('In sample IDs:', referenceSampleIds);
//           const matchedId = referenceSampleIds.find((id) => {
//             // console.log('Matching baseName:', baseName);
//             normalizedId = id.replace(/(_R[12]|_[12])$/, '');
//             return baseName === normalizedId; // Use exact matching
//           });

//           if (matchedId) {

//             if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

//             const targetPath = path.join(uploadDir, path.basename(destPath));
//             fs.copyFileSync(destPath, targetPath);

//             // console.log(`✅ File copied to input directory: ${targetPath}`);
//             // console.log('matchIds:', matchIds);
//             result.push({
//               message: `${file.originalFilename} copied to input directory`,
//               status: 200,
//               inputDir: uploadDir,
//               filePath: targetPath,
//               sampleId: matchedId
//             });
//           } else {
//             console.error(`❌ File "${file.originalFilename}" does not match any Sample ID from Excel.`);
//             fs.unlinkSync(destPath);

//             result.push({
//               message: `${file.originalFilename} does not match from Excel`,
//               status: 400,
//               filePath: destPath,
//             });
//           }
//         } catch (error) {
//           console.error('Error processing FASTQ file:', error);
//         } finally {
//           try {
//             fs.unlinkSync(file.filepath);
//           } catch (err) {
//             console.warn('Temp file deletion failed:', err.message);
//           }
//         }
//       }
//     }




//     return NextResponse.json(result);
//   }
//   catch (err) {
//     console.error('Upload error:', err);
//     return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
//   }
// }

const fs = require('fs');
const os = require('os');
const path = require('path');
// const formidable = require('formidable');
const { IncomingForm } = require('formidable');

const XLSX = require('xlsx');
const db = require('../../db/config');
const { NodeSSH } = require('node-ssh');
const { default: axios } = require('axios');
const FormData = require('form-data');


let privateKey;
if (process.env.SSH_PRIVATE_KEY) {
  privateKey = Buffer.from(process.env.SSH_PRIVATE_KEY.replace(/\\n/g, '\n'));
}

async function uploadFastqFilesToFlask({ username, projectDirPath, files, host, originalFilename }) {
  await Promise.all(files.map(async (filePath, idx) => {
    const form = new FormData();
    // Use originalFilename if provided, else fallback to filePath's basename
    form.append('file', fs.createReadStream(filePath), { filename: path.basename(originalFilename || filePath) });
    form.append('username', username);
    form.append('project_dirpath', projectDirPath);

    try {
      const res = await axios.post(`http://${host}:8702/upload`, form, {
        headers: form.getHeaders(),
      });
      console.log('Flask upload response:', res.data);
    } catch (err) {
      console.error('Flask upload error:', err);
    }
  }));
  console.log('All files uploaded to Flask');
}


const uploadController = async (req, res) => {
  try {
    const ssh = new NodeSSH();
    const matchIds = [];
    const form = new IncomingForm({
      multiples: true,
      keepExtensions: true,
      maxTotalFileSize: 150 * 1024 * 1024 * 1024,
      maxFileSize: 150 * 1024 * 1024 * 1024,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }


      const { rows: servers } = await db.query('SELECT * FROM server_systems ORDER BY id');
      const { rows: assignedSubtasks } = await db.query('SELECT server_user FROM SubTasks WHERE status = $1', ['running']);
      const assignedUsers = assignedSubtasks.map(row => row.server_user);

      let serverIndex = 0;
      if (assignedUsers.length > 0) {
        const lastAssignedUser = assignedUsers[assignedUsers.length - 1];
        serverIndex = servers.findIndex(s => s.user === lastAssignedUser);
        serverIndex = (serverIndex + 1) % servers.length;
      }

      const server = servers[serverIndex];
      console.log('server:', server);

      await ssh.connect({
        host: server.host,
        username: server.user_name,
        port: server.port,
        privateKey: privateKey.toString()
      })

      const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
      const projectName = Array.isArray(fields.projectName) ? fields.projectName[0] : fields.projectName;
      // const tempDir = path.join(os.tmpdir(), 'uploads');
      // if (!fs.existsSync(tempDir)) {
      //   fs.mkdirSync(tempDir, { recursive: true });
      // }

      const projectDir = path.join(server.output_dir, projectName);
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      // Create a single upload directory for the session

      const folderName = path.dirname(files.file[1].originalFilename);
      console.log('folderName:', folderName);
      const uploadDir = path.join(projectDir, folderName);
      console.log('uploadDir:', uploadDir);
      if (!fs.existsSync(uploadDir)) {
        // fs.mkdirSync(uploadDir, { recursive: true });
        await ssh.execCommand(`mkdir -p ${uploadDir}`);
      }

      const fileList = Array.isArray(files.file) ? files.file : [files.file];
      const referenceSampleIds = [];
      let result = [];

      // Phase 1: Process Excel files first
      for (const file of fileList) {
        const destPath = path.join(uploadDir, path.basename(file.originalFilename || 'default'));
        const lowerCaseDestPath = destPath.toLowerCase();

        if (lowerCaseDestPath.endsWith('.xls') || lowerCaseDestPath.endsWith('.xlsx')) {
          try {
            await uploadFastqFilesToFlask({
              username: server.user_name,
              projectDirPath: uploadDir,
              files: [file.filepath],
              host: server.host,
              originalFilename: file.originalFilename
            });

            const fileBuffer = fs.readFileSync(file.filepath);
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
            const numberofsamples = sheetData.length;
            if (numberofsamples > 25) {
              result.push({
                message: `You can only upload 25 samples at a time`,
                status: 400,
              });
              return res.status(400).json(result);
            }

            console.log('sheetData:', sheetData);
            const fastqFiles = fileList.filter(file =>
              file.originalFilename.toLowerCase().endsWith('.fastq') ||
              file.originalFilename.toLowerCase().endsWith('.fastq.gz') ||
              file.originalFilename.toLowerCase().endsWith('.fq') ||
              file.originalFilename.toLowerCase().endsWith('.fq.gz')
            );
            const credits = await db.query('SELECT credits from register_data where email = $1', [email]);
            const counter = credits.rows[0].credits;
            if (counter < numberofsamples) {
              result.push({
                message: `You have ${counter} Counters left`,
                status: 400,
              });
            } else {
              db.query('UPDATE register_data SET credits = $1 WHERE email = $2', [counter - numberofsamples, email]);
            }

            const sampleIds = sheetData
              .map(row => {
                const rawId = row['Sample ID']?.toString().trim().normalize();
                return rawId?.replace(/(_R[12]|_[12])$/, '');
              })
              .filter(Boolean);

            console.log('extracted Sample IDs:', sampleIds);

            referenceSampleIds.push(...sampleIds);
          } catch (err) {
            console.error('Error processing Excel file:', err);
          } finally {
            try {
              fs.unlinkSync(file.filepath);
            } catch (err) {
              console.warn('Temp file deletion failed:', err.message);
            }
          }
        }
      }

      // Phase 2: Process FASTQ files with populated referenceSampleIds
      for (const file of fileList) {
        const destPath = path.join(uploadDir, path.basename(file.originalFilename || 'default'));
        const lowerCaseDestPath = destPath.toLowerCase();
        const originalBaseName = path.basename(file.originalFilename || '');

        console.log('file.filepath:', file.filepath);
        if (
          lowerCaseDestPath.endsWith('.fastq') ||
          lowerCaseDestPath.endsWith('.fastq.gz') ||
          lowerCaseDestPath.endsWith('.fq') ||
          lowerCaseDestPath.endsWith('.fq.gz')
        ) {
          try {
            // fs.copyFileSync(file.filepath, destPath);
            // await ssh.putFile(file.filepath, destPath);

            let baseName = path.basename(file.originalFilename || '').replace(/\.(fastq|fq)(\.gz)?$/i, '');
            baseName = baseName.replace(/(_R[12]|_[12])$/, '').trim().normalize();

            const matchedId = referenceSampleIds.find((id) => {
              const normalizedId = id.replace(/(_R[12]|_[12])$/, '');
              return baseName === normalizedId;
            });

            console.log('baseName:', baseName);
            console.log('referenceSampleIds:', referenceSampleIds);
            console.log('matchedId:', matchedId);

            if (matchedId) {
              if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

              const targetPath = path.join(uploadDir, path.basename(destPath));
              // fs.copyFileSync(destPath, targetPath);
              // await ssh.execCommand(`cp ${destPath} ${targetPath}`);
              // await uploadFastqFilesToFlask({
              //   username: server.user_name,
              //   projectDirPath: uploadDir,
              //   files: [file.filepath],
              //   host: server.host,
              //   originalFilename: file.originalFilename // <-- pass the original filename
              // });

              await ssh.putFile(file.filepath, targetPath);

              result.push({
                message: `${file.originalFilename} uploaded to Flask server`,
                status: 200,
                remoteInputDir: uploadDir,
                filePath: file.filepath,
                sampleId: matchedId,
                serverId: server.id,
                remoteDir: projectDir,
              });
            } else {
              console.error(`❌ File "${file.originalFilename}" does not match any Sample ID from Excel.`);
              fs.unlinkSync(destPath);

              result.push({
                message: `${file.originalFilename} does not match from Excel`,
                status: 400,
                filePath: destPath,
              });
            }
          } catch (error) {
            console.error('Error processing FASTQ file:', error);
          } finally {
            try {
              fs.unlinkSync(file.filepath);
            } catch (err) {
              console.warn('Temp file deletion failed:', err.message);
            }
          }
        }
      }

      ssh.dispose();

      return res.status(200).json(result);
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
};

module.exports = uploadController;