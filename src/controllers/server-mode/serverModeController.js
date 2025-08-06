// // import fs, { unlinkSync } from 'fs';
// // import path from 'path';
// // import { NextResponse } from 'next/server';
// // import { fetchScriptsFromAWS } from '@/lib/fetchScriptsFromAWS';
// // import { spawn } from 'child_process';
// // import { generateProjectId } from '@/lib/idGenerator';
// // import db from '@/lib/db';
// // import FormData from 'form-data';
// // import axios from 'axios';
// // import { NodeSSH } from 'node-ssh';

// // const progressSteps = [
// //     "Mapping reads with BWA-MEM, sorting",
// //     "Running QC analysis",
// //     "Mean Quality by Cycle",
// //     "Quality Score Distribution",
// //     "GC Bias Metrics",
// //     "Insert Size Metrics",
// //     "Alignment Statistics",
// //     "Remove Duplicate Reads",
// //     "Running Coverage",
// //     "Variant calling",
// //     "Variant Filtering",
// //     "VCF filtering completed"
// // ];

// // // const systems = [
// // //     { host: '192.168.1.27', user: 'manas', os: 'linux', output_dir: '/dev/shm', port: 22, localDir: '' },
// // //     { host: '192.168.1.4', user: 'strive', os: 'linux', output_dir: '/dev/shm', port: 2222, localDir: '/media/strive/Strive/prateek/fastq_to_vcf/local', appPath: '/media/strive/Strive/prateek/python_uploader/app.py', venvPath: '/media/strive/Strive/prateek/python_uploader/.venv/bin/python' },
// // //     { host: '192.168.1.10', user: 'hp', os: 'windows-wsl', output_dir: '/dev/shm', port: 22 },
// // // ];

// // let privateKey;
// // if (process.env.SSH_PRIVATE_KEY) {
// //     // If the key is set in env, use it directly
// //     privateKey = Buffer.from(process.env.SSH_PRIVATE_KEY.replace(/\\n/g, '\n'));
// // }

// // async function updateSubtasksProgress(taskId) {
// //     const subtasks = await db.query('SELECT * FROM SubTasks WHERE taskid = $1 ORDER BY subtaskid ASC', [taskId]);
// //     if (subtasks.rowCount === 0) return;

// //     for (const subtask of subtasks.rows) {
// //         const sampleLogPath = subtask.logpath;
// //         let subtaskLogContent = '';
// //         try {
// //             subtaskLogContent = await readRemoteFile(server, sampleLogPath);
// //         } catch {
// //             continue; // If the log file is not found, skip this subtask
// //         }

// //         // Determine the current step for this subtask
// //         let subtaskCurrentStep = -1;
// //         const logLower = subtaskLogContent.toLowerCase();
// //         for (let i = progressSteps.length - 1; i >= 0; i--) {
// //             if (
// //                 (i === progressSteps.length - 1 && logLower.includes("vcf filtering completed")) ||
// //                 logLower.includes(progressSteps[i].toLowerCase())
// //             ) {
// //                 subtaskCurrentStep = i;
// //                 break;
// //             }
// //         }

// //         // Calculate the progress for this subtask
// //         const subtaskProgress = Math.floor(((subtaskCurrentStep + 1) / progressSteps.length) * 100);

// //         // Update the progress of the subtask in the database
// //         await db.query(
// //             'UPDATE SubTasks SET progress = $1 WHERE subtaskid = $2 AND taskid = $3',
// //             [subtaskProgress, subtask.subtaskid, taskId]
// //         );

// //         // Optionally, mark as completed
// //         if (subtaskProgress === 100) {
// //             await db.query(
// //                 'UPDATE SubTasks SET status = $1 WHERE subtaskid = $2 AND taskid = $3',
// //                 ['completed', subtask.subtaskid, taskId]
// //             );
// //         }
// //     }
// // }


// // async function uploadFileToServer(server, localPath, remotePath) {
// //     const ssh = new NodeSSH();
// //     await ssh.connect({
// //         host: server.host,
// //         port: server.port,
// //         username: server.user_name,
// //         privateKey: privateKey.toString(),
// //     });
// //     await ssh.putFile(localPath, remotePath);
// //     ssh.dispose();
// // }

// // async function chmodRemoteFile(server, remoteFilePath) {
// //     const ssh = new NodeSSH();
// //     await ssh.connect({
// //         host: server.host,
// //         port: server.port,
// //         username: server.user_name,
// //         privateKey: privateKey.toString(),
// //     });
// //     const result = await ssh.execCommand(`chmod +x ${remoteFilePath}`);
// //     ssh.dispose();
// //     if (result.stderr) {
// //         console.error('chmod error:', result.stderr);
// //         throw new Error(result.stderr);
// //     }
// // }


// // async function uploadFastqFilesToFlask({ username, projectDirPath, files, host }) {
// //     await Promise.all(files.map(async filePath => {
// //         // console.log('Uploading:', filePath);
// //         const form = new FormData();
// //         form.append('file', fs.createReadStream(filePath));
// //         form.append('username', username);
// //         form.append('project_dirpath', projectDirPath);

// //         try {
// //             const res = await axios.post(`http://${host}:8702/upload`, form, {
// //                 headers: form.getHeaders(),
// //             });
// //             console.log('Flask upload response:', res.data);
// //         } catch (err) {
// //             console.error('Flask upload error:', err);
// //         }
// //     }));
// //     console.log('All files uploaded to Flask');
// // }

// // async function readRemoteFile(server, remotePath) {
// //     const ssh = new NodeSSH();
// //     await ssh.connect({
// //         host: server.host,
// //         port: server.port,
// //         username: server.user_name,
// //         privateKey: privateKey.toString(),
// //     });
// //     const result = await ssh.execCommand(`cat ${remotePath}`);
// //     ssh.dispose();
// //     if (result.stderr) {
// //         console.error('STDERR:', result.stderr);
// //         throw new Error(result.stderr);
// //     }
// //     return result.stdout;
// // }


