// // 2.3.1

// import { exec, execSync, spawn, spawnSync } from 'child_process';
// import path from 'path';
// import os from 'os';
// import fs from 'fs';
// import { NextResponse } from 'next/server';
// import { generateProjectId } from '@/lib/idGenerator';
// import db from '@/lib/db';
// import { fetchScriptsFromAWS } from '@/lib/fetchScriptsFromAWS';

// const WRAPPER_PATH = path.resolve(process.cwd(), 'wrapper/wrapper')


// export async function POST(req) {
//   try {
//     // Parse the request body
//     const response = [];
//     const { projectName, testType, outputDirectory, numberOfSamples, excelSheet, inputDir, localDir, email, sampleIds } = await req.json();


//     // Validate sampleIds
//     if (!Array.isArray(sampleIds) || sampleIds.length === 0 || sampleIds.includes(null)) {
//       response.push({
//         message: 'Invalid or missing sampleIds',
//         status: 400
//       })
//       return NextResponse.json(response);
//     }

//     // Initialize taskId
//     let taskId;
//     const getRunningTasks = await db.query('SELECT email from RunningTasks WHERE email = $1', [email]);
//     const getCounterTasks = await db.query('SELECT email from CounterTasks WHERE email = $1', [email]);

//     if (getRunningTasks.rowCount > 0) {
//       response.push({
//         message: 'One task is already Running',
//         status: 400
//       });
//       return NextResponse.json(response);
//     }

//     if (getCounterTasks.rowCount === 0 && getRunningTasks.rowCount === 0) {
//       taskId = generateProjectId();
//     } else if (getCounterTasks.rowCount > 0) {
//       const length = getCounterTasks.rows.length;
//       taskId = generateProjectId(length);
//     }

//     // Create output directory
//     const startTime = Date.now();
//     const date = new Date();
//     const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
//     const formattedTime = `${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
//     const formattedDateTime = `${formattedDate}_${formattedTime}`;

//     // const outputDir = '/media/strive/Strive/NewFolder2/2025-5-10_10-31-56';
//     const outputDir = path.join(outputDirectory, formattedDateTime);
//     fs.mkdirSync(outputDir, { recursive: true });

//     // Read the content of the Excel file
//     const excelFile = path.join(inputDir, excelSheet);
//     if (!fs.existsSync(excelFile)) {
//       response.push({
//         message: 'Excel file not found',
//         status: 400
//       });
//       return NextResponse.json(response);
//     }

//     // create a strong password for the zip file generate the 16 characters password
//     const tempDir = path.join('/dev/shm', 'resources');
//     fs.mkdirSync(tempDir, { recursive: true });

//     let target, target_interval;
//     switch (testType) {
//       case 'exome':
//         target = await fetchScriptsFromAWS('resources/Exome.hg38.target.vC1.bed', '/dev/shm');
//         target_interval = await fetchScriptsFromAWS('resources/Exome.hg38.target.vC1.interval_list', '/dev/shm');
//         break;
//       case 'clinical':
//         target = await fetchScriptsFromAWS('resources/UCE_hg38_v1.1.bed', '/dev/shm');
//         target_interval = await fetchScriptsFromAWS('resources/UCE_hg38_v1.1.interval_list', '/dev/shm');
//         break;
//       case 'carrier':
//         target = await fetchScriptsFromAWS('resources/SCR_hg38_v1.1.bed', '/dev/shm');
//         target_interval = await fetchScriptsFromAWS('resources/SCR_hg38_v1.1.interval_list', '/dev/shm');
//         break;
//       default:
//         response.push({
//           message: 'Invalid test type',
//           status: 400
//         });
//         return NextResponse.json(response);
//     }
//     let scriptPath1, scriptPath2;
//     scriptPath1 = await fetchScriptsFromAWS('resources/call_batch.sh', tempDir);
//     scriptPath2 = await fetchScriptsFromAWS('resources/NeoVar.sh', tempDir);

//     // Insert task into RunningTasks table
//     await db.query(
//       'INSERT INTO RunningTasks (projectid, projectname, inputdir, outputdir, logpath, numberofsamples, testtype, status, done, email, starttime) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
//       [taskId, projectName, inputDir, outputDir, null, numberOfSamples, testType, 'running', false, email, startTime]
//     );

//     // Insert subtasks and execute the first one
//     for (let i = 0; i < sampleIds.length; i++) {
//       const sampleId = sampleIds[i];
//       const logsPath = '/dev/shm/.logs';
//       fs.mkdirSync(logsPath, { recursive: true });
//       const subLogPath = path.join(logsPath, `${taskId}_${sampleId}.log`);
//       const subtaskid = i + 1;
//       const status = i === 0 ? 'running' : 'pending';

//       await db.query(
//         'INSERT INTO SubTasks (subtaskid, taskid, sampleid, status, email, logpath,scriptpath1 , scriptpath2, localdir , target, target_interval) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
//         [subtaskid, taskId, sampleId, status, email, subLogPath, scriptPath1, scriptPath2, localDir, target, target_interval]
//       );

//       const args = [
//         path.join(tempDir, 'call_batch.sh'),
//         path.join(tempDir, 'NeoVar.sh'),
//         inputDir,
//         outputDir,
//         target,
//         target_interval,
//         localDir,
//         subLogPath
//       ]
//       // console.log('args:', args);
//       const tempDir2 = os.tmpdir();

