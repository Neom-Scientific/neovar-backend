const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { NodeSSH } = require('node-ssh');
const db = require('../../db/config');

const UPLOAD_DIR = path.join(__dirname, 'upload');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const ssh = new NodeSSH();

// For storing each chunk
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const fileId = req.query.fileId;
        const chunkDir = path.join(UPLOAD_DIR, fileId, req.query.relativePath || '');
        if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });
        cb(null, chunkDir);
    },
    filename: (req, file, cb) => {
        cb(null, `chunk_${req.query.chunkIndex}`);
    }
});

const upload = multer({ storage });

let privateKey;
if (process.env.SSH_PRIVATE_KEY) {
    privateKey = Buffer.from(process.env.SSH_PRIVATE_KEY.replace(/\\n/g, '\n'));
}

async function uploadChunkToRemote({ server, localChunkPath, fileId, chunkIndex, relativePath ,projectName}) {
    const remoteDir = `${server.output_dir}/${projectName}/inputDir/${fileId}/${relativePath || ''}`;
    const remoteChunkPath = `${remoteDir}/chunk_${chunkIndex}`;

    await ssh.connect({
        host: server.host,
        username: server.user_name,
        port: server.port,
        privateKey: privateKey.toString()
    });

    await ssh.execCommand(`mkdir -p '${remoteDir}'`);
    await ssh.putFile(localChunkPath, remoteChunkPath);
    fs.unlinkSync(localChunkPath);
    ssh.dispose();
}

// app.post('/upload', upload.any(), async (req, res) => {
  const uploadController = async(req, res) => {
    const { fileId, chunkIndex, relativePath, projectName } = req.query;
    // console.log('projectName:', projectName);
    const localChunkPath = path.join(UPLOAD_DIR, fileId, relativePath || '', `chunk_${chunkIndex}`);

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

    await uploadChunkToRemote({
        server,
        localChunkPath,
        fileId,
        chunkIndex,
        relativePath,
        projectName
    });

    res.status(200).json({ message: 'Chunk uploaded to remote server', server: server.user_name });
};

module.exports = {
  uploadController,
  upload
}