// // export async function POST(req) {
// //     try {
// //         const ssh = new NodeSSH();
// //         const response = [];
// //         const { projectName, inputDir, testType, email, sampleIds, numberOfSamples } = await req.json();
// //         const { rows: servers } = await db.query('SELECT * FROM server_systems ORDER BY id');

// //         const { rows: assignedSubtasks } = await db.query('SELECT server_user FROM SubTasks WHERE status = $1', ['running']);
// //         const assignedUsers = assignedSubtasks.map(row => row.server_user);

// //         let serverIndex = 0;
// //         if (assignedUsers.length > 0) {
// //             // Find the last used server in running subtasks
// //             const lastAssignedUser = assignedUsers[assignedUsers.length - 1];
// //             serverIndex = servers.findIndex(s => s.user === lastAssignedUser);
// //             serverIndex = (serverIndex + 1) % servers.length;
// //         }
// //         // const server = rows[0];
// //         const server = servers[serverIndex];

// //         const remoteDir = path.join(server.output_dir, projectName);
// //         console.log('sampleIds:', sampleIds);

// //         console.log('server:', server);


// //         // --- Project ID logic ---
// //         let taskId;
// //         const getRunningTasks = await db.query('SELECT email from RunningTasks WHERE email = $1', [email]);
// //         const getCounterTasks = await db.query('SELECT email from CounterTasks WHERE email = $1', [email]);

// //         if (getRunningTasks.rowCount > 0) {
// //             response.push({
// //                 message: 'One task is already Running',
// //                 status: 400
// //             });
// //             return NextResponse.json(response);
// //         }
// //         if (getCounterTasks.rowCount === 0 && getRunningTasks.rowCount === 0) {
// //             taskId = generateProjectId();
// //         } else if (getCounterTasks.rowCount > 0) {
// //             const length = getCounterTasks.rows.length;
// //             taskId = generateProjectId(length);
// //         }

// //         // --- Date/time for outputDir ---
// //         const date = new Date();
// //         const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
// //         const formattedTime = `${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
// //         const formattedDateTime = `${formattedDate}_${formattedTime}`;
// //         const outputDir = path.join(remoteDir, 'outputDir_' + formattedDateTime);
// //         const logPath = path.join(remoteDir, 'logs')
// //         const inputDirName = path.basename(inputDir);
// //         const remoteInputDir = path.join(remoteDir, inputDirName);

// //         // await startFlaskOnRemote(server);
// //         // 1. Fetch scripts/targets from AWS to local temp
// //         const tempDir = '/tmp/servermode';
// //         fs.mkdirSync(tempDir, { recursive: true });
// //         await ssh.connect({
// //             host: server.host,
// //             port: server.port,
// //             username: server.user_name,
// //             privateKey: privateKey.toString(),
// //         });
// //         const mkdirCmd = `mkdir -p ${remoteDir} ${outputDir} ${logPath} ${remoteInputDir}`;
// //         const mkdirResult = await ssh.execCommand(mkdirCmd);
// //         if (mkdirResult.stderr) {
// //             console.error('mkdir error:', mkdirResult.stderr);
// //             throw new Error(mkdirResult.stderr);
// //         }
// //         console.log('mkdir created')

// //         console.log('uploading files to Flask');
// //         // await rsyncUpload(inputDir, server, remoteInputDir);
// //         await uploadFastqFilesToFlask({
// //             host: server.host,
// //             username: server.user_name,
// //             projectDirPath: remoteInputDir,
// //             files: fs.readdirSync(inputDir).map(file => path.join(inputDir, file))
// //         });

// //         console.log('files uploaded to Flask');


// //         const callBatchPath = await fetchScriptsFromAWS('resources/call_batch.sh', tempDir);
// //         const neoVarPath = await fetchScriptsFromAWS('resources/NeoVar.sh', tempDir);

// //         let targetPath, intervalPath;
// //         if (testType === 'exome') {
// //             targetPath = await fetchScriptsFromAWS('resources/Exome.hg38.target.vC1.bed', tempDir);
// //             intervalPath = await fetchScriptsFromAWS('resources/Exome.hg38.target.vC1.interval_list', tempDir);
// //         } else if (testType === 'clinical') {
// //             targetPath = await fetchScriptsFromAWS('resources/UCE_hg38_v1.1.bed', tempDir);
// //             intervalPath = await fetchScriptsFromAWS('resources/UCE_hg38_v1.1.interval_list', tempDir);
// //         } else if (testType === 'carrier') {
// //             targetPath = await fetchScriptsFromAWS('resources/SCR_hg38_v1.1.bed', tempDir);
// //             intervalPath = await fetchScriptsFromAWS('resources/SCR_hg38_v1.1.interval_list', tempDir);
// //         } else {
// //             response.push({
// //                 message: 'Invalid test type',
// //                 status: 400
// //             });
// //             return NextResponse.json(response);
// //         }


// //         // 2. Upload files to remote server
// //         await uploadFileToServer(server, callBatchPath, path.join(remoteDir, 'call_batch.sh'));
// //         await chmodRemoteFile(server, path.join(remoteDir, 'call_batch.sh'));
// //         // console.log('call_batch.sh uploaded');

// //         await uploadFileToServer(server, neoVarPath, path.join(remoteDir, 'NeoVar.sh'));
// //         await chmodRemoteFile(server, path.join(remoteDir, 'NeoVar.sh'));
// //         // console.log('NeoVar.sh uploaded');

// //         await uploadFileToServer(server, targetPath, path.join(remoteDir, 'target.bed'));
// //         await chmodRemoteFile(server, path.join(remoteDir, 'target.bed'));
// //         // console.log('target.bed uploaded');

// //         await uploadFileToServer(server, intervalPath, path.join(remoteDir, 'interval_file.interval_list'));
// //         await chmodRemoteFile(server, path.join(remoteDir, 'interval_file.interval_list'));
// //         // console.log('interval_file.interval_list uploaded');
// //         console.log('all files uploaded to remote server');

