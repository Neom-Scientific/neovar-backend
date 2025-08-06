// // v3.0

// import { NextResponse } from 'next/server';
// import fs, { unlinkSync } from 'fs';
// import path from 'path';
// import os from 'os';
// import db from '@/lib/db';
// import { exec, spawn } from 'child_process';
// import { fetchScriptsFromAWS } from '@/lib/fetchScriptsFromAWS';
// import { NodeSSH } from 'node-ssh';

// // Ordered steps for progress tracking
// const progressSteps = [
//   "Mapping reads with BWA-MEM, sorting",
//   "Running QC analysis",
//   "Mean Quality by Cycle",
//   "Quality Score Distribution",
//   "GC Bias Metrics",
//   "Insert Size Metrics",
//   "Alignment Statistics",
//   "Remove Duplicate Reads",
//   "Running Coverage",
//   "Variant calling",
//   "Variant Filtering",
//   "VCF filtering completed"
// ];

// export async function POST(req) {
//   try {
//     const { taskId, email } = await req.json();
//     if (fs.existsSync('/dev/shm/resources')) {
//       fs.rmSync('/dev/shm/resources', { recursive: true, force: true });
//     }

//     // Fetch the task and its subtasks
//     const task = await db.query('SELECT * FROM RunningTasks WHERE projectid = $1', [taskId]);
//     if (task.rowCount === 0) {
//       return NextResponse.json({ error: 'Project not found' }, { status: 200 });
//     }

//     // Detect server-mode by checking a field (e.g., server_host or a mode column)

//     const subtasks = await db.query('SELECT * FROM SubTasks WHERE taskid = $1 and email = $2 ORDER BY subtaskid ASC', [taskId, email]);
//     if (subtasks.rowCount === 0) {
//       return NextResponse.json({ error: 'No subtasks found for this task' }, { status: 200 });
//     }
//     const isServerMode = !!subtasks.rows[0].server_host; // or use a 'mode' column if you have one

//     let server = null;
//     if (isServerMode) {
//       server = {
//         host: subtasks.rows[0].server_host,
//         port: subtasks.rows[0].server_port,
//         user: subtasks.rows[0].server_user,
//         os: subtasks.rows[0].server_os,
//       };
//     }

//     let logPath;
//     const startTime = task.rows[0].starttime;
//     const resources_path = path.join(os.tmpdir(), `.resources_${taskId}`);
//     for (const subtask of subtasks.rows) {
//       logPath = path.join(
//         path.dirname(subtask.logpath),
//         `${subtask.sampleid}.log`
//       );
//     }


//     // Calculate progress based on subtasks
//     let overallProgress = 0;

//     if (subtasks.rowCount > 0) {
//       let completedSteps = 0;
//       let totalSteps = subtasks.rowCount * progressSteps.length;

//       for (const subtask of subtasks.rows) {
//         const sampleLogPath = path.join(
//           path.dirname(subtask.logpath),
//           `${subtask.sampleid}.log`
//         );
//         // console.log('first sampleLogPath:', sampleLogPath);
//         let subtaskLogContent = '';
//         try {
//           if (isServerMode) {
//             // You need to know which server to connect to (store server info in RunningTasks or SubTasks)
//             subtaskLogContent = await readRemoteFile(server, subtask.logpath);
//             // console.log('subtaskLogContent:', subtaskLogContent);
//           } else {
//             subtaskLogContent = fs.readFileSync(subtask.logpath, 'utf8');
//           }
//         } catch (err) {
//           console.log('error reading log file:', err, subtask.logpath);
//           continue; // If the log file is not found, skip this subtask
//         }

//         // Determine the current step for this subtask
//         let subtaskCurrentStep = -1;
//         const logLower = subtaskLogContent.toLowerCase();
//         for (let i = progressSteps.length - 1; i >= 0; i--) {
//           // Case-insensitive and partial match for the last step
//           if (
//             (i === progressSteps.length - 1 && logLower.includes("vcf filtering completed")) ||
//             logLower.includes(progressSteps[i].toLowerCase())
//           ) {
//             subtaskCurrentStep = i;
//             break;
//           }
//         }

//         // Calculate the progress for this subtask
//         const subtaskProgress = Math.floor(((subtaskCurrentStep + 1) / progressSteps.length) * 100);

//         // Update the progress of the subtask in the database
//         await db.query(
//           'UPDATE SubTasks SET progress = $1 WHERE subtaskid = $2 AND taskid = $3 and email = $4',
//           [subtaskProgress, subtask.subtaskid, taskId, email]
//         );
//         // console.log(`Subtask ${subtask.subtaskid} progress: ${subtaskProgress}%`); // Log the progress for debugging