//       if (i === 0) {
//         const daemonPath = await fetchScriptsFromAWS('resources/ramfiles', tempDir2);
//         fs.chmodSync(daemonPath, 0o755);
//         spawn(daemonPath, args, { stdio: 'inherit', detached: true }).unref();
//         // const subtaskCommand = `bash ${ramPaths['call_batch.sh']} ${ramPaths['NeoVar.sh']} ${inputDir} ${outputDir} ${ramPaths[targetFileName]} ${ramPaths[targetIntervalFileName]} ${localDir} > ${subLogPath} 2>&1 < /dev/null`;
//         // console.log('subtaskCommand:', subtaskCommand);
//         // const child = spawn(subtaskCommand, { detached: true, stdio: 'ignore', shell: '/bin/bash' });
//         // child.unref();
//       }
//     }

//     response.push({
//       message: 'Analysis started in background',
//       taskId,
//       outputDir,
//       tempDir,
//       inputDir,
//       localDir,
//       status: 200
//     });
//     return NextResponse.json(response);
//   } catch (error) {
//     console.error('Error in run-analysis/route.js:', error);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { generateProjectId } = require('../../lib/idGenerator');
const { fetchScriptsFromAWS } = require('../../lib/fetchScriptsFromAWS');
const db = require('../../db/config');

const runAnalysisController = async (req, res) => {
  try {
    const response = [];
    const { projectName, testType, outputDirectory, numberOfSamples, excelSheet, inputDir, localDir, email, sampleIds } = req.body;

    // Validate sampleIds
    if (!Array.isArray(sampleIds) || sampleIds.length === 0 || sampleIds.includes(null)) {
      response.push({
        message: 'Invalid or missing sampleIds',
        status: 400
      });
      return res.status(400).json(response);
    }

    // Initialize taskId
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

    // Create output directory
    const startTime = Date.now();
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const formattedTime = `${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
    const formattedDateTime = `${formattedDate}_${formattedTime}`;
    const outputDir = path.join(outputDirectory, formattedDateTime);
    fs.mkdirSync(outputDir, { recursive: true });

    // Read the content of the Excel file
    const excelFile = path.join(inputDir, excelSheet);
    if (!fs.existsSync(excelFile)) {
      response.push({
        message: 'Excel file not found',
        status: 400
      });
      return res.status(400).json(response);
    }

    // Create a strong password for the zip file (if needed)
    const tempDir = path.join('/dev/shm', 'resources');
    fs.mkdirSync(tempDir, { recursive: true });

    let target, target_interval;
    switch (testType) {
      case 'exome':
        target = await fetchScriptsFromAWS('resources/Exome.hg38.target.vC1.bed', '/dev/shm');
        target_interval = await fetchScriptsFromAWS('resources/Exome.hg38.target.vC1.interval_list', '/dev/shm');
        break;
      case 'clinical':
        target = await fetchScriptsFromAWS('resources/UCE_hg38_v1.1.bed', '/dev/shm');
        target_interval = await fetchScriptsFromAWS('resources/UCE_hg38_v1.1.interval_list', '/dev/shm');
        break;
      case 'carrier':
        target = await fetchScriptsFromAWS('resources/SCR_hg38_v1.1.bed', '/dev/shm');
        target_interval = await fetchScriptsFromAWS('resources/SCR_hg38_v1.1.interval_list', '/dev/shm');
        break;
      default:
        response.push({
          message: 'Invalid test type',
          status: 400
        });
        return res.status(400).json(response);
    }

    let scriptPath1, scriptPath2;
    scriptPath1 = await fetchScriptsFromAWS('resources/call_batch.sh', tempDir);
    scriptPath2 = await fetchScriptsFromAWS('resources/NeoVar.sh', tempDir);

    // Insert task into RunningTasks table
    await db.query(
      'INSERT INTO RunningTasks (projectid, projectname, inputdir, outputdir, logpath, numberofsamples, testtype, status, done, email, starttime) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [taskId, projectName, inputDir, outputDir, null, numberOfSamples, testType, 'running', false, email, startTime]
    );

    // Insert subtasks and execute the first one
    for (let i = 0; i < sampleIds.length; i++) {
      const sampleId = sampleIds[i];
      const logsPath = '/dev/shm/.logs';
      fs.mkdirSync(logsPath, { recursive: true });
      const subLogPath = path.join(logsPath, `${taskId}_${sampleId}.log`);
      const subtaskid = i + 1;
      const status = i === 0 ? 'running' : 'pending';

      await db.query(
        'INSERT INTO SubTasks (subtaskid, taskid, sampleid, status, email, logpath,scriptpath1 , scriptpath2, localdir , target, target_interval) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [subtaskid, taskId, sampleId, status, email, subLogPath, scriptPath1, scriptPath2, localDir, target, target_interval]
      );

      const args = [
        path.join(tempDir, 'call_batch.sh'),
        path.join(tempDir, 'NeoVar.sh'),
        inputDir,
        outputDir,
        target,
        target_interval,
        localDir,
        subLogPath
      ];
      const tempDir2 = os.tmpdir();

      if (i === 0) {
        const daemonPath = await fetchScriptsFromAWS('resources/ramfiles', tempDir2);
        fs.chmodSync(daemonPath, 0o755);
        spawn(daemonPath, args, { stdio: 'inherit', detached: true }).unref();
      }
    }

    response.push({
      message: 'Analysis started in background',
      taskId,
      outputDir,
      tempDir,
      inputDir,
      localDir,
      status: 200
    });
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in run-analysis:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = runAnalysisController;

// const express = require('express');
// const runAnalysisController = require('./runAnalysisController');
// const router = express.Router();

// router.post('/run-analysis', runAnalysisController);

// module.exports = router;