// //         spawn('chmod', ['+x', path.join(remoteDir, 'call_batch.sh')]);
// //         spawn('chmod', ['+x', path.join(remoteDir, 'NeoVar.sh')]);
// //         spawn('chmod', ['+x', path.join(remoteDir, 'target.bed')]);
// //         spawn('chmod', ['+x', path.join(remoteDir, 'interval_file.interval_list')]);
// //         // (Optional) Upload inputDir files if needed

// //         fs.rmSync(tempDir, { recursive: true, force: true }); // Clean up temp directory

// //         // --- Insert into RunningTasks ---
// //         const startTime = Date.now();
// //         await db.query(
// //             'INSERT INTO RunningTasks (projectid, projectname, inputdir, outputdir, logpath, numberofsamples, testtype, status, done, email, starttime) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
// //             [taskId, projectName, remoteInputDir, outputDir, null, numberOfSamples, testType, 'running', false, email, startTime]
// //         );

// //         // --- Insert all SubTasks first ---
// //         if (Array.isArray(sampleIds) && sampleIds.length > 0) {
// //             for (let i = 0; i < sampleIds.length; i++) {
// //                 const sampleId = sampleIds[i];
// //                 const subLogPath = path.join(logPath, `${taskId}_${sampleId}.log`);
// //                 const subtaskid = i + 1;
// //                 const status = i === 0 ? 'running' : 'pending';

// //                 await db.query(
// //                     'INSERT INTO SubTasks (subtaskid, taskid, sampleid, status, email, logpath, scriptpath1, scriptpath2, localdir, target, target_interval, server_host , server_port , server_user, server_os) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11 , $12, $13, $14 ,$15)',
// //                     [
// //                         subtaskid,
// //                         taskId,
// //                         sampleId,
// //                         status,
// //                         email,
// //                         subLogPath,
// //                         path.join(remoteDir, 'call_batch.sh'),
// //                         path.join(remoteDir, 'NeoVar.sh'),
// //                         server.localdir,
// //                         path.join(remoteDir, 'target.bed'),
// //                         path.join(remoteDir, 'interval_file.interval_list'),
// //                         server.host,
// //                         server.port,
// //                         server.user_name,
// //                         server.os
// //                     ]
// //                 );
// //             }

// //             // Now run the analysis for the first sample only
// //             const firstSampleId = sampleIds[0];
// //             const firstSubLogPath = path.join(`/dev/shm/${projectName}/logs`, `${taskId}_${firstSampleId}.log`);
// //             const analysisCmd = `bash ${path.join(remoteDir, 'call_batch.sh')} ${path.join(remoteDir, 'NeoVar.sh')} ${remoteInputDir} ${outputDir} ${remoteDir}/target.bed ${remoteDir}/interval_file.interval_list ${server.localdir} > ${firstSubLogPath} 2>&1 &`;

// //             // await new Promise((resolve, reject) => {
// //             //     const conn = new Client();
// //             //     conn.on('ready', () => {
// //             //         conn.exec(analysisCmd, (err, stream) => {
// //             //             if (err) {
// //             //                 conn.end();
// //             //                 return reject(err);
// //             //             }
// //             //             conn.end();
// //             //             resolve();
// //             //         });
// //             //     }).connect({
// //             //         host: server.host,
// //             //         port: server.port,
// //             //         username: server.user_name,
// //             //         privateKey
// //             //     });
// //             // });

// //             const analysisResult = await ssh.execCommand(analysisCmd);
// //             if (analysisResult.stderr) {
// //                 console.error('Analysis command error:', analysisResult.stderr);
// //                 throw new Error(analysisResult.stderr);
// //             }
// //             ssh.dispose();

// //             // After starting the analysis process, call:
// //             await updateSubtasksProgress(taskId);
// //         }

// //         // Calculate overall progress
// //         const subtasks = await db.query('SELECT * FROM SubTasks WHERE taskid = $1', [taskId]);
// //         let overallProgress = 0;
// //         if (subtasks.rowCount > 0) {
// //             let completedSteps = 0;
// //             let totalSteps = subtasks.rowCount * progressSteps.length;
// //             for (const subtask of subtasks.rows) {
// //                 completedSteps += Math.floor((subtask.progress / 100) * progressSteps.length);
// //             }
// //             overallProgress = Math.floor((completedSteps / totalSteps) * 100);
// //         }

// //         response.push({
// //             message: 'Analysis started successfully',
// //             status: 200,
// //             taskId,
// //             projectName,
// //             inputDir,
// //             outputDir,
// //             tempDir: '', // or null, or the actual tempDir if you want
// //             testType,
// //             server: server.host,
// //             progress: overallProgress
// //         });
// //         console.log('response:', response);
// //         return NextResponse.json(response);
// //     } catch (error) {
// //         console.error('Error in run-analysis-servermode:', error);
// //         return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
// //     }
// // }

// import fs, { unlinkSync } from 'fs';
// import path from 'path';
// import { NextResponse } from 'next/server';
// import { fetchScriptsFromAWS } from '@/lib/fetchScriptsFromAWS';
// import { spawn } from 'child_process';
// import { generateProjectId } from '@/lib/idGenerator';
// import db from '@/lib/db';
// import FormData from 'form-data';
// import axios from 'axios';
// import { NodeSSH } from 'node-ssh';

// const progressSteps = [
//     "Mapping reads with BWA-MEM, sorting",
//     "Running QC analysis",
//     "Mean Quality by Cycle",
//     "Quality Score Distribution",
//     "GC Bias Metrics",
//     "Insert Size Metrics",
//     "Alignment Statistics",
//     "Remove Duplicate Reads",
//     "Running Coverage",
//     "Variant calling",
//     "Variant Filtering",
//     "VCF filtering completed"
// ];

// // const systems = [
// //     { host: '192.168.1.27', user: 'manas', os: 'linux', output_dir: '/dev/shm', port: 22, localDir: '' },
// //     { host: '192.168.1.4', user: 'strive', os: 'linux', output_dir: '/dev/shm', port: 2222, localDir: '/media/strive/Strive/prateek/fastq_to_vcf/local', appPath: '/media/strive/Strive/prateek/python_uploader/app.py', venvPath: '/media/strive/Strive/prateek/python_uploader/.venv/bin/python' },
// //     { host: '192.168.1.10', user: 'hp', os: 'windows-wsl', output_dir: '/dev/shm', port: 22 },
// // ];