//         // Add the completed steps for this subtask
//         if (subtaskProgress === 100) {
//           completedSteps += progressSteps.length; // Fully completed subtask contributes all steps

//           // Mark the subtask as completed instead of deleting it
//           await db.query(
//             'UPDATE SubTasks SET status = $1 WHERE subtaskid = $2 AND taskid = $3 and email = $4',
//             ['completed', subtask.subtaskid, taskId, email]
//           );
//           // console.log(`Subtask ${subtask.subtaskid} marked as completed.`);
//         } else {
//           completedSteps += subtaskCurrentStep + 1; // Partially completed subtask contributes its current steps
//         }
//       }

//       // Calculate overall progress as a percentage
//       overallProgress = Math.floor((completedSteps / totalSteps) * 100);
//     }

//     // Log the overall progress for debugging
//     // console.log('overallProgress:', overallProgress);

//     // Update progress in the database
//     if (task.rows[0].progress == null || task.rows[0].progress !== overallProgress) {
//       await db.query(
//         'UPDATE RunningTasks SET progress = $1, status = $2 WHERE projectid = $3',
//         [overallProgress, 'in progress', taskId]
//       );
//     }

//     // If all subtasks are completed, delete them and mark the task as done
//     const allCompleted = subtasks.rows.every((subtask) => subtask.status === 'completed');
//     if (allCompleted) {
//       // console.log('All subtasks are completed. Cleaning up...');
//       const logFiles = subtasks.rows.map((subtask) => subtask.logpath);
//       logFiles.forEach((logFile) => {
//         if (fs.existsSync(logFile)) {
//           unlinkSync(logFile); // Delete log files
//         }
//       });
//       const targetFiles = subtasks.rows.map((subtask) => subtask.target);
//       targetFiles.forEach((targetFile) => {
//         if (fs.existsSync(targetFile)) {
//           unlinkSync(targetFile); // Delete target files
//         }
//       });
//       const targetIntervalFiles = subtasks.rows.map((subtask) => subtask.target_interval);
//       targetIntervalFiles.forEach((targetIntervalFile) => {
//         if (fs.existsSync(targetIntervalFile)) {
//           unlinkSync(targetIntervalFile); // Delete target interval files
//         }
//       });
//       await db.query('DELETE FROM SubTasks WHERE taskid = $1', [taskId]); // Delete all subtasks
//       await db.query(
//         'INSERT INTO CounterTasks (projectid, projectname, analysistatus, creationtime, progress, numberofsamples, totaltime, email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
//         [
//           task.rows[0].projectid,
//           task.rows[0].projectname,
//           'done',
//           task.rows[0].starttime,
//           100,
//           task.rows[0].numberofsamples,
//           Date.now() - startTime,
//           email
//         ]
//       );

//       fs.rmSync(resources_path, { recursive: true, force: true });

//       if (fs.existsSync(task.rows[0].inputdir)) {
//         fs.rmSync(task.rows[0].inputdir, { recursive: true, force: true });
//       }

//       fs.rmSync('/dev/shm/.logs', { recursive: true, force: true });

//       await db.query('DELETE FROM RunningTasks WHERE projectid = $1', [taskId]);

//       return NextResponse.json({
//         taskId,
//         projectName: task.rows[0].projectname,
//         numberOfSamples: task.rows[0].numberofsamples,
//         startTime,
//         progress: 100,
//         status: 'done',
//         eta: 'Completed',
//       });
//     }

//     // If not all subtasks are completed, start the next subtask
//     const nextSubtask = subtasks.rows.find((s) => s.status === 'pending');
//     if (nextSubtask) {
//       // Check if there is any subtask currently running
//       const runningSubtask = subtasks.rows.find((s) => s.status === 'running');
//       if (runningSubtask) {
//         // console.log(`Subtask ${runningSubtask.subtaskid} is still running. Waiting for it to complete.`);
//       } else {
//         // create a strong password for the zip file generate the 16 characters password
//         const tempDir = path.join('/dev/shm', 'resources');
//         fs.mkdirSync(tempDir, { recursive: true });
//         let scriptPath1, scriptPath2;
//         scriptPath1 = await fetchScriptsFromAWS('resources/call_batch.sh', tempDir);
//         scriptPath2 = await fetchScriptsFromAWS('resources/NeoVar.sh', tempDir);

