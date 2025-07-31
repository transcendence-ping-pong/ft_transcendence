
async function remoteConnection(options) {

	const server = require('http').createServer();

	const io = require('socket.io')(server, {
		cors: {
			origin: "*",
			methods: ["GET", "POST"]
		}
	});

	io.on('connection', (socket) => {
		const clientId = socket.handshake.query.clientId;
		console.log('Client connected:', clientId);

		socket.on('test', (data) => {
			console.log('Received test message:', data);
			socket.emit('test', 'xau');
		})

		socket.on('disconnect', () => {
			console.log('Client disconnected:', clientId);
		});
	});

	const os = require('os');
	const getNetworkIP = () => {
		const interfaces = os.networkInterfaces();
		for (const name of Object.keys(interfaces)) {
			for (const interface of interfaces[name]) {
				if (interface.family === 'IPv4' && !interface.internal &&
					(interface.address.startsWith('192.168.') || interface.address.startsWith('10.'))) {
					return interface.address;
				}
			}
		}
		return 'localhost';
	};
};

module.exports = remoteConnection;