// let privateKey;
// if (process.env.SSH_PRIVATE_KEY) {
//     // If the key is set in env, use it directly
//     privateKey = Buffer.from(process.env.SSH_PRIVATE_KEY.replace(/\\n/g, '\n'));
// }

// async function updateSubtasksProgress(taskId) {
//     const subtasks = await db.query('SELECT * FROM SubTasks WHERE taskid = $1 ORDER BY subtaskid ASC', [taskId]);
//     if (subtasks.rowCount === 0) return;

//     for (const subtask of subtasks.rows) {
//         const sampleLogPath = subtask.logpath;
//         let subtaskLogContent = '';
//         try {
//             subtaskLogContent = await readRemoteFile(server, sampleLogPath);
//         } catch {
//             continue; // If the log file is not found, skip this subtask
//         }

//         // Determine the current step for this subtask
//         let subtaskCurrentStep = -1;
//         const logLower = subtaskLogContent.toLowerCase();
//         for (let i = progressSteps.length - 1; i >= 0; i--) {
//             if (
//                 (i === progressSteps.length - 1 && logLower.includes("vcf filtering completed")) ||
//                 logLower.includes(progressSteps[i].toLowerCase())
//             ) {
//                 subtaskCurrentStep = i;
//                 break;
//             }
//         }

//         // Calculate the progress for this subtask
//         const subtaskProgress = Math.floor(((subtaskCurrentStep + 1) / progressSteps.length) * 100);

//         // Update the progress of the subtask in the database
//         await db.query(
//             'UPDATE SubTasks SET progress = $1 WHERE subtaskid = $2 AND taskid = $3',
//             [subtaskProgress, subtask.subtaskid, taskId]
//         );

//         // Optionally, mark as completed
//         if (subtaskProgress === 100) {
//             await db.query(
//                 'UPDATE SubTasks SET status = $1 WHERE subtaskid = $2 AND taskid = $3',
//                 ['completed', subtask.subtaskid, taskId]
//             );
//         }
//     }
// }

// // Helper: Upload a file to the remote server
// // async function uploadFileToServer(server, localPath, remotePath) {
// //     const { Client } = await import('ssh2');
// //     return new Promise((resolve, reject) => {
// //         const conn = new Client();
// //         conn.on('ready', () => {
// //             conn.sftp((err, sftp) => {
// //                 if (err) return reject(err);
// //                 sftp.fastPut(localPath, remotePath, (err) => {
// //                     conn.end();
// //                     if (err) return reject(err);
// //                     resolve();
// //                 });
// //             });
// //         }).connect({
// //             host: server.host,
// //             port: server.port,
// //             username: server.user_name,
// //             privateKey
// //         });
// //     });
// // }

// async function uploadFileToServer(server, localPath, remotePath) {
//     const ssh = new NodeSSH();
//     await ssh.connect({
//         host: server.host,
//         port: server.port,
//         username: server.user_name,
//         privateKey: privateKey.toString(),
//     });
//     await ssh.putFile(localPath, remotePath);
//     ssh.dispose();
// }

// // async function chmodRemoteFile(server, remoteFilePath) {
// //     const { Client } = await import('ssh2');
// //     return new Promise((resolve, reject) => {
// //         // console.log(`Starting chmod for ${remoteFilePath} on ${server.host}`);
// //         const conn = new Client();
// //         conn.on('ready', () => {
// //             conn.exec(`chmod +x ${remoteFilePath}`, (err, stream) => {
// //                 if (err) {
// //                     conn.end();
// //                     return reject(err);
// //                 }
// //                 stream.on('close', (code, signal) => {
// //                     // console.log(`chmod finished for ${remoteFilePath} with code ${code}`);
// //                     conn.end();
// //                     resolve();
// //                 });
// //                 stream.on('data', (data) => {
// //                     console.log('STDOUT:', data.toString());
// //                 });
// //                 stream.stderr.on('data', (data) => {
// //                     console.error('STDERR:', data.toString());
// //                 });
// //             });
// //         }).on('error', (err) => {
// //             console.error('SSH error:', err);
// //             reject(err);
// //         }).connect({
// //             host: server.host,
// //             port: server.port,
// //             username: server.user_name,
// //             privateKey
// //         });
// //     });
// // }

// async function chmodRemoteFile(server, remoteFilePath) {
//     const ssh = new NodeSSH();
//     await ssh.connect({
//         host: server.host,
//         port: server.port,
//         username: server.user_name,
//         privateKey: privateKey.toString(),
//     });
//     const result = await ssh.execCommand(`chmod +x ${remoteFilePath}`);
//     ssh.dispose();
//     if (result.stderr) {
//         console.error('chmod error:', result.stderr);
//         throw new Error(result.stderr);
//     }
// }


// async function uploadFastqFilesToFlask({ username, projectDirPath, files, host }) {
//     await Promise.all(files.map(async filePath => {
//         // console.log('Uploading:', filePath);
//         const form = new FormData();
//         form.append('file', fs.createReadStream(filePath));
//         form.append('username', username);
//         form.append('project_dirpath', projectDirPath);

//         try {
//             const res = await axios.post(`http://${host}:8702/upload`, form, {
//                 headers: form.getHeaders(),
//             });
//             console.log('Flask upload response:', res.data);
//         } catch (err) {
//             console.error('Flask upload error:', err);
//         }
//     }));
//     console.log('All files uploaded to Flask');
// }