//         const args = [
//           path.join(tempDir, 'call_batch.sh'),
//           path.join(tempDir, 'NeoVar.sh'),
//           task.rows[0].inputdir,
//           task.rows[0].outputdir,
//           nextSubtask.target,
//           nextSubtask.target_interval,
//           nextSubtask.localdir,
//           nextSubtask.logpath,
//         ]

//         const daemonPath = 'tmp/ramfiles'
//         spawn(daemonPath, args, { stdio: 'inherit', detached: true }).unref();

//         if (isServerMode && nextSubtask) {
//           // Fetch latest subtask info from DB (optional, for fresh data)
//           const subtaskRes = await db.query('SELECT * FROM SubTasks WHERE subtaskid = $1 AND taskid = $2 and email = $3', [nextSubtask.subtaskid, taskId,email]);
//           const subtaskToRun = subtaskRes.rows[0];

//           // Run analysis for this subtask on the remote server
//           await runRemoteAnalysisForSubtask(server, subtaskToRun, task);
//         }

//         // Update the status of the next subtask to 'running'
//         await db.query(
//           'UPDATE SubTasks SET status = $1 WHERE subtaskid = $2 AND taskid = $3 and email = $4',
//           ['running', nextSubtask.subtaskid, taskId, email]
//         );
//         if (fs.existsSync(tempDir)) {
//           fs.rmdirSync(tempDir, { recursive: true });
//         }
//         // console.log(`Subtask ${nextSubtask.subtaskid} is now running.`);
//       }
//     }


//     // Estimate ETA
//     const elapsed = Date.now() - startTime;
//     const remainingMinutes = Math.max(1, Math.ceil((60 * 60 * 1000 - elapsed) / 60000));

//     return NextResponse.json({
//       taskId,
//       projectName: task.rows[0].projectname,
//       numberOfSamples: task.rows[0].numberofsamples,
//       startTime: parseInt(task.rows[0].starttime),
//       progress: overallProgress,
//       status: 'in progress',
//       inputDir: task.rows[0].inputdir,
//       outputDir: task.rows[0].outputdir,
//       testtype: task.rows[0].testtype,
//       eta: `${remainingMinutes} minute(s) left`,
//     });
//   } catch (error) {
//     console.error('Progress error:', error);
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//   }
// }

// let privateKey;
// if (process.env.SSH_PRIVATE_KEY) {
//   // If the key is set in env, use it directly
//   privateKey = Buffer.from(process.env.SSH_PRIVATE_KEY.replace(/\\n/g, '\n'));
// }


// // async function readRemoteFile(server, remotePath) {
// //   const { Client } = await import('ssh2');
// //   return new Promise((resolve, reject) => {
// //     const conn = new Client();
// //     let data = '';
// //     conn.on('ready', () => {
// //       conn.sftp((err, sftp) => {
// //         if (err) return reject(err);
// //         const stream = sftp.createReadStream(remotePath);
// //         stream.on('data', chunk => data += chunk.toString());
// //         stream.on('end', () => {
// //           conn.end();
// //           resolve(data);
// //         });
// //         stream.on('error', err => {
// //           conn.end();
// //           reject(err);
// //         });
// //       });
// //     }).connect({
// //       host: server.host,
// //       port: server.port,
// //       username: server.user,
// //       privateKey
// //     });
// //   });
// // }

// async function readRemoteFile(server, remotePath) {
//   const ssh = new NodeSSH();
//   await ssh.connect({
//     host: server.host,
//     port: server.port,
//     username: server.user,
//     privateKey: privateKey.toString(),
//   });
//   const result = await ssh.execCommand(`cat ${remotePath}`);
//   ssh.dispose();
//   if (result.stderr) throw new Error(result.stderr);
//   return result.stdout;
// }

// // async function runRemoteAnalysisForSubtask(server, subtask, task) {
// //   const { Client } = await import('ssh2');
// //   const analysisCmd = `bash ${subtask.scriptpath1} ${subtask.scriptpath2} ${task.inputdir} ${task.outputdir} ${subtask.target} ${subtask.target_interval} ${subtask.localdir} > ${subtask.logpath} 2>&1 &`;
// //   return new Promise((resolve, reject) => {
// //     const conn = new Client();
// //     conn.on('ready', () => {
// //       conn.exec(analysisCmd, (err, stream) => {
// //         if (err) {
// //           conn.end();
// //           return reject(err);
// //         }
// //         conn.end();
// //         resolve();
// //       });
// //     }).connect({
// //       host: server.host,
// //       port: server.port,
// //       username: server.user,
// //       privateKey
// //     });
// //   });
// // }

