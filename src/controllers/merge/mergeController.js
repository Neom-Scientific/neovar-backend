const { NodeSSH } = require("node-ssh");
const db = require("../../db/config");

let privateKey;
if (process.env.SSH_PRIVATE_KEY) {
    privateKey = Buffer.from(process.env.SSH_PRIVATE_KEY.replace(/\\n/g, '\n'));
}
// app.post('/merge', async (req, res) => {
const mergeController = async (req, res) => {
    const { fileName, fileId, totalChunks, server_user , projectName } = req.body;

    const { rows: servers } = await db.query('SELECT * FROM server_systems where user_name = $1 ORDER BY id', [server_user]);
    // const server = servers.find(s => s.output_dir.includes(fileId)); // or store selected server in frontend/local DB

    const server = servers[0];
    console.log('server', server);
    const ssh = new NodeSSH();
    await ssh.connect({
        host: server.host,
        username: server.user_name,
        port: server.port,
        privateKey: privateKey.toString()
    })

    const command = `bash /dev/shm/merge_files.sh ${fileId} ${fileName} ${totalChunks} ${projectName}`;
    const result = await ssh.execCommand(command);

    ssh.dispose();
    if (result.stderr) {
        return res.status(500).json({ error: result.stderr });
    }

    res.status(200).json({ message: 'Merge completed on remote server', inputDir: result.stdout });
};

module.exports = mergeController;