// // async function readRemoteFile(server, remotePath) {
// //     const { Client } = await import('ssh2');
// //     return new Promise((resolve, reject) => {
// //         let content = '';
// //         const conn = new Client();
// //         conn.on('ready', () => {
// //             conn.exec(`cat ${remotePath}`, (err, stream) => {
// //                 if (err) {
// //                     conn.end();
// //                     return reject(err);
// //                 }
// //                 stream.on('data', (data) => {
// //                     content += data.toString();
// //                 });
// //                 stream.on('close', () => {
// //                     conn.end();
// //                     resolve(content);
// //                 });
// //                 stream.stderr.on('data', (data) => {
// //                     console.error('STDERR:', data.toString());
// //                 });
// //             });
// //         }).connect({
// //             host: server.host,
// //             port: server.port,
// //             username: server.user_name,
// //             privateKey
// //         });
// //     });
// // }

// async function readRemoteFile(server, remotePath) {
//     const ssh = new NodeSSH();
//     await ssh.connect({
//         host: server.host,
//         port: server.port,
//         username: server.user_name,
//         privateKey: privateKey.toString(),
//     });
//     const result = await ssh.execCommand(`cat ${remotePath}`);
//     ssh.dispose();
//     if (result.stderr) {
//         console.error('STDERR:', result.stderr);
//         throw new Error(result.stderr);
//     }
//     return result.stdout;
// }


// export async function POST(req) {
//     try {
//         const ssh = new NodeSSH();
//         const response = [];
//         const { projectName, inputDir, testType, email, sampleIds, numberOfSamples } = await req.json();
//         const { rows: servers } = await db.query('SELECT * FROM server_systems ORDER BY id');

//         const { rows: assignedSubtasks } = await db.query('SELECT server_user FROM SubTasks WHERE status = $1', ['running']);
//         const assignedUsers = assignedSubtasks.map(row => row.server_user);

//         let serverIndex = 0;
//         if (assignedUsers.length > 0) {
//             // Find the last used server in running subtasks
//             const lastAssignedUser = assignedUsers[assignedUsers.length - 1];
//             serverIndex = servers.findIndex(s => s.user === lastAssignedUser);
//             serverIndex = (serverIndex + 1) % servers.length;
//         }
//         // const server = rows[0];
//         const server = servers[serverIndex];

//         const remoteDir = path.join(server.output_dir, projectName);
//         console.log('sampleIds:', sampleIds);

//         console.log('server:', server);


//         // --- Project ID logic ---
//         let taskId;
//         const getRunningTasks = await db.query('SELECT email from RunningTasks WHERE email = $1', [email]);
//         const getCounterTasks = await db.query('SELECT email from CounterTasks WHERE email = $1', [email]);

//         if (getRunningTasks.rowCount > 0) {
//             response.push({
//                 message: 'One task is already Running',
//                 status: 400
//             });
//             return NextResponse.json(response);
//         }
//         if (getCounterTasks.rowCount === 0 && getRunningTasks.rowCount === 0) {
//             taskId = generateProjectId();
//         } else if (getCounterTasks.rowCount > 0) {
//             const length = getCounterTasks.rows.length;
//             taskId = generateProjectId(length);
//         }

//         // --- Date/time for outputDir ---
//         const date = new Date();
//         const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
//         const formattedTime = `${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
//         const formattedDateTime = `${formattedDate}_${formattedTime}`;
//         const outputDir = path.join(remoteDir, 'outputDir_' + formattedDateTime);
//         const logPath = path.join(remoteDir, 'logs')
//         const inputDirName = path.basename(inputDir);
//         const remoteInputDir = path.join(remoteDir, inputDirName);

//         // await startFlaskOnRemote(server);
//         // 1. Fetch scripts/targets from AWS to local temp
//         const tempDir = '/tmp/servermode';
//         fs.mkdirSync(tempDir, { recursive: true });
//         // await new Promise((resolve, reject) => {
//         //     const conn = new Client();
//         //     conn.on('ready', () => {
//         //         console.log('SSH connection ready');
//         //         conn.exec(`mkdir -p ${remoteDir} ${outputDir} ${logPath} ${remoteInputDir}`, (err, stream) => {
//         //             if (err) {
//         //                 console.error('conn.exec error:', err);
//         //                 conn.end();
//         //                 return reject(err);
//         //             }
//         //             stream.on('close', (code, signal) => {
//         //                 console.log('mkdir command closed', code, signal);
//         //                 conn.end();
//         //                 resolve();
//         //             });
//         //             stream.on('data', (data) => {
//         //                 console.log('STDOUT:', data.toString());
//         //             });
//         //             stream.stderr.on('data', (data) => {
//         //                 console.error('STDERR:', data.toString());
//         //             });
//         //         });
//         //     }).on('error', (err) => {
//         //         console.error('SSH connection error:', err);
//         //         reject(err);
//         //     }).connect({
//         //         host: server.host,
//         //         port: server.port,
//         //         username: server.user_name,
//         //         privateKey
//         //     });
//         // });

//         await ssh.connect({
//             host: server.host,
//             port: server.port,
//             username: server.user_name,
//             privateKey: privateKey.toString(),
//         });
//         const mkdirCmd = `mkdir -p ${remoteDir} ${outputDir} ${logPath} ${remoteInputDir}`;
//         const mkdirResult = await ssh.execCommand(mkdirCmd);
//         if (mkdirResult.stderr) {
//             console.error('mkdir error:', mkdirResult.stderr);
//             throw new Error(mkdirResult.stderr);
//         }
//         console.log('mkdir created')

//         console.log('uploading files to Flask');
//         // await rsyncUpload(inputDir, server, remoteInputDir);
//         await uploadFastqFilesToFlask({
//             host: server.host,
//             username: server.user_name,
//             projectDirPath: remoteInputDir,
//             files: fs.readdirSync(inputDir).map(file => path.join(inputDir, file))
//         });

//         console.log('files uploaded to Flask');


//         const callBatchPath = await fetchScriptsFromAWS('resources/call_batch.sh', tempDir);
//         const neoVarPath = await fetchScriptsFromAWS('resources/NeoVar.sh', tempDir);