// async function runRemoteAnalysisForSubtask(server, subtask, task) {
//   const ssh = new NodeSSH();
//   await ssh.connect({
//     host: server.host,
//     port: server.port,
//     username: server.user,
//     privateKey: privateKey.toString(),
//   });

//   const analysisCmd = `bash ${subtask.scriptpath1} ${subtask.scriptpath2} ${task.inputdir} ${task.outputdir} ${subtask.target} ${subtask.target_interval} ${subtask.localdir} > ${subtask.logpath} 2>&1 &`;

//   const result = await ssh.execCommand(analysisCmd);
//   ssh.dispose();

//   if (result.stderr) throw new Error(result.stderr);
//   return result.stdout;
// }

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const { fetchScriptsFromAWS } = require('../../lib/fetchScriptsFromAWS');
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

async function readRemoteFile(server, remotePath) {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: server.host,
    port: server.port,
    username: server.user,
    privateKey: privateKey.toString(),
  });
  const result = await ssh.execCommand(`cat ${remotePath}`);
  ssh.dispose();
  if (result.stderr) throw new Error(result.stderr);
  return result.stdout;
}

async function runRemoteAnalysisForSubtask(server, subtask, task) {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: server.host,
    port: server.port,
    username: server.user,
    privateKey: privateKey.toString(),
  });

  const analysisCmd = `bash ${subtask.scriptpath1} ${subtask.scriptpath2} ${task.inputdir} ${task.outputdir} ${subtask.target} ${subtask.target_interval} ${subtask.localdir} > ${subtask.logpath} 2>&1 &`;

  const result = await ssh.execCommand(analysisCmd);
  ssh.dispose();

  if (result.stderr) throw new Error(result.stderr);
  return result.stdout;
}