//         let targetPath, intervalPath;
//         if (testType === 'exome') {
//             targetPath = await fetchScriptsFromAWS('resources/Exome.hg38.target.vC1.bed', tempDir);
//             intervalPath = await fetchScriptsFromAWS('resources/Exome.hg38.target.vC1.interval_list', tempDir);
//         } else if (testType === 'clinical') {
//             targetPath = await fetchScriptsFromAWS('resources/UCE_hg38_v1.1.bed', tempDir);
//             intervalPath = await fetchScriptsFromAWS('resources/UCE_hg38_v1.1.interval_list', tempDir);
//         } else if (testType === 'carrier') {
//             targetPath = await fetchScriptsFromAWS('resources/SCR_hg38_v1.1.bed', tempDir);
//             intervalPath = await fetchScriptsFromAWS('resources/SCR_hg38_v1.1.interval_list', tempDir);
//         } else {
//             response.push({
//                 message: 'Invalid test type',
//                 status: 400
//             });
//             return NextResponse.json(response);
//         }


//         // 2. Upload files to remote server
//         await uploadFileToServer(server, callBatchPath, path.join(remoteDir, 'call_batch.sh'));
//         await chmodRemoteFile(server, path.join(remoteDir, 'call_batch.sh'));
//         // console.log('call_batch.sh uploaded');

//         await uploadFileToServer(server, neoVarPath, path.join(remoteDir, 'NeoVar.sh'));
//         await chmodRemoteFile(server, path.join(remoteDir, 'NeoVar.sh'));
//         // console.log('NeoVar.sh uploaded');

//         await uploadFileToServer(server, targetPath, path.join(remoteDir, 'target.bed'));
//         await chmodRemoteFile(server, path.join(remoteDir, 'target.bed'));
//         // console.log('target.bed uploaded');

//         await uploadFileToServer(server, intervalPath, path.join(remoteDir, 'interval_file.interval_list'));
//         await chmodRemoteFile(server, path.join(remoteDir, 'interval_file.interval_list'));
//         // console.log('interval_file.interval_list uploaded');
//         console.log('all files uploaded to remote server');

//         spawn('chmod', ['+x', path.join(remoteDir, 'call_batch.sh')]);
//         spawn('chmod', ['+x', path.join(remoteDir, 'NeoVar.sh')]);
//         spawn('chmod', ['+x', path.join(remoteDir, 'target.bed')]);
//         spawn('chmod', ['+x', path.join(remoteDir, 'interval_file.interval_list')]);
//         // (Optional) Upload inputDir files if needed

//         fs.rmSync(tempDir, { recursive: true, force: true }); // Clean up temp directory

//         // --- Insert into RunningTasks ---
//         const startTime = Date.now();
//         await db.query(
//             'INSERT INTO RunningTasks (projectid, projectname, inputdir, outputdir, logpath, numberofsamples, testtype, status, done, email, starttime) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
//             [taskId, projectName, remoteInputDir, outputDir, null, numberOfSamples, testType, 'running', false, email, startTime]
//         );

//         // --- Insert all SubTasks first ---
//         if (Array.isArray(sampleIds) && sampleIds.length > 0) {
//             for (let i = 0; i < sampleIds.length; i++) {
//                 const sampleId = sampleIds[i];
//                 const subLogPath = path.join(logPath, `${taskId}_${sampleId}.log`);
//                 const subtaskid = i + 1;
//                 const status = i === 0 ? 'running' : 'pending';

//                 await db.query(
//                     'INSERT INTO SubTasks (subtaskid, taskid, sampleid, status, email, logpath, scriptpath1, scriptpath2, localdir, target, target_interval, server_host , server_port , server_user, server_os) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11 , $12, $13, $14 ,$15)',
//                     [
//                         subtaskid,
//                         taskId,
//                         sampleId,
//                         status,
//                         email,
//                         subLogPath,
//                         path.join(remoteDir, 'call_batch.sh'),
//                         path.join(remoteDir, 'NeoVar.sh'),
//                         server.localdir,
//                         path.join(remoteDir, 'target.bed'),
//                         path.join(remoteDir, 'interval_file.interval_list'),
//                         server.host,
//                         server.port,
//                         server.user_name,
//                         server.os
//                     ]
//                 );
//             }

//             // Now run the analysis for the first sample only
//             const firstSampleId = sampleIds[0];
//             const firstSubLogPath = path.join(`/dev/shm/${projectName}/logs`, `${taskId}_${firstSampleId}.log`);
//             const analysisCmd = `bash ${path.join(remoteDir, 'call_batch.sh')} ${path.join(remoteDir, 'NeoVar.sh')} ${remoteInputDir} ${outputDir} ${remoteDir}/target.bed ${remoteDir}/interval_file.interval_list ${server.localdir} > ${firstSubLogPath} 2>&1 &`;

//             // await new Promise((resolve, reject) => {
//             //     const conn = new Client();
//             //     conn.on('ready', () => {
//             //         conn.exec(analysisCmd, (err, stream) => {
//             //             if (err) {
//             //                 conn.end();
//             //                 return reject(err);
//             //             }
//             //             conn.end();
//             //             resolve();
//             //         });
//             //     }).connect({
//             //         host: server.host,
//             //         port: server.port,
//             //         username: server.user_name,
//             //         privateKey
//             //     });
//             // });

//             const analysisResult = await ssh.execCommand(analysisCmd);
//             if (analysisResult.stderr) {
//                 console.error('Analysis command error:', analysisResult.stderr);
//                 throw new Error(analysisResult.stderr);
//             }
//             ssh.dispose();

//             // After starting the analysis process, call:
//             await updateSubtasksProgress(taskId);
//         }

//         // Calculate overall progress
//         const subtasks = await db.query('SELECT * FROM SubTasks WHERE taskid = $1', [taskId]);
//         let overallProgress = 0;
//         if (subtasks.rowCount > 0) {
//             let completedSteps = 0;
//             let totalSteps = subtasks.rowCount * progressSteps.length;
//             for (const subtask of subtasks.rows) {
//                 completedSteps += Math.floor((subtask.progress / 100) * progressSteps.length);
//             }
//             overallProgress = Math.floor((completedSteps / totalSteps) * 100);
//         }

//         response.push({
//             message: 'Analysis started successfully',
//             status: 200,
//             taskId,
//             projectName,
//             inputDir,
//             outputDir,
//             tempDir: '', // or null, or the actual tempDir if you want
//             testType,
//             server: server.host,
//             progress: overallProgress
//         });
//         console.log('response:', response);
//         return NextResponse.json(response);
//     } catch (error) {
//         console.error('Error in run-analysis-servermode:', error);
//         return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//     }
// }

const fs = require('fs');
const path = require('path');
const { fetchScriptsFromAWS } = require('../../lib/fetchScriptsFromAWS');
const { spawn } = require('child_process');
const { generateProjectId } = require('../../lib/idGenerator');
const FormData = require('form-data');
const axios = require('axios');
const { NodeSSH } = require('node-ssh');
const db = require('../../db/config');

const progressSteps = [
    "Mapping reads with BWA-MEM, sorting",
    "Running QC analysis",
    "Mean Quality by Cycle",
    "Quality Score Distribution",
    "GC Bias Metrics",
    "Insert Size Metrics",
    "Alignment Statistics",
    "Remove Duplicate Reads",
    "Running Coverage",
    "Variant calling",
    "Variant Filtering",
    "VCF filtering completed"
];

let privateKey;
if (process.env.SSH_PRIVATE_KEY) {
    privateKey = Buffer.from(process.env.SSH_PRIVATE_KEY.replace(/\\n/g, '\n'));
}

async function updateSubtasksProgress(taskId, server) {
    const subtasks = await db.query('SELECT * FROM SubTasks WHERE taskid = $1 ORDER BY subtaskid ASC', [taskId]);
    if (subtasks.rowCount === 0) return;

    for (const subtask of subtasks.rows) {
        const sampleLogPath = subtask.logpath;
        let subtaskLogContent = '';
        try {
            subtaskLogContent = await readRemoteFile(server, sampleLogPath);
        } catch {
            continue;
        }

        let subtaskCurrentStep = -1;
        const logLower = subtaskLogContent.toLowerCase();
        for (let i = progressSteps.length - 1; i >= 0; i--) {
            if (
                (i === progressSteps.length - 1 && logLower.includes("vcf filtering completed")) ||
                logLower.includes(progressSteps[i].toLowerCase())
            ) {
                subtaskCurrentStep = i;
                break;
            }
        }

        const subtaskProgress = Math.floor(((subtaskCurrentStep + 1) / progressSteps.length) * 100);

        await db.query(
            'UPDATE SubTasks SET progress = $1 WHERE subtaskid = $2 AND taskid = $3',
            [subtaskProgress, subtask.subtaskid, taskId]
        );

        if (subtaskProgress === 100) {
            await db.query(
                'UPDATE SubTasks SET status = $1 WHERE subtaskid = $2 AND taskid = $3',
                ['completed', subtask.subtaskid, taskId]
            );
        }
    }
}

async function uploadFileToServer(server, localPath, remotePath) {
    const ssh = new NodeSSH();
    await ssh.connect({
        host: server.host,
        port: server.port,
        username: server.user_name,
        privateKey: privateKey.toString(),
    });
    await ssh.putFile(localPath, remotePath);
    ssh.dispose();
}

async function chmodRemoteFile(server, remoteFilePath) {
    const ssh = new NodeSSH();
    await ssh.connect({
        host: server.host,
        port: server.port,
        username: server.user_name,
        privateKey: privateKey.toString(),
    });
    const result = await ssh.execCommand(`chmod +x ${remoteFilePath}`);
    ssh.dispose();
    if (result.stderr) {
        console.error('chmod error:', result.stderr);
        throw new Error(result.stderr);
    }
}