const progressController = async (req, res) => {
  try {
    const { taskId, email } = req.body;
    if (fs.existsSync('/dev/shm/resources')) {
      fs.rmSync('/dev/shm/resources', { recursive: true, force: true });
    }

    const task = await db.query('SELECT * FROM RunningTasks WHERE projectid = $1', [taskId]);
    if (task.rowCount === 0) {
      return res.status(200).json({ error: 'Project not found' });
    }

    const subtasks = await db.query('SELECT * FROM SubTasks WHERE taskid = $1 and email = $2 ORDER BY subtaskid ASC', [taskId, email]);
    if (subtasks.rowCount === 0) {
      return res.status(200).json({ error: 'No subtasks found for this task' });
    }
    const isServerMode = !!subtasks.rows[0].server_host;

    let server = null;
    if (isServerMode) {
      server = {
        host: subtasks.rows[0].server_host,
        port: subtasks.rows[0].server_port,
        user: subtasks.rows[0].server_user,
        os: subtasks.rows[0].server_os,
      };
    }

    let logPath;
    const startTime = task.rows[0].starttime;
    const resources_path = path.join(os.tmpdir(), `.resources_${taskId}`);
    for (const subtask of subtasks.rows) {
      logPath = path.join(
        path.dirname(subtask.logpath),
        `${subtask.sampleid}.log`
      );
    }

    let overallProgress = 0;

    if (subtasks.rowCount > 0) {
      let completedSteps = 0;
      let totalSteps = subtasks.rowCount * progressSteps.length;

      for (const subtask of subtasks.rows) {
        const sampleLogPath = path.join(
          path.dirname(subtask.logpath),
          `${subtask.sampleid}.log`
        );
        let subtaskLogContent = '';
        try {
          if (isServerMode) {
            subtaskLogContent = await readRemoteFile(server, subtask.logpath);
          } else {
            subtaskLogContent = fs.readFileSync(subtask.logpath, 'utf8');
          }
        } catch (err) {
          console.log('error reading log file:', err, subtask.logpath);
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
          'UPDATE SubTasks SET progress = $1 WHERE subtaskid = $2 AND taskid = $3 and email = $4',
          [subtaskProgress, subtask.subtaskid, taskId, email]
        );

        if (subtaskProgress === 100) {
          completedSteps += progressSteps.length;
          await db.query(
            'UPDATE SubTasks SET status = $1 WHERE subtaskid = $2 AND taskid = $3 and email = $4',
            ['completed', subtask.subtaskid, taskId, email]
          );
        } else {
          completedSteps += subtaskCurrentStep + 1;
        }
      }

      overallProgress = Math.floor((completedSteps / totalSteps) * 100);
    }

    if (task.rows[0].progress == null || task.rows[0].progress !== overallProgress) {
      await db.query(
        'UPDATE RunningTasks SET progress = $1, status = $2 WHERE projectid = $3',
        [overallProgress, 'in progress', taskId]
      );
    }

    const allCompleted = subtasks.rows.every((subtask) => subtask.status === 'completed');
    if (allCompleted) {
      const logFiles = subtasks.rows.map((subtask) => subtask.logpath);
      logFiles.forEach((logFile) => {
        if (fs.existsSync(logFile)) {
          fs.unlinkSync(logFile);
        }
      });
      const targetFiles = subtasks.rows.map((subtask) => subtask.target);
      targetFiles.forEach((targetFile) => {
        if (fs.existsSync(targetFile)) {
          fs.unlinkSync(targetFile);
        }
      });
      const targetIntervalFiles = subtasks.rows.map((subtask) => subtask.target_interval);
      targetIntervalFiles.forEach((targetIntervalFile) => {
        if (fs.existsSync(targetIntervalFile)) {
          fs.unlinkSync(targetIntervalFile);
        }
      });
      await db.query('DELETE FROM SubTasks WHERE taskid = $1', [taskId]);
      await db.query(
        'INSERT INTO CounterTasks (projectid, projectname, analysistatus, creationtime, progress, numberofsamples, totaltime, email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          task.rows[0].projectid,
          task.rows[0].projectname,
          'done',
          task.rows[0].starttime,
          100,
          task.rows[0].numberofsamples,
          Date.now() - startTime,
          email
        ]
      );

      fs.rmSync(resources_path, { recursive: true, force: true });

      if (fs.existsSync(task.rows[0].inputdir)) {
        fs.rmSync(task.rows[0].inputdir, { recursive: true, force: true });
      }

      fs.rmSync('/dev/shm/.logs', { recursive: true, force: true });

      await db.query('DELETE FROM RunningTasks WHERE projectid = $1', [taskId]);

      return res.status(200).json({
        taskId,
        projectName: task.rows[0].projectname,
        numberOfSamples: task.rows[0].numberofsamples,
        startTime,
        progress: 100,
        status: 'done',
        eta: 'Completed',
      });
    }

    const nextSubtask = subtasks.rows.find((s) => s.status === 'pending');
    if (nextSubtask) {
      const runningSubtask = subtasks.rows.find((s) => s.status === 'running');
      if (!runningSubtask) {
        const tempDir = path.join('/dev/shm', 'resources');
        fs.mkdirSync(tempDir, { recursive: true });
        let scriptPath1, scriptPath2;
        scriptPath1 = await fetchScriptsFromAWS('resources/call_batch.sh', tempDir);
        scriptPath2 = await fetchScriptsFromAWS('resources/NeoVar.sh', tempDir);

        const args = [
          path.join(tempDir, 'call_batch.sh'),
          path.join(tempDir, 'NeoVar.sh'),
          task.rows[0].inputdir,
          task.rows[0].outputdir,
          nextSubtask.target,
          nextSubtask.target_interval,
          nextSubtask.localdir,
          nextSubtask.logpath,
        ];

        const daemonPath = 'tmp/ramfiles';
        spawn(daemonPath, args, { stdio: 'inherit', detached: true }).unref();

        if (isServerMode && nextSubtask) {
          const subtaskRes = await db.query('SELECT * FROM SubTasks WHERE subtaskid = $1 AND taskid = $2 and email = $3', [nextSubtask.subtaskid, taskId, email]);
          const subtaskToRun = subtaskRes.rows[0];
          await runRemoteAnalysisForSubtask(server, subtaskToRun, task);
        }

        await db.query(
          'UPDATE SubTasks SET status = $1 WHERE subtaskid = $2 AND taskid = $3 and email = $4',
          ['running', nextSubtask.subtaskid, taskId, email]
        );
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir, { recursive: true });
        }
      }
    }

    const elapsed = Date.now() - startTime;
    const remainingMinutes = Math.max(1, Math.ceil((60 * 60 * 1000 - elapsed) / 60000));

    return res.status(200).json({
      taskId,
      projectName: task.rows[0].projectname,
      numberOfSamples: task.rows[0].numberofsamples,
      startTime: parseInt(task.rows[0].starttime),
      progress: overallProgress,
      status: 'in progress',
      inputDir: task.rows[0].inputdir,
      outputDir: task.rows[0].outputdir,
      testtype: task.rows[0].testtype,
      eta: `${remainingMinutes} minute(s) left`,
    });
  } catch (error) {
    console.error('Progress error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = progressController;

// const express = require('express');
// const progressController = require('./progressController');
// const router = express.Router();

// router.post('/progress', progressController);

// module.exports = router;