async function uploadFastqFilesToFlask({ username, projectDirPath, files, host }) {
    await Promise.all(files.map(async filePath => {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
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

async function readRemoteFile(server, remotePath) {
    const ssh = new NodeSSH();
    await ssh.connect({
        host: server.host,
        port: server.port,
        username: server.user_name,
        privateKey: privateKey.toString(),
    });
    const result = await ssh.execCommand(`cat ${remotePath}`);
    ssh.dispose();
    if (result.stderr) {
        console.error('STDERR:', result.stderr);
        throw new Error(result.stderr);
    }
    return result.stdout;
}

const serverModeController = async (req, res) => {
    try {
        const ssh = new NodeSSH();
        const response = [];
        const { projectName, inputDir, testType, email, sampleIds, numberOfSamples } = req.body;
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

        const remoteDir = path.join(server.output_dir, projectName);

        let taskId;
        const getRunningTasks = await db.query('SELECT email from RunningTasks WHERE email = $1', [email]);
        const getCounterTasks = await db.query('SELECT email from CounterTasks WHERE email = $1', [email]);

        if (getRunningTasks.rowCount > 0) {
            response.push({
                message: 'One task is already Running',
                status: 400
            });
            return res.status(400).json(response);
        }
        if (getCounterTasks.rowCount === 0 && getRunningTasks.rowCount === 0) {
            taskId = generateProjectId();
        } else if (getCounterTasks.rowCount > 0) {
            const length = getCounterTasks.rows.length;
            taskId = generateProjectId(length);
        }

        const date = new Date();
        const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const formattedTime = `${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
        const formattedDateTime = `${formattedDate}_${formattedTime}`;
        const outputDir = path.join(remoteDir, 'outputDir_' + formattedDateTime);
        const logPath = path.join(remoteDir, 'logs')
        const inputDirName = path.basename(inputDir);
        const remoteInputDir = path.join(remoteDir, inputDirName);

        const tempDir = '/tmp/servermode';
        fs.mkdirSync(tempDir, { recursive: true });
        await ssh.connect({
            host: server.host,
            port: server.port,
            username: server.user_name,
            privateKey: privateKey.toString(),
        });
        const mkdirCmd = `mkdir -p ${remoteDir} ${outputDir} ${logPath} ${remoteInputDir}`;
        const mkdirResult = await ssh.execCommand(mkdirCmd);
        if (mkdirResult.stderr) {
            console.error('mkdir error:', mkdirResult.stderr);
            throw new Error(mkdirResult.stderr);
        }

        await uploadFastqFilesToFlask({
            host: server.host,
            username: server.user_name,
            projectDirPath: remoteInputDir,
            files: fs.readdirSync(inputDir).map(file => path.join(inputDir, file))
        });

        const callBatchPath = await fetchScriptsFromAWS('resources/call_batch.sh', tempDir);
        const neoVarPath = await fetchScriptsFromAWS('resources/NeoVar.sh', tempDir);

        let targetPath, intervalPath;
        if (testType === 'exome') {
            targetPath = await fetchScriptsFromAWS('resources/Exome.hg38.target.vC1.bed', tempDir);
            intervalPath = await fetchScriptsFromAWS('resources/Exome.hg38.target.vC1.interval_list', tempDir);
        } else if (testType === 'clinical') {
            targetPath = await fetchScriptsFromAWS('resources/UCE_hg38_v1.1.bed', tempDir);
            intervalPath = await fetchScriptsFromAWS('resources/UCE_hg38_v1.1.interval_list', tempDir);
        } else if (testType === 'carrier') {
            targetPath = await fetchScriptsFromAWS('resources/SCR_hg38_v1.1.bed', tempDir);
            intervalPath = await fetchScriptsFromAWS('resources/SCR_hg38_v1.1.interval_list', tempDir);
        } else {
            response.push({
                message: 'Invalid test type',
                status: 400
            });
            return res.status(400).json(response);
        }

        await uploadFileToServer(server, callBatchPath, path.join(remoteDir, 'call_batch.sh'));
        await chmodRemoteFile(server, path.join(remoteDir, 'call_batch.sh'));

        await uploadFileToServer(server, neoVarPath, path.join(remoteDir, 'NeoVar.sh'));
        await chmodRemoteFile(server, path.join(remoteDir, 'NeoVar.sh'));

        await uploadFileToServer(server, targetPath, path.join(remoteDir, 'target.bed'));
        await chmodRemoteFile(server, path.join(remoteDir, 'target.bed'));

        await uploadFileToServer(server, intervalPath, path.join(remoteDir, 'interval_file.interval_list'));
        await chmodRemoteFile(server, path.join(remoteDir, 'interval_file.interval_list'));

        spawn('chmod', ['+x', path.join(remoteDir, 'call_batch.sh')]);
        spawn('chmod', ['+x', path.join(remoteDir, 'NeoVar.sh')]);
        spawn('chmod', ['+x', path.join(remoteDir, 'target.bed')]);
        spawn('chmod', ['+x', path.join(remoteDir, 'interval_file.interval_list')]);

        fs.rmSync(tempDir, { recursive: true, force: true });

        const startTime = Date.now();
        await db.query(
            'INSERT INTO RunningTasks (projectid, projectname, inputdir, outputdir, logpath, numberofsamples, testtype, status, done, email, starttime) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [taskId, projectName, remoteInputDir, outputDir, null, numberOfSamples, testType, 'running', false, email, startTime]
        );

        if (Array.isArray(sampleIds) && sampleIds.length > 0) {
            for (let i = 0; i < sampleIds.length; i++) {
                const sampleId = sampleIds[i];
                const subLogPath = path.join(logPath, `${taskId}_${sampleId}.log`);
                const subtaskid = i + 1;
                const status = i === 0 ? 'running' : 'pending';

                await db.query(
                    'INSERT INTO SubTasks (subtaskid, taskid, sampleid, status, email, logpath, scriptpath1, scriptpath2, localdir, target, target_interval, server_host , server_port , server_user, server_os) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11 , $12, $13, $14 ,$15)',
                    [
                        subtaskid,
                        taskId,
                        sampleId,
                        status,
                        email,
                        subLogPath,
                        path.join(remoteDir, 'call_batch.sh'),
                        path.join(remoteDir, 'NeoVar.sh'),
                        server.localdir,
                        path.join(remoteDir, 'target.bed'),
                        path.join(remoteDir, 'interval_file.interval_list'),
                        server.host,
                        server.port,
                        server.user_name,
                        server.os
                    ]
                );
            }

            const firstSampleId = sampleIds[0];
            const firstSubLogPath = path.join(`/dev/shm/${projectName}/logs`, `${taskId}_${firstSampleId}.log`);
            const analysisCmd = `bash ${path.join(remoteDir, 'call_batch.sh')} ${path.join(remoteDir, 'NeoVar.sh')} ${remoteInputDir} ${outputDir} ${remoteDir}/target.bed ${remoteDir}/interval_file.interval_list ${server.localdir} > ${firstSubLogPath} 2>&1 &`;

            const analysisResult = await ssh.execCommand(analysisCmd);
            if (analysisResult.stderr) {
                console.error('Analysis command error:', analysisResult.stderr);
                throw new Error(analysisResult.stderr);
            }
            ssh.dispose();

            await updateSubtasksProgress(taskId, server);
        }

        const subtasks = await db.query('SELECT * FROM SubTasks WHERE taskid = $1', [taskId]);
        let overallProgress = 0;
        if (subtasks.rowCount > 0) {
            let completedSteps = 0;
            let totalSteps = subtasks.rowCount * progressSteps.length;
            for (const subtask of subtasks.rows) {
                completedSteps += Math.floor((subtask.progress / 100) * progressSteps.length);
            }
            overallProgress = Math.floor((completedSteps / totalSteps) * 100);
        }

        response.push({
            message: 'Analysis started successfully',
            status: 200,
            taskId,
            projectName,
            inputDir,
            outputDir,
            tempDir: '',
            testType,
            server: server.host,
            progress: overallProgress
        });
        return res.status(200).json(response);
    } catch (error) {
        console.error('Error in run-analysis-servermode:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = serverModeController;

// const express = require('express');
// const serverModeController = require('./serverModeController');
// const router = express.Router();

// router.post('/server-mode', serverModeController);

// module.exports = router;